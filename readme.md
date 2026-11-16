# Recipe to Mealie – Brave/Chromium extension (v0.0.72)

One click on the toolbar button sends the recipe on the current tab to your [Mealie](https://mealie.io) instance, including the photo, and shows a link to the new recipe.
Works on sites that block Mealie's own URL scraper (e.g. Cloudflare-protected sites), because the recipe is read in your browser.

## Install (Brave / Chrome / Edge)
1. Download the zip from the latest release and unzip it (or clone this repo).
2. Open `brave://extensions` (or `chrome://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the folder.
4. In Mealie: **Profile → API Tokens** → create a token and copy it.
5. Right-click the extension → **Options**: enter your Mealie URL, group slug and token → **Test connection** → **Save**.
6. Optional: pin the extension (puzzle icon → pin).

Usage: open a recipe page and click the button. The token is stored only in your browser (`chrome.storage.sync`), never in this repo.

## How it works (`background.js`)
Attempts, in order, until one succeeds (all errors are shown if none do):
1. schema.org `Recipe` JSON-LD from the page (also inside `@graph`), with `@context` and `url` added → `POST /api/recipes/create/html-or-json`.
2. Same JSON-LD wrapped in a minimal HTML page → same endpoint.
3. `POST /api/recipes/create/url`.
4. Full page HTML → `create/html-or-json`.

The photo is uploaded separately (html-or-json does not download it): fetched by the extension, or via the page itself if that fails → `PUT /api/recipes/{slug}/image` (multipart `image` + `extension`); last resort `POST /api/recipes/{slug}/image {url}`.
Optional: kitchen tools (baking dish, hand blender, grill pan, … Dutch and English words) are removed from the ingredient list; extra words can be added in Options.
Recipe link: `{base}/g/{group}/r/{slug}`. Auth: `Authorization: Bearer <token>`.

Files: `manifest.json` (MV3, `<all_urls>` host permission to read pages and fetch photos), `popup.*`, `options.*`, `background.js`.

## Changelog
- **0.0.72** – UI and docs in English; no personal defaults in the code.
- **0.0.61** – Fix `400 BAD_RECIPE_DATA` on miljuschka.nl (Recipe node from `@graph` lacked `@context`, `url` was not sent); multiple fallbacks. Confirmed working.
- **0.0.50** – First version.

## Notes for further development
- Versioning: +0.0.11 per release (0.0.83, 0.0.94, then 0.1.0).
- Ideas: duplicate check, choose tags/category, add kitchen tools as Mealie "tools".
