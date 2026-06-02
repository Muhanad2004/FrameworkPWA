<div align="center">

# Vanilla PWA Framework

**A production-grade, zero-build Progressive Web App baseline.**  
Fork it. Swap the app logic. Ship a native-feeling iOS app in minutes.

[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-222?logo=github)](https://muhanad2004.github.io/FrameworkPWA/)
[![Platform](https://img.shields.io/badge/Target-iOS%20Safari-black?logo=apple)](https://muhanad2004.github.io/FrameworkPWA/)
[![No Build Tools](https://img.shields.io/badge/Build%20Tools-None-brightgreen)](https://muhanad2004.github.io/FrameworkPWA/)
[![Offline Ready](https://img.shields.io/badge/Offline-Cache--First%20SW-blue)](https://muhanad2004.github.io/FrameworkPWA/)

</div>

---

## What This Is

A reusable PWA framework and decision guideline — not just sample code. Every architectural choice below was made deliberately, battle-tested against iOS Safari quirks, and documented so you don't rediscover these lessons from scratch.

Ships with a working **notes + images app** to prove the framework end-to-end. When starting a new project: fork this, replace `app.js` with your logic, keep everything else. The iOS fixes, service worker, CSS architecture, and data layer apply to any app.

Full written SOP with code samples: [PWA_SOP.md](./PWA_SOP.md)

---

## File Structure

```
/
├── index.html                  ← App shell + all critical iOS meta tags
├── manifest.json               ← PWA identity for Android/desktop install
├── sw.js                       ← Service Worker: cache-first strategy
│
├── css/
│   └── app.css                 ← Design tokens, iOS scroll fix, all components
│
├── js/
│   ├── db.js                   ← IndexedDB wrapper exposed as window.DB
│   └── app.js                  ← UI logic — calls window.DB, never touches IDB directly
│
└── icons/
    ├── icon-192.png            ← Android / desktop PWA icon
    ├── icon-512.png            ← Large format, splash screen
    └── icon-apple-touch.png    ← 180×180px — iOS home screen icon (Safari ignores manifest icons)
```

---

## Core Decisions

### No Build Tooling
Vanilla HTML + CSS + JS. No webpack, Vite, or bundler of any kind.

PWA versions of apps are intentionally lean. A bundler adds complexity, versioning debt, and a build step that gains nothing for a small-to-medium app. Zero dependencies to rot. Every line is directly readable.

---

### IndexedDB for Storage
`db.js` wraps IndexedDB and exposes a clean API as `window.DB`.

`localStorage` is synchronous and capped at ~5 MB. IndexedDB is async, supports blobs and images, and scales to any data shape. The wrapper keeps app logic completely decoupled from the storage engine.

```js
DB.saveRecord(data)     // insert or update (upsert by id)
DB.getRecord(id)        // fetch single record
DB.getAllRecords()       // fetch everything
DB.deleteRecord(id)     // remove by id
```

App code never touches IndexedDB directly — always through `window.DB`.

---

### Cache-First Service Worker
`sw.js` pre-caches the entire app shell on install. Every subsequent open loads from cache — zero network dependency. Works in Airplane Mode. This is what makes a PWA feel native.

| SW Event | Behavior |
|---|---|
| `install` | Pre-caches every file in `ASSETS_TO_CACHE` |
| `activate` | Deletes all caches not matching current `CACHE_NAME` |
| `fetch` | Returns cache hit immediately; network only for uncached requests |

**Versioning rule:** Increment `CACHE_NAME` on every deploy (`app-cache-v1` → `app-cache-v2`). This purges the old cache and forces clients to get fresh files.

---

### GitHub Pages Hosting
Free, HTTPS enforced (required for Service Workers), CDN-backed, deploys on every push to main.

> **Critical:** GitHub Pages serves from a subdirectory (`/repo-name/`). Every path in `manifest.json`, `sw.js`, and `index.html` must use relative paths (`./`) — absolute paths (`/`) will 404.

---

### No JS Framework
Vanilla DOM APIs only. No React, Vue, or Svelte.

No framework versioning debt, no bundle size, no abstraction layer to debug. The DOM is fast enough. You can read every line of this codebase without knowing any framework.

---

### CSS Custom Properties + BEM
Design tokens via CSS variables. Theming = changing `:root` values. Adding light/dark mode is just overriding variables on `html.light` — no JS logic needed.

```css
:root {
  --color-bg:      #0a0a0a;
  --color-surface: #1a1a1a;
  --color-text:    #f0f0f0;
  --color-accent:  #ffffff;
  --radius:        14px;
  --font-main:     system-ui, -apple-system, sans-serif;
}
```

---

## iOS Safari Quirks (All Pre-Fixed)

These are real platform bugs that hit every iOS PWA. Already solved in this framework — do not remove them.

### Required Meta Tags

Safari ignores `manifest.json` for most PWA behavior. These are the actual hooks:

```html
<!-- Standalone mode — no Safari chrome -->
<meta name="apple-mobile-web-app-capable" content="yes" />

<!-- Status bar blends into app background -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- Home screen label -->
<meta name="apple-mobile-web-app-title" content="AppName" />

<!-- Home screen icon — Safari ignores manifest icons entirely -->
<link rel="apple-touch-icon" href="./icons/icon-apple-touch.png" />

<!-- viewport-fit=cover activates safe-area-inset-* CSS env vars -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```

---

### Safe Area Insets (Dynamic Island + Home Indicator)

Without this, content clips under the Dynamic Island at top and the home indicator at bottom.

```css
:root {
  --safe-top:    env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left:   env(safe-area-inset-left);
  --safe-right:  env(safe-area-inset-right);
}
```

Used everywhere content touches an edge: topbar height, grid padding, FAB position, screen padding.

---

### Scroll Lock + Overscroll Bounce

iOS rubber-band scrolls the root document, which looks wrong in a standalone app.

```css
html, body {
  overflow: hidden;
  position: fixed;    /* also prevents layout shifts when keyboard opens */
  height: 100%;
  width: 100%;
}

#app {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* momentum scroll inside the app */
}
```

---

### `100dvh` Instead of `100vh`

`100vh` on iOS includes the Safari toolbar, causing overflow. Always use:

```css
#app { height: 100dvh; }

@supports not (height: 100dvh) {
  #app { height: -webkit-fill-available; }  /* iOS 15 fallback */
}
```

---

### Input Font Size ≥ 16px

iOS auto-zooms any input with `font-size < 16px`. Breaks the native feel entirely.

```css
input, textarea { font-size: 16px; }  /* never go below this */
```

---

### Keyboard Scroll Fix

When a textarea is focused, iOS pushes the viewport up and doesn't restore it.

```js
padEl.addEventListener('focus', () => {
  setTimeout(() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }, 300);
});
```

---

### Tap Highlight

iOS flashes a blue rect on any tap. One line fixes it:

```css
* { -webkit-tap-highlight-color: transparent; }
```

---

## Demo App Features

The framework ships with a working app to exercise every part of the stack.

| Feature | Framework concept demonstrated |
|---|---|
| 2-column grid, sorted by date | IndexedDB `getAllRecords()`, vanilla DOM rendering |
| Note editor (full-screen slide-in) | CSS `translateX` screen transitions, debounced autosave |
| Auto-delete empty notes on close | Business logic layered on top of `window.DB` |
| Image upload + full-screen viewer | `FileReader` → base64 → IndexedDB blob storage |
| Bottom sheets with backdrop | `translateY` animation, scroll lock during open |
| Light / dark theme toggle | CSS variable swap on `html.light`, `localStorage` persistence |
| Settings + full reset | Wipes IndexedDB, Cache Storage, and unregisters SW |

---

## How to Use This as a Framework

Fork the repo. Then make only these changes:

| File | What to change |
|---|---|
| `manifest.json` | `name`, `short_name`, `description`, `theme_color`, `background_color` |
| `index.html` | `<title>`, `apple-mobile-web-app-title`, HTML inside `#app` |
| `css/app.css` | `:root` design tokens — colors, fonts, radius |
| `js/db.js` | `STORE_NAME`, add new object stores if needed |
| `js/app.js` | Replace demo logic with your app; keep SW registration + iOS keyboard fix |
| `sw.js` | Reset `CACHE_NAME` to `app-cache-v1`, update `ASSETS_TO_CACHE` |
| `icons/` | Replace all three images, keep the same filenames |

> **Leave untouched:** iOS meta tags · safe area CSS · `position: fixed` on body · `100dvh` pattern · `font-size: 16px` on inputs · SW install/activate/fetch structure. These are all fixing real platform bugs.

---

## Deploy to GitHub Pages

```bash
git clone https://github.com/your-username/FrameworkPWA.git my-app
cd my-app
# make your changes
git add . && git commit -m "feat: my app"
git push
```

Then: **GitHub repo → Settings → Pages → Deploy from branch → main / root**

URL: `https://your-username.github.io/my-app/`

---

## Install on iPhone

1. Open the GitHub Pages URL in **Safari** — Chrome on iOS cannot install PWAs
2. Tap the **Share** button → **Add to Home Screen**
3. Name it → **Add**

### Verify After Install

- [ ] App opens without Safari URL bar (standalone mode)
- [ ] Status bar not clipping content (safe area insets working)
- [ ] Home indicator not covered by content
- [ ] Tapping inputs doesn't zoom (font-size ≥ 16px)
- [ ] Data survives close + reopen (IndexedDB working)
- [ ] App loads in Airplane Mode (cache-first SW working)
- [ ] Home screen icon looks correct (apple-touch-icon working)

---

## Pushing Updates

1. Increment `CACHE_NAME` in `sw.js`
2. Add new files to `ASSETS_TO_CACHE` if needed
3. Push to GitHub
4. On iPhone: open app → wait ~5 sec → close fully → reopen

> Updates not showing? **Settings → Safari → Clear History and Website Data** → reinstall.

---

<div align="center">

Built and documented by [Muhanad2004](https://github.com/Muhanad2004)

</div>
