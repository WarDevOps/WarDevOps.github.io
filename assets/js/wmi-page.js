const copy = {
  en: {
    title: "WMI · War Thunder Market Index | WarDevOps",
    descriptionMeta: "Meet WMI, the War Thunder Market Index by WarDevOps. An introduction to a new way to follow the War Thunder Marketplace.",
    eyebrow: "WAR THUNDER · MARKET INTELLIGENCE",
    lead: "A clearer view of the War Thunder Marketplace.",
    description: "WMI is a WarDevOps project introducing an index for following market movement beyond individual item prices.",
    explore: "EXPLORE WMI",
    displayLabel: "MARKET INDEX",
    aboutTitle: "What is WMI?",
    aboutBody: "WMI stands for War Thunder Market Index. It is a place to introduce the idea of looking at the Marketplace as a whole, so changes can be understood in context rather than one listing at a time.",
    aboutNote: "The index values and calculation method will be published here when they are ready.",
    focusTitle: "A market view built around context.",
    focusOneTitle: "Market movement",
    focusOneBody: "See how the market changes over time in one place.",
    focusTwoTitle: "Meaningful comparison",
    focusTwoBody: "Put individual price changes into a broader market picture.",
    focusThreeTitle: "Clear methodology",
    focusThreeBody: "Read the scope and calculation rules alongside the index.",
    statusTitle: "Index details are coming.",
    statusBody: "This introduction is available now. Market values and methodology are not published yet.",
    statusMark: "INTRODUCTION",
  },
  ko: {
    title: "WMI · 워썬더 마켓 인덱스 | WarDevOps",
    descriptionMeta: "WarDevOps의 워썬더 마켓 인덱스 WMI를 소개합니다. 마켓 전체의 흐름을 읽기 위한 새로운 시각입니다.",
    eyebrow: "워썬더 · 마켓 인텔리전스",
    lead: "워썬더 마켓의 흐름을 더 선명하게.",
    description: "WMI는 개별 아이템 가격을 넘어 마켓 전체의 움직임을 살펴보기 위한 WarDevOps의 인덱스 프로젝트입니다.",
    explore: "WMI 알아보기",
    displayLabel: "마켓 인덱스",
    aboutTitle: "WMI란?",
    aboutBody: "WMI는 War Thunder Market Index의 약자입니다. 아이템 하나의 가격만 보는 대신, 마켓 전체의 흐름 속에서 변화를 이해할 수 있도록 인덱스라는 관점을 소개합니다.",
    aboutNote: "지표 수치와 산출 방식은 준비되는 대로 이 페이지에 공개합니다.",
    focusTitle: "맥락까지 읽는 마켓 인덱스.",
    focusOneTitle: "마켓의 움직임",
    focusOneBody: "시간에 따른 마켓 변화를 한곳에서 살펴봅니다.",
    focusTwoTitle: "의미 있는 비교",
    focusTwoBody: "개별 가격 변화를 더 넓은 시장 흐름과 함께 봅니다.",
    focusThreeTitle: "투명한 기준",
    focusThreeBody: "인덱스의 범위와 산출 기준을 함께 확인할 수 있도록 합니다.",
    statusTitle: "인덱스 상세 정보는 준비 중입니다.",
    statusBody: "현재는 소개 페이지입니다. 실제 마켓 수치와 산출 방식은 아직 공개되지 않았습니다.",
    statusMark: "소개 페이지",
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
