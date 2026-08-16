const VISITOR_COUNTER_ENDPOINT = 'https://visitor.6developer.com/visit';
const SITE_TIMEZONE = 'Asia/Seoul';

function setCount(element, value) {
  if (!Number.isFinite(value) || value < 0) return;
  element.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en').format(value);
}

export async function initVisitorCounter() {
  const today = document.querySelector('#visitor-count-today');
  const total = document.querySelector('#visitor-count-total');
  if (!today || !total) return;

  try {
    const response = await fetch(VISITOR_COUNTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: window.location.hostname,
        timezone: SITE_TIMEZONE
      })
    });
    if (!response.ok) throw new Error(`Visitor counter request failed: ${response.status}`);
    const data = await response.json();
    setCount(today, data.todayCount);
    setCount(total, data.totalCount);
  } catch (error) {
    // Keep the neutral placeholder when the third-party counter is unavailable.
  }
}
