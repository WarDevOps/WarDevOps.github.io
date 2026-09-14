import assert from "node:assert/strict";
import test from "node:test";
import { computeWmiIndex, WMI_RULES } from "../assets/js/wmi-index.js";

const options = WMI_RULES;

function coupon(id, { type = "vehicle_coupon", listedAt = "2026-07-01", tradeDate = "2026-08-29", price = 100, volume = 10, bid = 99, ask = 101, extra = [] } = {}) {
  return {
    id, type, listedAt,
    history: [
      { date: tradeDate, avgPrice: price, volume, bestBid: bid, bestAsk: ask },
      ...extra,
    ],
  };
}

test("99 flat coupons and one tenfold gain produce 109 and approximately 102.33", () => {
  const coupons = Array.from({ length: 99 }, (_, index) => coupon(`flat-${index}`));
  coupons.push(coupon("rare", { extra: [{ date: "2026-08-31", avgPrice: 1000, volume: 1 }] }));
  const points = computeWmiIndex({ coupons, startDate: "2026-08-30", endDate: "2026-08-31", ...options });
  assert.equal(points[0].wmi, 100);
  assert.equal(points[0].wmiG, 100);
  assert.ok(Math.abs(points[1].wmi - 109) < 1e-10);
  assert.ok(Math.abs(points[1].wmiG - 100 * 10 ** (1 / 100)) < 1e-10);
});

test("a day without trades carries the last completed transaction price", () => {
  const points = computeWmiIndex({ coupons: [coupon("a")], startDate: "2026-08-30", endDate: "2026-08-31", ...options });
  assert.equal(points[1].wmi, 100);
  assert.equal(points[1].wmiG, 100);
});

test("newly eligible coupons enter at the next monthly review without a level jump", () => {
  const established = coupon("established", { extra: [
    { date: "2026-08-31", avgPrice: 110, volume: 1, bestBid: 109, bestAsk: 111 },
    { date: "2026-09-01", avgPrice: 121, volume: 1 },
  ] });
  const newcomer = coupon("newcomer", { listedAt: "2026-08-01", price: 200, extra: [
    { date: "2026-08-31", avgPrice: 200, volume: 1, bestBid: 199, bestAsk: 201 },
    { date: "2026-09-01", avgPrice: 220, volume: 1 },
  ] });
  const points = computeWmiIndex({ coupons: [established, newcomer], startDate: "2026-08-30", endDate: "2026-09-01", ...options });
  assert.deepEqual(points[1].constituents, ["established"]);
  assert.deepEqual(points[2].constituents, ["established", "newcomer"]);
  assert.equal(points[2].rebalance, true);
  assert.ok(Math.abs(points[2].wmi - 121) < 1e-10);
});

test("universe filters age, volume, recency, category, and midquote spread", () => {
  const coupons = [
    coupon("included", { tradeDate: "2026-08-31" }),
    coupon("young", { listedAt: "2026-08-15", tradeDate: "2026-08-31" }),
    coupon("thin", { tradeDate: "2026-08-31", volume: 1 }),
    coupon("stale", { tradeDate: "2026-08-20", extra: [{ date: "2026-08-31", volume: 0, bestBid: 99, bestAsk: 101 }] }),
    coupon("wide", { tradeDate: "2026-08-31", bid: 80, ask: 120 }),
    coupon("camo", { type: "camouflage_coupon", tradeDate: "2026-08-31" }),
  ];
  const points = computeWmiIndex({ coupons, startDate: "2026-09-01", endDate: "2026-09-01", ...options });
  assert.deepEqual(points[0].constituents, ["included"]);
});

test("exactly ten trades and a twenty-percent spread pass the inclusive limits", () => {
  const atLimit = coupon("at-limit", { tradeDate: "2026-08-31", bid: 90, ask: 110, volume: 10 });
  const belowVolume = coupon("below-volume", { tradeDate: "2026-08-31", bid: 90, ask: 110, volume: 9 });
  const aboveSpread = coupon("above-spread", { tradeDate: "2026-08-31", bid: 89, ask: 111, volume: 10 });
  const points = computeWmiIndex({ coupons: [atLimit, belowVolume, aboveSpread], startDate: "2026-09-01", endDate: "2026-09-01" });
  assert.deepEqual(points[0].constituents, ["at-limit"]);
});

test("invalid cutoffs and an empty eligible universe fail instead of publishing a false index", () => {
  assert.throws(() => computeWmiIndex({ coupons: [], startDate: "2026-09-01", endDate: "2026-09-01", min30dVolume: 0 }), /min30dVolume/);
  assert.throws(() => computeWmiIndex({ coupons: [], startDate: "2026-09-01", endDate: "2026-09-01", ...options }), /No eligible/);
});
