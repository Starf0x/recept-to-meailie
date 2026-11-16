const f = ['base', 'group', 'token', 'extra'], $ = id => document.getElementById(id);
chrome.storage.sync.get({ base: '', group: 'home', token: '', tools: true, extra: '' }, v => {
  f.forEach(k => $(k).value = v[k]); $('tools').checked = v.tools;
});
const save = () => new Promise(r => chrome.storage.sync.set({ ...Object.fromEntries(f.map(k => [k, $(k).value.trim()])), base: $('base').value.trim().replace(/\/+$/, ''), tools: $('tools').checked }, r));
$('save').onclick = async () => { await save(); $('msg').textContent = 'Saved ✔'; };
$('test').onclick = async () => {
  await save();
  const r = await chrome.runtime.sendMessage({ type: 'test' });
  $('msg').textContent = r.ok ? 'Connected as ' + r.user + ' ✔' : '❌ ' + r.error;
};
