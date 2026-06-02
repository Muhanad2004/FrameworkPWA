# SOP — Perfect Vanilla PWA Framework
### Hosted on GitHub Pages · Installed on iOS (iPhone 15 Pro Max)
**Version:** 1.0 | **Author:** Muhanad | **Purpose:** Reusable PWA baseline for future projects

---

## 0. Philosophy & Decisions Log

This document is the single source of truth for building a production-grade PWA using zero build tooling. Every decision below was made deliberately and should be understood before being changed in future projects.

| Decision | Choice | Reason |
|---|---|---|
| Build tooling | **Vanilla HTML/CSS/JS** | PWA versions of apps are intentionally stripped-down; no bundler overhead means fastest possible first load |
| Storage engine | **IndexedDB** | Robust, async, supports large/complex data — scales to any future project |
| Caching strategy | **Cache-First** | App shell loads instantly from Service Worker cache; zero network dependency on repeat opens |
| Hosting | **GitHub Pages** | Free, HTTPS enforced (required for Service Workers), reliable CDN |
| Target platform | **iOS 15 Pro Max (Safari)** | Dictates specific PWA quirks that must be handled explicitly (listed in §4) |
| JS framework | **None** | Vanilla DOM APIs only; no framework = no versioning debt, no bundle size |
| CSS approach | **Custom Properties + BEM** | No framework dependency; design tokens via CSS variables for easy theming in future projects |

---

## 1. Project Structure

The agent must create exactly this file structure. Do not deviate.

```
/pwa-framework/
├── index.html
├── manifest.json
├── sw.js
├── /css/
│   └── app.css
├── /js/
│   └── app.js
│   └── db.js
└── /icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-apple-touch.png   ← 180×180px, required for iOS
```

**Rule:** All paths in `manifest.json`, `sw.js`, and `index.html` must use **relative paths** (e.g. `./sw.js`, not `/sw.js`). GitHub Pages serves from a subdirectory (`/repo-name/`), and absolute paths will 404.

---

## 2. `index.html` — The Shell

### Critical meta tags for iOS PWA (non-negotiable)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <!-- VIEWPORT: Prevents zoom issues on iOS. maximum-scale=1 stops double-tap zoom. -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no" />

  <!-- PWA identity -->
  <meta name="theme-color" content="#000000" />
  <meta name="description" content="App description here" />

  <!-- iOS-specific PWA tags (Safari ignores manifest for these) -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="AppName" />
  <link rel="apple-touch-icon" href="./icons/icon-apple-touch.png" />

  <!-- Manifest (Android/desktop PWA install) -->
  <link rel="manifest" href="./manifest.json" />

  <!-- Stylesheet -->
  <link rel="stylesheet" href="./css/app.css" />

  <title>AppName</title>
</head>
<body>
  <!-- App shell renders here -->
  <div id="app">
    <!-- Content injected by app.js -->
  </div>

  <!-- Register Service Worker + boot app -->
  <script src="./js/db.js" defer></script>
  <script src="./js/app.js" defer></script>
</body>
</html>
```

### Why each iOS meta tag exists

- `apple-mobile-web-app-capable` — Tells iOS to run the app in standalone mode (no Safari chrome)
- `apple-mobile-web-app-status-bar-style: black-translucent` — Status bar blends into app; use `default` if you want a white bar instead
- `apple-touch-icon` — iOS ignores `manifest.json` icons entirely; this link is the only way to set the home screen icon on iOS
- `maximum-scale=1, user-scalable=no` — Disables pinch-zoom and double-tap zoom that breaks PWA feel on iOS

---

## 3. `manifest.json`

```json
{
  "name": "App Full Name",
  "short_name": "AppName",
  "description": "What the app does",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Key rules:**
- `display: standalone` — Removes browser UI; app feels native
- `start_url: "./"` — Relative, required for GitHub Pages subdirectory hosting
- `purpose: "any maskable"` — Both flags on same icon is fine for simple projects; for production, generate a separate maskable icon using [maskable.app](https://maskable.app)
- `background_color` — Shown during splash screen before CSS loads; match your app's background exactly

---

## 4. iOS PWA Known Issues & Fixes

These are platform bugs/quirks that **must be resolved in every project**. Handle them in `app.css` and `app.js` proactively.

### 4.1 Safe Area Insets (Notch / Dynamic Island / Home Indicator)

The iPhone 15 Pro Max has a Dynamic Island at the top and a home indicator bar at the bottom. Content will be clipped without this fix.

```css
/* In app.css */
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}

body {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}
```

**Also required in `index.html` viewport meta:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```
`viewport-fit=cover` is what activates `env(safe-area-inset-*)`.

### 4.2 Scroll Bounce / Overscroll

iOS adds rubber-band scroll to the whole page, which looks wrong in a standalone app.

```css
html, body {
  overflow: hidden;       /* Lock the root; scroll only inside designated containers */
  height: 100%;
  width: 100%;
  position: fixed;        /* Prevents address-bar-triggered layout shifts */
}

#app {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;   /* Smooth momentum scroll inside the app container */
}
```

### 4.3 100vh Bug

On iOS, `100vh` includes the Safari toolbar height, causing content to be cut off. Use this instead:

```css
/* Always use this instead of 100vh */
#app {
  height: 100dvh;   /* dvh = dynamic viewport height, iOS 16+ supported */
}

