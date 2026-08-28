const consentButtons = document.querySelectorAll("[data-consent-settings]");

function consentUnavailableMessage() {
  return document.documentElement.lang === "ko"
    ? "Google 동의 메시지가 적용되는 지역과 상황에서 이 설정을 사용할 수 있습니다. 광고 맞춤설정은 Google My Ad Center에서도 관리할 수 있습니다."
    : "These settings are available where Google's consent message applies. You can also manage ad personalization in Google My Ad Center.";
}

consentButtons.forEach(button => {
  button.addEventListener("click", () => {
    const googleConsent = window.googlefc;
    if (googleConsent?.callbackQueue && typeof googleConsent.showRevocationMessage === "function") {
      googleConsent.callbackQueue.push(googleConsent.showRevocationMessage);
      return;
    }

    document.querySelectorAll("[data-consent-status]").forEach(status => {
      status.textContent = consentUnavailableMessage();
      status.hidden = false;
    });
  });
});
