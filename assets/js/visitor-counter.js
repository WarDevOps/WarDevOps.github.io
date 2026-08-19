const VISITOR_COUNTER_ENDPOINT = 'https://visitor.6developer.com/visit';
const SITE_TIMEZONE = 'Asia/Seoul';

function setCount(element, value) {
  if (!Number.isFinite(value) || value < 0) return;
  element.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en').format(value);
}
