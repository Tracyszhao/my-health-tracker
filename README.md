# Track — personal health tracker (PWA)

A private, installable web app for logging calories, macros, weight, and body
measurements. Data stays on your phone (localStorage). No account, no server
required to run it.

## Files

| File | What it does |
|------|--------------|
| `index.html` | The whole app — UI, logic, persistence. Start here. |
| `manifest.json` | Makes it installable on Android (icon, name, standalone mode). |
| `sw.js` | Service worker — caches the app so it works offline. |
| `icon-192.png` / `icon-512.png` | App icons (you still need to add these — see below). |

## Run it locally

A PWA must be served over http(s), not opened as a `file://`. Easiest way:

```bash
# from inside this folder
npx serve .
# or, if you have Python:
python3 -m http.server 8080
```

Then open the printed URL. To test on your phone, use the same Wi-Fi and visit
your computer's local IP (e.g. http://192.168.1.20:8080).

## Install on Android

1. Host the folder somewhere with https — GitHub Pages is free and enough:
   create a repo, push these files, enable Pages in repo settings.
2. Open the Pages URL in Chrome on your Android phone.
3. Chrome shows an "Install app" / "Add to Home screen" prompt — tap it.
4. It now lives on your home screen, runs full-screen, and works offline.

## Still to add

- **Icons.** Generate `icon-192.png` and `icon-512.png` (a solid colour with a
  simple glyph is fine). Any icon generator or a 512px PNG works.
- **Photo → macros.** The `analyze()` function in `index.html` is a stub. Wire it
  to a tiny serverless proxy that holds your API key (see prompt below).

## Hand this to Claude Code

Paste the following as your first instruction:

> This is a single-file PWA health tracker (index.html + manifest.json + sw.js).
> Help me extend it. Tasks, in order:
>
> 1. Generate simple app icons (icon-192.png, icon-512.png) — a teal rounded
>    square with a white "T". 
> 2. Migrate storage from localStorage to IndexedDB via the `idb` library, keeping
>    the same data shape, so it scales past localStorage's size limit. Keep a
>    one-time migration that imports existing localStorage data.
> 3. Build a serverless proxy (Cloudflare Workers OR a Vercel function — ask me
>    which) that accepts a base64 image, calls the Anthropic Messages API with a
>    vision prompt, and returns JSON {name, kcal, p, c, f}. The API key lives only
>    in the Worker secret, never in the client. Then wire the `analyze()` function
>    in index.html to POST the photo to it and prefill the food form with the
>    result for me to confirm.
> 4. Before sending, downscale the photo client-side to ~512px to cut token cost.
>
> Explain each step as you go and let me review before moving on.

## The vision prompt (for the proxy)

When the proxy calls the API, the prompt should be roughly:

> "You are a nutrition estimator. Look at this food photo and return ONLY a JSON
> object with keys: name (short string), kcal, p, c, f (numbers, grams for macros).
> Estimate the portion shown. No prose, no markdown, JSON only."

Parse that JSON in the Worker and pass it back to the app.
