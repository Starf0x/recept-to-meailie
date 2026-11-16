const f = ['base', 'group', 'token', 'extra'], $ = id => document.getElementById(id);
chrome.storage.sync.get({ base: '', group: 'home', token: '', tools: true, extra: '' }, v => {
  f.forEach(k => $(k).value = v[k]); $('tools').checked = v.tools;
});
const msg = (t, cls) => { $('msg').textContent = t; $('msg').className = cls || ''; };
const save = () => new Promise(r => chrome.storage.sync.set({ ...Object.fromEntries(f.map(k => [k, $(k).value.trim()])), base: $('base').value.trim().replace(/\/+$/, ''), tools: $('tools').checked }, r));
$('show').onclick = () => { const t = $('token'); t.type = t.type === 'password' ? 'text' : 'password'; $('show').textContent = t.type === 'password' ? 'Show' : 'Hide'; };
$('save').onclick = async () => { await save(); msg('Saved ✔', 'ok'); };
$('test').onclick = async () => {
  await save(); msg('Testing…');
  const r = await chrome.runtime.sendMessage({ type: 'test' });
  r.ok ? msg('Connected as ' + r.user + ' ✔', 'ok') : msg('❌ ' + r.error, 'err');
};
