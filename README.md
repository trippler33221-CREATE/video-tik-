# V-Tik starter project

## Files
- `index.html` — video feed, search, create/upload modal, comments
- `style.css` — responsive dark interface
- `app.js` — demo feed interactions
- `accounts.html` / `accounts.js` — browser-only account/profile demo
- `about.html`, `privacy.html`, `terms.html` — basic information pages

## Run locally
Open `index.html` in a browser, or use VS Code Live Server.

## Deploy to Vercel
1. Keep all files in the same project folder.
2. Upload the folder to a GitHub repository, or use Vercel's static project import.
3. Deploy as a static site; no build command is needed.
4. Confirm `index.html` is in the project root.

## Important limitations
This is a front-end starter, not a complete production TikTok clone. Likes, saved IDs, comments and demo accounts are stored locally in the browser. Local video uploads are temporary and do not upload to a server or become visible to other users. Demo account passwords are not secure. Sample video URLs are external and can change or become unavailable. For real online sharing, add a backend/API, secure authentication, database, durable video object storage, moderation/reporting, and appropriate privacy/security protections. Monetization requires separate ad/payment-provider approval and compliance.
