const DAY_MS = 86_400_000;
export const WMI_RULES = Object.freeze({ min30dVolume: 10, maxSpreadRatio: 0.2 });

function dayNumber(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError(`Invalid date: ${date}`);
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new TypeError(`Invalid date: ${date}`);
  return value / DAY_MS;
}

function dateString(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function prepareCoupon(coupon) {
  if (!coupon || typeof coupon.id !== "string" || !coupon.id) throw new TypeError("Each coupon needs a unique id");
  const listedDay = dayNumber(coupon.listedAt);
  const history = new Map();
  for (const row of coupon.history || []) {
    const day = dayNumber(row.date);
    if (history.has(day)) throw new Error(`Duplicate daily record for ${coupon.id}: ${row.date}`);
    const volume = row.volume ?? 0;
    if (!Number.isInteger(volume) || volume < 0) throw new TypeError(`Invalid volume for ${coupon.id}: ${row.date}`);
    const price = row.avgPrice ?? null;
    if (price !== null && (!Number.isFinite(price) || price <= 0)) throw new TypeError(`Invalid price for ${coupon.id}: ${row.date}`);
    if (volume > 0 && price === null) throw new Error(`Trade volume requires an average price for ${coupon.id}: ${row.date}`);
    history.set(day, { volume, price, bestBid: row.bestBid, bestAsk: row.bestAsk });
  }
  const trades = [...history].filter(([, row]) => row.volume > 0).sort(([a], [b]) => a - b);
  return { id: coupon.id, type: coupon.type, listedDay, history, trades };
}

function carriedPrice(coupon, day) {
  for (let index = coupon.trades.length - 1; index >= 0; index--) {
    if (coupon.trades[index][0] <= day) return coupon.trades[index][1].price;
  }
  return null;
}

function eligible(coupon, asOfDay, { min30dVolume, maxSpreadRatio }) {
  if (coupon.type !== "vehicle_coupon" || asOfDay - coupon.listedDay < 30) return false;
  let volume30d = 0;
  let traded7d = false;
  for (const [day, row] of coupon.trades) {
    if (day > asOfDay) break;
    if (day > asOfDay - 30) volume30d += row.volume;
    if (day > asOfDay - 7) traded7d = true;
  }
  if (volume30d < min30dVolume || !traded7d) return false;
  const quote = coupon.history.get(asOfDay);
  const bid = quote?.bestBid;
  const ask = quote?.bestAsk;
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask < bid) return false;
  const spreadRatio = (ask - bid) / ((ask + bid) / 2);
  return spreadRatio <= maxSpreadRatio && carriedPrice(coupon, asOfDay) !== null;
}

function validateOptions(options) {
  const min30dVolume = options.min30dVolume;
  const maxSpreadRatio = options.maxSpreadRatio;
  if (!Number.isInteger(min30dVolume) || min30dVolume < 1) throw new TypeError("min30dVolume must be a positive integer");
  if (!Number.isFinite(maxSpreadRatio) || maxSpreadRatio < 0) throw new TypeError("maxSpreadRatio must be a non-negative fraction");
  return { min30dVolume, maxSpreadRatio };
}

/**
 * Calculate daily WMI and WMI-G levels from verified market snapshots.
 * coupons: [{ id, type: "vehicle_coupon", listedAt: "YYYY-MM-DD",
 *   history: [{ date, avgPrice, volume, bestBid, bestAsk }] }]
 * Dates use UTC. Quotes on the day before each monthly review are required.
 * maxSpreadRatio is (ask - bid) / midquote, expressed as a fraction.
 */
export function computeWmiIndex({ coupons, startDate, endDate, min30dVolume = WMI_RULES.min30dVolume, maxSpreadRatio = WMI_RULES.maxSpreadRatio }) {
  const config = validateOptions({ min30dVolume, maxSpreadRatio });
  const firstDay = dayNumber(startDate);
  const lastDay = dayNumber(endDate);
  if (lastDay < firstDay) throw new RangeError("endDate must be on or after startDate");
  if (!Array.isArray(coupons)) throw new TypeError("coupons must be an array");
  const prepared = coupons.map(prepareCoupon);
  if (new Set(prepared.map(coupon => coupon.id)).size !== prepared.length) throw new Error("Coupon ids must be unique");

  let members = [];
  let wmi = 100;
  let wmiG = 100;
  const points = [];
  for (let day = firstDay; day <= lastDay; day++) {
    const date = dateString(day);
    const rebalance = day === firstDay || date.endsWith("-01");
    if (rebalance) {
      members = prepared.filter(coupon => eligible(coupon, day - 1, config));
      if (!members.length) throw new Error(`No eligible vehicle coupons on ${date}`);
    }
    if (day !== firstDay) {
      const ratios = members.map(coupon => {
        const previous = carriedPrice(coupon, day - 1);
        const current = carriedPrice(coupon, day);
        if (previous === null || current === null) throw new Error(`Missing transaction price for ${coupon.id} on ${date}`);
        return current / previous;
      });
      wmi *= ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
      wmiG *= Math.exp(ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length);
    }
    points.push({ date, wmi, wmiG, constituentCount: members.length, constituents: members.map(coupon => coupon.id), rebalance });
  }
  return points;
}
