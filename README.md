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

## What's fixed in v2
- Clicks work everywhere again. The app put a `data-view` tag on the whole page, so every click was treated as "switch page" and cancelled. That broke picking a lead track, all radio buttons, the Import button, "Open my work", past-review toggles, and typing in the Learning cards.
- Weekly review now saves (it used to reload the page and lose what you wrote). Saving again in the same week updates it.
- Learning cards: typing and tabbing between fields keeps your cursor; numbers are kept in range; bad links are rejected with a message.
- A reserve can only be used once per day per track, and "reserves left" never goes negative.
- Minutes are counted when you press Done, not when you finish typing the log.
- Backups: import cleans up missing or broken fields; export no longer includes internal data.
- Esc closes pop-ups first instead of jumping pages; the browser back button works.
- Updates now reach you: the offline cache checks the network first. If you had the old version installed, reload the page twice once.

## What's new in v3
- After you press "Log it", that track's card is cleared for the rest of the day and its old step is removed. The "next tiny step" box is now optional and starts empty; type one and it becomes tomorrow's card.
- When every active track is logged, Now shows "Logged for today" with a "Start another 2 minutes" button.
- Auto theme now also follows your system dark-mode setting.
- Now footer shows reserves left. Sunday-evening nudge to do the weekly review. Module start dates (Settings) trigger the fresh-page banner.
- Earned watch time has a real countdown in the Refresh card.
- Service worker no longer fails to install if one icon file is missing. Added icon.svg, icon-192.png, icon-512.png.
