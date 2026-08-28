const DEFAULT_API_BASE = 'https://deadbydefault.app';

function formatMinutes(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

async function render() {
  const { totals = {}, apiBaseUrl, syncToken } = await chrome.storage.local.get(['totals', 'apiBaseUrl', 'syncToken']);
  const today = totals[todayStr()] || { youtube: 0, twitch: 0 };

  document.getElementById('youtube-time').textContent = formatMinutes(today.youtube || 0);
  document.getElementById('twitch-time').textContent = formatMinutes(today.twitch || 0);

  const status = document.getElementById('status');
  if (syncToken) {
    status.textContent = 'Connected — syncing every minute';
    status.className = 'status connected';
  } else {
    status.textContent = 'Not connected — paste your sync code below';
    status.className = 'status disconnected';
  }

  document.getElementById('api-base').value = apiBaseUrl || DEFAULT_API_BASE;
  document.getElementById('sync-token').value = syncToken || '';
}

document.getElementById('save').addEventListener('click', async () => {
  const apiBaseUrl = document.getElementById('api-base').value.trim() || DEFAULT_API_BASE;
  const syncToken = document.getElementById('sync-token').value.trim();

  await chrome.storage.local.set({ apiBaseUrl, syncToken: syncToken || null });

  const msg = document.getElementById('saved-msg');
  msg.textContent = 'Saved';
  setTimeout(() => (msg.textContent = ''), 1500);

  await render();
});

render();