/* Fallback for older iOS */
@supports not (height: 100dvh) {
  #app { height: -webkit-fill-available; }
}
```

### 4.4 Input / Keyboard Push-Up

When a `<textarea>` or `<input>` is focused, iOS pushes the viewport up and may zoom in.

```css
/* Prevent iOS zoom-on-focus: font-size must be ≥ 16px on all inputs */
textarea, input {
  font-size: 16px;   /* NEVER go below 16px or iOS will zoom in on focus */
}
```

```js
// In app.js — scroll element back into view after keyboard opens
document.querySelector('textarea').addEventListener('focus', () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  }, 300);
});
```

### 4.5 Navbar Behavior

If the project has a fixed navbar, use this pattern to prevent it from being obscured by the Dynamic Island or jumping when the keyboard opens:

```css
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* Push content below Dynamic Island */
  padding-top: env(safe-area-inset-top);
  z-index: 1000;
}

/* Offset main content so it doesn't hide under navbar */
main {
  margin-top: calc(nav-height + env(safe-area-inset-top));
}
```

---

## 5. Service Worker (`sw.js`) — Cache-First Strategy

The Service Worker is the heart of the PWA. This implementation uses **cache-first**: every request checks the cache before the network. The app shell is pre-cached on install.

```js
const CACHE_NAME = 'app-cache-v1';

// List every file the app needs to function offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-apple-touch.png'
];

// INSTALL: Pre-cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate immediately, don't wait for old SW to retire
});

// ACTIVATE: Delete old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Take control of all open tabs immediately
});

// FETCH: Cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available — never hits network
      if (cachedResponse) return cachedResponse;

      // Not in cache: fetch from network (for uncached dynamic requests)
      return fetch(event.request).then((networkResponse) => {
        // Optionally cache new responses on the fly
        return networkResponse;
      });
    })
  );
});
```

### Cache versioning rule
When you update the app's files, increment `CACHE_NAME` (e.g. `app-cache-v2`). This triggers the activate event to purge the old cache and serve fresh files.

---

## 6. IndexedDB Layer (`db.js`)

This module is the data layer. It is completely decoupled from the UI. All other JS files call these functions; they never touch IndexedDB directly.

```js
// db.js — IndexedDB wrapper, exported as window.DB

const DB_NAME = 'appDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';  // Rename per project

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        // keyPath: 'id' — every record needs a unique id field
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveRecord(data) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data);  // put = insert or update if id exists
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecord(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecords() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteRecord(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Expose to global scope so app.js can use it
window.DB = { saveRecord, getRecord, getAllRecords, deleteRecord };
```

---

## 7. App Logic (`app.js`)

```js
// app.js — UI logic only. All data operations go through window.DB

// 1. Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW failed:', err));
  });
}

// 2. Boot the app
document.addEventListener('DOMContentLoaded', async () => {
  // Render the app shell
  document.getElementById('app').innerHTML = `
    <main class="pad-container">
      <textarea 
        id="writing-pad" 
        placeholder="Start writing…"
        spellcheck="true"
        autocorrect="on"
        autocapitalize="sentences"
      ></textarea>
    </main>
  `;

  const pad = document.getElementById('writing-pad');

  // 3. Load saved content from IndexedDB
  const saved = await DB.getRecord(1); // Record id=1 is the single notepad entry
  if (saved) pad.value = saved.content;

  // 4. Save on input with debounce (don't write to DB on every keystroke)
  let saveTimer;
  pad.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await DB.saveRecord({ id: 1, content: pad.value });
    }, 500); // Saves 500ms after the user stops typing
  });

  // 5. iOS keyboard scroll fix
  pad.addEventListener('focus', () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 300);
  });
});
```

---

## 8. CSS Architecture (`app.css`)

```css
/* =====================
   1. RESET & ROOT
   ===================== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Design tokens — override these per project */
  --color-bg: #0a0a0a;
  --color-surface: #141414;
  --color-text: #f0f0f0;
  --color-accent: #ffffff;
  --color-muted: #555;
  --font-main: system-ui, sans-serif;
  --radius: 12px;

  /* Safe area tokens */
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}

