# First Light

Your first screen of the day. It's a calm, time-of-day-adaptive home page that turns "open laptop → YouTube" into a 2-minute start on your learning.

- No backend, no account, no cost. Plain HTML/CSS/JS. Data is stored in your browser (localStorage).
- Export a backup from Settings every week.

## Run it locally (no install)
Double-click `index.html`, or for the app/offline features:
```
cd first-light
python -m http.server 8080      # or: npx serve .
```
Then open http://localhost:8080

## Host it free on GitHub Pages
1. Create a new public repo on github.com, e.g. `first-light`.
2. Upload every file in this folder (drag and drop on the repo page → Commit).
3. Repo → Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / root → Save.
4. After about a minute your app is at `https://<your-username>.github.io/first-light/`

## Make it your first screen
1. Chrome → `chrome://settings/onStartup` → "Open a specific page or set of pages" → add your URL.
2. Install "New Tab Redirect" and set your URL as the new tab page.
3. Chrome menu → Cast, save, and share → Install page as app.
4. Win+R → `shell:startup` → drag the First Light app shortcut into that folder.
5. Install LeechBlock NG: block youtube.com + netflix.com in your peak window, allow 20 min/hour, redirect blocked pages to your First Light URL.
6. Install Unhook to hide YouTube recommendations.

## Keyboard
S = start 2 minutes · D = I drifted · Esc = back to Now
