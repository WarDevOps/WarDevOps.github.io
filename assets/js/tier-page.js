import { initDiscordMemberCount } from "./discord-stats.js";

const copy = {
  en: {
    copyright: "© 2026 WarDevOps & 부릉부릉. All Rights Reserved.",
    copyrightNotice: "All content on this website, including text, images, graphics, and other materials, is the property of the site owner. Unauthorized reproduction, distribution, or use is prohibited.",
    lightTheme: "LIGHT",
    darkTheme: "DARK",
    switchToLightTheme: "Switch to light theme",
    switchToDarkTheme: "Switch to dark theme",
  },
  ko: {
    copyright: "© 2026 WarDevOps & 부릉부릉. 모든 권리 보유.",
    copyrightNotice: "이 웹사이트의 텍스트, 이미지, 그래픽 및 기타 모든 콘텐츠는 사이트 소유자의 자산입니다. 무단 복제, 배포 및 사용을 금합니다.",
    lightTheme: "라이트",
    darkTheme: "다크",
    switchToLightTheme: "라이트 모드로 전환",
    switchToDarkTheme: "다크 모드로 전환",
  },
};

const languageButtons = [...document.querySelectorAll(".language-button")];
const themeToggle = document.querySelector("#theme-toggle");
let language = navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";

function applyLanguage(nextLanguage) {
  language = nextLanguage === "ko" ? "ko" : "en";
  document.documentElement.lang = language;
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  document.querySelectorAll("[data-page-i18n]").forEach((element) => {
    element.textContent = copy[language][element.dataset.pageI18n] ?? element.textContent;
  });
  updateThemeCopy();
  window.dispatchEvent(new CustomEvent("maptactic:languagechange", { detail: { language } }));
}

function toggleTheme() {
  document.body.classList.toggle("light-theme");
  localStorage.setItem("maptactic-theme", document.body.classList.contains("light-theme") ? "light" : "dark");
  updateThemeCopy();
}

function updateThemeCopy() {
  const isLight = document.body.classList.contains("light-theme");
  themeToggle.textContent = copy[language][isLight ? "darkTheme" : "lightTheme"];
  themeToggle.setAttribute("aria-label", copy[language][isLight ? "switchToDarkTheme" : "switchToLightTheme"]);
  themeToggle.setAttribute("aria-pressed", String(isLight));
}

if (localStorage.getItem("maptactic-theme") === "light") document.body.classList.add("light-theme");
languageButtons.forEach((button) => button.addEventListener("click", () => applyLanguage(button.dataset.language)));
themeToggle.addEventListener("click", toggleTheme);
applyLanguage(language);
initDiscordMemberCount();