/* =====================
   2. BODY & SCROLL LOCK
   ===================== */
html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: fixed;         /* iOS scroll lock */
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-main);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100dvh;          /* Dynamic viewport height */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}

/* Fallback for older iOS */
@supports not (height: 100dvh) {
  #app { height: -webkit-fill-available; }
}

/* =====================
   3. WRITING PAD
   ===================== */
.pad-container {
  height: 100%;
  padding: 20px;
}

#writing-pad {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--color-text);
  font-family: var(--font-main);
  font-size: 16px;          /* NEVER below 16px — prevents iOS auto-zoom */
  line-height: 1.7;
  caret-color: var(--color-accent);
}

#writing-pad::placeholder {
  color: var(--color-muted);
}

/* =====================
   4. UTILITY
   ===================== */
/* Tap highlight removal (iOS default blue flash on tap) */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Prevent text selection on UI elements */
nav, button, label {
  -webkit-user-select: none;
  user-select: none;
}
```

---

## 9. GitHub Pages Deployment

### Step-by-step

1. Create a new GitHub repository (public)
2. Push all project files to the `main` branch, maintaining the file structure from §1
3. Go to **Settings → Pages → Source → Deploy from branch → main / root**
4. GitHub Pages will assign a URL: `https://username.github.io/repo-name/`
5. Wait ~60 seconds for first deploy; subsequent pushes auto-deploy

### Critical: relative paths check

Before deploying, verify these three files use `./` relative paths:
- `manifest.json` → `"start_url": "./"`, `"scope": "./"`
- `sw.js` → all assets in `ASSETS_TO_CACHE` start with `./`
- `index.html` → all `<link>`, `<script>`, `<meta>` hrefs start with `./`

### Testing HTTPS locally (before pushing)

Service Workers require HTTPS. To test locally before GitHub Pages:

```bash
# Option 1: Python simple server (HTTP only, SW won't register — just for visual check)
python3 -m http.server 8080

# Option 2: Use VS Code Live Server extension with HTTPS enabled
# Option 3: ngrok tunnel (gives you a real HTTPS URL for local files)
```

---

## 10. iOS Installation Checklist

Once deployed to GitHub Pages, install on iPhone 15 Pro Max:

1. Open the GitHub Pages URL in **Safari** (not Chrome — Chrome on iOS cannot install PWAs)
2. Tap the **Share** button (box with arrow)
3. Scroll down → **Add to Home Screen**
4. Name it and tap **Add**
5. Find the app on your home screen and open it

### Verify these after installation

- [ ] App opens in standalone mode (no Safari URL bar)
- [ ] Status bar is visible and not covering content (safe area inset working)
- [ ] Home indicator at bottom is not covered by content
- [ ] Tapping the textarea doesn't zoom in (font-size ≥ 16px)
- [ ] Typing and closing app — content restored on reopen (IndexedDB working)
- [ ] Open app in Airplane Mode — app loads fully (cache-first SW working)
- [ ] App icon on home screen looks correct (apple-touch-icon working)

---

## 11. Updating the App

When you push new code to GitHub Pages:

1. **Increment** `CACHE_NAME` in `sw.js` (e.g. `app-cache-v1` → `app-cache-v2`)
2. **Update** `ASSETS_TO_CACHE` if you added new files
3. Push to GitHub
4. On iPhone: open the app, wait ~5 seconds in foreground, close fully, reopen — new SW activates

> iOS is aggressive about caching PWAs. If updates don't appear, go to Settings → Safari → Clear History and Website Data, then reinstall the PWA.

---

## 12. Reusing This as a Framework

When starting a new PWA project from this template:

| File | What to change |
|---|---|
| `manifest.json` | `name`, `short_name`, `description`, `theme_color`, `background_color` |
| `index.html` | `<title>`, `apple-mobile-web-app-title`, app shell HTML inside `#app` |
| `app.css` | CSS custom properties in `:root` (colors, fonts, radius) |
| `db.js` | `STORE_NAME`, add new object stores for additional data types |
| `app.js` | Replace writing pad logic with new app logic; keep SW registration and iOS fixes |
| `sw.js` | Update `CACHE_NAME`, update `ASSETS_TO_CACHE` list |
| Icons | Replace all three icon files, keep same filenames |

**Do not change:** The iOS meta tags, safe area CSS, scroll lock pattern, `position: fixed` on body, `font-size: 16px` on inputs, or the Service Worker install/activate/fetch event structure. These are load-bearing.

---

*End of SOP — v1.0*
