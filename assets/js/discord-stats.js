const DISCORD_SERVER_STATS_ENDPOINT = 'https://sena-role-bot.ninajalhe9.workers.dev/api/server-stats';
const MEMBER_CAPACITY = 256;

function setMemberCount(element, value) {
  if (!Number.isFinite(value) || value < 0) return;
  const count = new Intl.NumberFormat(document.documentElement.lang || 'en').format(value);
  element.textContent = `${count} / ${MEMBER_CAPACITY}`;
}

export async function initDiscordMemberCount() {
  const memberCount = document.querySelector('#discord-member-count');
  if (!memberCount) return;

  try {
    const response = await fetch(DISCORD_SERVER_STATS_ENDPOINT);
    if (!response.ok) throw new Error(`Discord stats request failed: ${response.status}`);
    const data = await response.json();
    setMemberCount(memberCount, data.human);
  } catch (error) {
    // Keep the neutral placeholder if the public stats endpoint is unavailable.
  }
}
