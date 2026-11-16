const s = document.getElementById('s');
document.getElementById('o').onclick = () => chrome.runtime.openOptionsPage();
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const r = await chrome.runtime.sendMessage({ type: 'import', tabId: tab.id, url: tab.url });
  if (r.ok) s.innerHTML = `✅ Imported${r.via ? ' (' + r.via + ')' : ''}${r.imageWarn ? '<br><small>Photo failed: ' + r.imageWarn + '</small>' : ''}<br><a href="${r.link}" target="_blank">Open recipe in Mealie</a>`;
  else { s.className = 'err'; s.textContent = '❌ ' + r.error; }
})();
