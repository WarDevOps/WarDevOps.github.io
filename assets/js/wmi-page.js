const copy = {
  en: {
    title: "WMI · War Thunder Market Index | WarDevOps",
    descriptionMeta: "WMI tracks eligible War Thunder vehicle coupons using daily average transaction prices, liquidity filters, and a chain-linked equal-weight index.",
    eyebrow: "WAR THUNDER · MARKET INTELLIGENCE",
    lead: "An index of liquid vehicle coupons.",
    description: "WMI follows the daily average transaction prices of eligible War Thunder vehicle coupons with chain-linked, equal-weight returns.",
    explore: "EXPLORE WMI",
    displayLabel: "MARKET INDEX",
    aboutTitle: "What is WMI?",
    aboutBody: "WMI stands for War Thunder Market Index. It tracks eligible vehicle coupons as an equal-weight index, rather than treating one item's asking price as the market.",
    aboutNote: "This page documents the calculation method. Live index values are not published yet.",
    focusTitle: "Only vehicle coupons with usable liquidity.",
    focusOneTitle: "Vehicle coupons only",
    focusOneBody: "A coupon must have been listed for at least 30 days.",
    focusTwoTitle: "Recent trades",
    focusTwoBody: "At least 10 completed trades in the last 30 days, including one in the last 7 days.",
    focusThreeTitle: "Reasonable spread",
    focusThreeBody: "The bid–ask spread must be no more than 20% of the midquote.",
    thresholdNote: "The spread uses the current bid and ask snapshot at the monthly review. Missing or invalid quotes are excluded.",
    methodTitle: "Transaction prices. Chain-linked returns.",
    priceTitle: "Daily price",
    priceBody: "Use the day's average completed transaction price, not the lowest ask. On a day without trades, carry forward the last transaction price.",
    priceSource: "Source: War Thunder Wiki · Price history ↗",
    priceFormula: "daily average transaction price",
    chainTitle: "Equal-weight chain",
    chainBody: "Average each included coupon's daily price ratio, then multiply the previous index value. Start the base date at 100.",
    rebalanceNote: "Constituents are reviewed on the first UTC calendar day of each month using the previous day's data. A new coupon can enter then after 30 days and the liquidity checks. Returns apply equal weights daily; the monthly review changes membership.",
    geometricTitle: "Geometric companion",
    geometricBody: "WMI-G uses the geometric mean of the same daily price ratios. It gives a very large rise in one rare coupon less influence than the arithmetic index.",
    exampleTitle: "Example · 99 coupons unchanged, one coupon rises 10×",
    geometricNote: "With an unchanged universe, WMI-G also equals 100 × exp[the average log price change from the base date]. Daily chaining keeps the series continuous when constituents change.",
    statusTitle: "Method and rules published. Data pending.",
    statusBody: "The calculation is implemented. Verified daily market history and bid–ask snapshots are needed before publishing live index levels.",
    statusMark: "METHODOLOGY",
  },
  ko: {
    title: "WMI · 워썬더 마켓 인덱스 | WarDevOps",
    descriptionMeta: "WMI는 거래 유동성이 있는 워썬더 차량 쿠폰을 일별 평균 체결가격과 동일비중 체인 방식으로 계산하는 지수입니다.",
    eyebrow: "워썬더 · 마켓 인텔리전스",
    lead: "유동성 있는 차량 쿠폰의 시장 지수.",
    description: "WMI는 편입 요건을 충족한 워썬더 차량 쿠폰의 일별 평균 체결가격을 동일비중 체인 방식으로 추적합니다.",
    explore: "WMI 알아보기",
    displayLabel: "마켓 인덱스",
    aboutTitle: "WMI란?",
    aboutBody: "WMI는 War Thunder Market Index의 약자입니다. 한 상품의 최저 매도호가를 시장 전체의 움직임으로 오인하지 않도록, 편입 요건을 충족한 차량 쿠폰의 동일비중 지수를 계산합니다.",
    aboutNote: "이 페이지에 산출 방식을 공개했습니다. 실제 지수 수치는 아직 제공하지 않습니다.",
    focusTitle: "차량 쿠폰 중 유동성을 갖춘 상품만.",
    focusOneTitle: "차량 쿠폰 한정",
    focusOneBody: "상장 후 30일 이상 지난 쿠폰만 편입 후보가 됩니다.",
    focusTwoTitle: "최근 거래 확인",
    focusTwoBody: "최근 30일 체결 10건 이상이며, 최근 7일 안에도 최소 1건 거래되어야 합니다.",
    focusThreeTitle: "과도한 호가 차이 제외",
    focusThreeBody: "매수·매도 호가 차이가 중간호가 대비 20% 이하여야 합니다.",
    thresholdNote: "월간 검토 시점의 매수·매도 호가를 사용하며, 호가가 없거나 유효하지 않으면 편입하지 않습니다.",
    methodTitle: "체결가격을 쓰는 체인 방식.",
    priceTitle: "일별 가격",
    priceBody: "현재 최저 매도호가 대신 해당 일의 평균 체결가격을 사용합니다. 거래가 없는 날은 마지막 체결가격을 유지합니다.",
    priceSource: "출처: 워썬더 공식 위키 · 가격 이력 ↗",
    priceFormula: "일별 평균 체결가격",
    chainTitle: "동일비중 체인",
    chainBody: "편입 차량의 일별 가격비율을 산술평균하고 전일 지수에 곱합니다. 기준일은 100입니다.",
    rebalanceNote: "구성 종목은 매월 1일 UTC에 전날 데이터를 기준으로 검토합니다. 신규 차량은 상장 30일이 지나고 유동성 조건을 충족하면 그때 편입할 수 있습니다. 수익률에는 매일 동일비중을 적용하고, 월간 검토에서는 구성 종목을 갱신합니다.",
    geometricTitle: "기하평균 보조 지수",
    geometricBody: "WMI-G는 같은 일별 가격비율의 기하평균을 사용합니다. 희귀 차량 한 종목의 급등이 산술평균 지수를 크게 좌우하는 현상을 줄여줍니다.",
    exampleTitle: "예시 · 99개 차량은 그대로, 1개 차량만 10배 상승",
    geometricNote: "구성 종목이 고정되면 WMI-G는 기준일 대비 로그 가격변화의 평균을 지수화한 값과 같습니다. 구성 종목이 바뀌어도 일별 체인 계산으로 지수의 연속성을 유지합니다.",
    statusTitle: "산출 방식과 기준 공개 · 데이터 연결 대기",
    statusBody: "계산 방식은 구현했습니다. 실제 지수를 공개하려면 검증된 일별 마켓 거래 이력과 매수·매도 호가 자료가 필요합니다.",
    statusMark: "산출 방식",
  },
};

function applyLanguage(language) {
  const selected = copy[language] || copy.en;
  document.title = selected.title;
  document.querySelector('meta[name="description"]').content = selected.descriptionMeta;
  document.querySelectorAll("[data-wmi-text]").forEach((element) => {
    element.textContent = selected[element.dataset.wmiText];
  });
}

window.addEventListener("maptactic:languagechange", (event) => applyLanguage(event.detail.language));
applyLanguage(document.documentElement.lang);
