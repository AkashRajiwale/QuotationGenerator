# Ak's Quotation Maker

A simple, free, no-sign-up quotation/estimate generator that runs entirely in your browser. Built after the "Laxmi Garden Developments" estimate sample — fill in your business details once, add line items, and print or save a clean PDF.

**No backend, no build step, no accounts.** Everything (business info, logo, past quotations) is saved locally in your browser via `localStorage`, so it also works fully offline once the page has loaded.

## Features

- Your business details (name, address, phone, email, GSTIN, logo, signature) are remembered on your device
- Add/remove unlimited line items with automatic amount, subtotal and total calculation
- Optional discount %, tax/GST %, HSN/SAC column
- Automatic "Amount in Words" (Indian Rupees, Lakh/Crore system)
- Live preview that matches exactly what gets printed
- One-click **Print / Save as PDF** using your browser's built-in print dialog
- Auto-saves your work as you type (never lose a draft)
- "My Quotations" history — reopen, duplicate, or delete past quotations
- Works on phone, tablet or desktop

## Using it locally

Just open `index.html` in a browser — no installation needed. Or serve it locally:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial quotation maker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to your repository's **Settings → Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save. Your site will be published at `https://<your-username>.github.io/<your-repo>/` within a minute or two.

No further configuration is required — the whole app is static HTML/CSS/JS.

## Notes on data & privacy

All data (business profile, saved quotations, uploaded logo/signature images) is stored only in your browser's `localStorage` on your own device — nothing is sent to any server. Clearing your browser data for the site will remove it. Use the **Print / Save PDF** button regularly to keep permanent copies of quotations you care about.

## Project structure

```
index.html      Page structure / form + preview markup
css/style.css   Styling, responsive layout, print stylesheet
js/app.js       All app logic (state, calculations, save/load, PDF print)
```
