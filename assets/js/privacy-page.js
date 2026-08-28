const COPY = Object.freeze({
  en: Object.freeze({
    pageTitle: "Privacy Policy | WarDevOps MapTactic",
    metaDescription: "Learn how WarDevOps MapTactic uses local browser storage, advertising cookies, and third-party services.",
    backHome: "Back to MapTactic",
    backHomeAria: "Back to WarDevOps MapTactic",
    languageSwitch: "Language selection",
    lightTheme: "LIGHT",
    darkTheme: "DARK",
    switchToLightTheme: "Switch to light theme",
    switchToDarkTheme: "Switch to dark theme",
    footerPrivacy: "Privacy Policy",
    footerSettings: "Privacy & cookie settings",
    skipLink: "Skip to privacy policy",
    copyright: "© 2026 WarDevOps & 부릉부릉. All Rights Reserved."
  }),
  ko: Object.freeze({
    pageTitle: "개인정보 처리방침 | WarDevOps MapTactic",
    metaDescription: "WarDevOps MapTactic의 브라우저 저장소, 광고 쿠키 및 외부 서비스 사용 방식을 안내합니다.",
    backHome: "MapTactic으로 돌아가기",
    backHomeAria: "WarDevOps MapTactic으로 돌아가기",
    languageSwitch: "언어 선택",
    lightTheme: "LIGHT",
    darkTheme: "DARK",
    switchToLightTheme: "화이트 테마로 전환",
    switchToDarkTheme: "다크 테마로 전환",
    footerPrivacy: "개인정보 처리방침",
    footerSettings: "개인정보 및 쿠키 설정",
    skipLink: "개인정보 처리방침 본문으로 건너뛰기",
    copyright: "© 2026 WarDevOps & 부릉부릉. All Rights Reserved."
  })
});

const languageButtons = document.querySelectorAll(".language-button");
const languagePanels = document.querySelectorAll("[data-language-panel]");
const themeToggle = document.querySelector("#theme-toggle");
let language = navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
let theme = "dark";

function applyCopy() {
  const copy = COPY[language];
  document.title = copy.pageTitle;
  document.querySelector('meta[name="description"]').content = copy.metaDescription;
  document.querySelector('meta[property="og:title"]').content = copy.pageTitle;
  document.querySelector('meta[property="og:description"]').content = copy.metaDescription;
  document.querySelectorAll("[data-copy]").forEach(element => {
    element.textContent = copy[element.dataset.copy];
  });
  document.querySelectorAll("[data-copy-aria]").forEach(element => {
    element.setAttribute("aria-label", copy[element.dataset.copyAria]);
  });
}

function setTheme(nextTheme) {
  theme = nextTheme;
  const isLight = theme === "light";
  const copy = COPY[language];
  document.body.classList.toggle("light-theme", isLight);
  document.documentElement.style.colorScheme = isLight ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]').content = isLight ? "#edf2ed" : "#111719";
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.textContent = copy[isLight ? "darkTheme" : "lightTheme"];
  themeToggle.setAttribute("aria-label", copy[isLight ? "switchToDarkTheme" : "switchToLightTheme"]);
}

function setLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language;
  languageButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  languagePanels.forEach(panel => {
    panel.hidden = panel.dataset.languagePanel !== language;
  });
  document.querySelectorAll("[data-consent-status]").forEach(status => {
    status.hidden = true;
    status.textContent = "";
  });
  applyCopy();
  setTheme(theme);
}

languageButtons.forEach(button => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});
themeToggle.addEventListener("click", () => setTheme(theme === "dark" ? "light" : "dark"));

setLanguage(language);
