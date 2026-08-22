# How to update Geo Studio (so changes actually show up)

The app is an offline PWA cached via sw.js. If you change files but DON'T bump the
cache number, returning visitors keep seeing the OLD page.

## Every time you update:
1. Edit your files (usually index.html).
2. Open sw.js and increase the cache number by 1 (e.g. geo-studio-v31 -> geo-studio-v32).
   Line 7:  const CACHE = 'geo-studio-vN';
3. Upload the changed files to GitHub (same filenames overwrite the old ones).
4. Wait for the green github-pages deploy (Actions tab, ~1 min).

## Verify it's live:
- Open https://emailofsalim.github.io/Geo-Studio/sw.js and confirm the new vN.
- Test in an InPrivate window (Ctrl+Shift+N) to bypass your local cache.
- Or in-app: Settings -> Check for updates (Ctrl+K -> "Check for updates").

Current cache version in this build: **geo-studio-v37**
