// Recipe to Mealie – service worker
const TOOLS = ['ovenschaal', 'staafmixer', 'grillpan', 'keukenmachine', 'blender', 'bakpapier', 'aluminiumfolie',
  'vershoudfolie', 'springvorm', 'cakevorm', 'taartvorm', 'muffinvorm', 'bakblik', 'bakplaat', 'ovenrooster',
  'koekenpan', 'braadpan', 'wokpan', 'hapjespan', 'soeppan', 'steelpan', 'vergiet', 'zeef', 'rasp', 'mandoline',
  'garde', 'mixer', 'handmixer', 'spatel', 'deegroller', 'prikkers', 'satéprikkers', 'cocktailprikkers', 'vijzel',
  'snijplank', 'pollepel', 'keukenpapier', 'spuitzak', 'ijsmachine', 'airfryer', 'slowcooker', 'baking dish', 'oven dish', 'hand blender', 'immersion blender', 'grill pan', 'food processor', 'baking paper', 'parchment paper', 'baking sheet', 'skewers', 'frying pan', 'whisk', 'pan', 'kom', 'kommen', 'mengkom'];

const cfg = () => chrome.storage.sync.get({ base: '', group: 'home', token: '', tools: true, extra: '' });

async function api(c, path, opts = {}) {
  const r = await fetch(c.base + '/api' + path, { ...opts, headers: { Authorization: 'Bearer ' + c.token, ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...opts.headers } });
  const t = await r.text();
  if (!r.ok) throw new Error(`Mealie ${r.status}: ${t.slice(0, 200)}`);
  try { return JSON.parse(t); } catch { return t; }
}

// Runs in the page: finds the schema.org Recipe JSON-LD
function pageExtract() {
  const isRecipe = o => o && [].concat(o['@type'] || []).some(t => String(t).toLowerCase() === 'recipe');
  const find = o => {
    if (!o || typeof o !== 'object') return null;
    if (Array.isArray(o)) { for (const x of o) { const r = find(x); if (r) return r; } return null; }
    if (isRecipe(o)) return o;
    return find(o['@graph']) || find(o.mainEntity) || null;
  };
  let recipe = null;
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { recipe = find(JSON.parse(s.textContent)); } catch { }
    if (recipe) break;
  }
  const og = document.querySelector('meta[property="og:image"]')?.content || null;
  return { recipe, og, html: document.documentElement.outerHTML };
}

// Runs in the page: fetches the image with the site's own cookies/session
async function pageFetchImage(url) {
  const b = await (await fetch(url)).blob();
  return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
}

function imageUrl(img) {
  if (!img) return null;
  if (Array.isArray(img)) return imageUrl(img[0]);
  if (typeof img === 'object') return img.url || img.contentUrl || null;
  return img;
}

function filterTools(recipe, c) {
  const words = TOOLS.concat(c.extra.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  const re = new RegExp('(^|[^a-zà-ÿ])(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(en|s)?($|[^a-zà-ÿ])', 'i');
  if (Array.isArray(recipe.recipeIngredient)) recipe.recipeIngredient = recipe.recipeIngredient.filter(i => !re.test(String(i)));
}

async function uploadImage(c, slug, url, tabId) {
  let blob;
  try { const r = await fetch(url); if (!r.ok) throw 0; blob = await r.blob(); }
  catch {
    try {
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: pageFetchImage, args: [url] });
      blob = await (await fetch(result)).blob();
    } catch { }
  }
  if (blob && blob.size) {
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split('+')[0];
    const fd = new FormData(); fd.append('image', blob, 'image.' + ext); fd.append('extension', ext);
    await api(c, `/recipes/${slug}/image`, { method: 'PUT', body: fd });
  } else {
    await api(c, `/recipes/${slug}/image`, { method: 'POST', body: JSON.stringify({ url }) });
  }
}

async function doImport(tabId, pageUrl) {
  const c = await cfg();
  if (!c.token) throw new Error('No API token set. Open the options page.');
  const [{ result: p }] = await chrome.scripting.executeScript({ target: { tabId }, func: pageExtract });
  let slug, via, imageWarn;
  const errors = [];
  const create = async (label, path, body) => {
    if (slug) return;
    try { slug = await api(c, path, { method: 'POST', body: JSON.stringify({ ...body, url: pageUrl, includeTags: true }) }); via = label; }
    catch (e) { errors.push(label + ': ' + e.message); }
  };
  if (p.recipe) {
    if (c.tools) filterTools(p.recipe, c);
    p.recipe['@context'] = p.recipe['@context'] || 'https://schema.org';
    p.recipe.url = p.recipe.url || pageUrl;
    const json = JSON.stringify(p.recipe).replace(/<\//g, '<\\/');
    await create('JSON-LD', '/recipes/create/html-or-json', { data: json });
    // Mealie sometimes wants a full HTML page instead of bare JSON
    await create('JSON-LD (html)', '/recipes/create/html-or-json', { data: `<!DOCTYPE html><html><head><script type="application/ld+json">${json}</script></head><body></body></html>` });
  }
  await create('URL', '/recipes/create/url', {});
  await create('HTML', '/recipes/create/html-or-json', { data: p.html });
  if (!slug) throw new Error(errors.join(' | '));
  if (via !== 'URL') {
    const img = imageUrl(p.recipe?.image) || p.og;
    if (img) { try { await uploadImage(c, slug, new URL(img, pageUrl).href, tabId); } catch (e) { imageWarn = e.message; } }
  }
  return { ok: true, via, imageWarn, link: `${c.base}/g/${c.group}/r/${slug}` };
}

chrome.runtime.onMessage.addListener((m, _s, send) => {
  const run = m.type === 'import' ? doImport(m.tabId, m.url)
    : cfg().then(c => api(c, '/users/self')).then(u => ({ ok: true, user: u.fullName || u.username }));
  run.then(send, e => send({ ok: false, error: e.message }));
  return true;
});
