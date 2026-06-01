// app.js — UI logic. Data via window.DB.

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW:', r.scope))
      .catch(e => console.error('SW fail:', e));
  });
}

// ── State ─────────────────────────────────────────────────────
let items = [];
let currentItem = null;
let saveTimer = null;

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(localStorage.getItem('theme') === 'light');
  items = await DB.getAllRecords();
  renderGrid();
  bindEvents();
});

// ── Theme ─────────────────────────────────────────────────────
function applyTheme(isLight) {
  document.documentElement.classList.toggle('light', isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('theme-toggle').checked = isLight;
}

// ── Grid ──────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('grid');
  const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt);

  if (!sorted.length) {
    grid.innerHTML = '<p class="grid__empty">Tap + to add a note or image</p>';
    return;
  }

  grid.innerHTML = sorted.map(cardHTML).join('');

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const item = items.find(i => i.id === parseInt(card.dataset.id));
      if (!item) return;
      item.type === 'note' ? openEditor(item) : openViewer(item);
    });
  });
}

function cardHTML(item) {
  const date = new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (item.type === 'note') {
    return `<div class="card card--note" data-id="${item.id}">
      <span class="card__title">${esc(item.title || 'Untitled')}</span>
      <p class="card__preview">${esc(item.content?.trim() || '')}</p>
      <span class="card__date">${date}</span>
    </div>`;
  }

  return `<div class="card card--image" data-id="${item.id}" style="background-image:url('${item.imageData}')">
    <div class="card__overlay">
      <span class="card__title">${esc(item.imageName || 'Image')}</span>
    </div>
  </div>`;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Note Editor ───────────────────────────────────────────────
function openEditor(item) {
  currentItem = item;
  document.getElementById('editor-title').value = item.title || '';
  document.getElementById('editor-pad').value   = item.content || '';
  showScreen('editor');
}

async function openNewNote() {
  const now = Date.now();
  const draft = { type: 'note', title: '', content: '', createdAt: now, updatedAt: now };
  draft.id = await DB.saveRecord(draft);
  items.push(draft);
  openEditor(draft);
}

async function saveCurrentNote() {
  if (!currentItem || currentItem.type !== 'note') return;
  currentItem.title     = document.getElementById('editor-title').value;
  currentItem.content   = document.getElementById('editor-pad').value;
  currentItem.updatedAt = Date.now();
  await DB.saveRecord(currentItem);
}

async function closeEditor() {
  clearTimeout(saveTimer);
  await saveCurrentNote();

  if (!currentItem.title?.trim() && !currentItem.content?.trim()) {
    await DB.deleteRecord(currentItem.id);
    items = items.filter(i => i.id !== currentItem.id);
  }

  currentItem = null;
  hideScreen('editor');
  renderGrid();
}

async function deleteCurrentNote() {
  clearTimeout(saveTimer);
  await DB.deleteRecord(currentItem.id);
  items = items.filter(i => i.id !== currentItem.id);
  currentItem = null;
  hideScreen('editor');
  renderGrid();
}

// ── Image Viewer ──────────────────────────────────────────────
function openViewer(item) {
  currentItem = item;
  document.getElementById('viewer-img').src          = item.imageData;
  document.getElementById('viewer-title').value      = item.imageName || '';
  showScreen('viewer');
}

async function saveCurrentImage() {
  if (!currentItem || currentItem.type !== 'image') return;
  currentItem.imageName = document.getElementById('viewer-title').value;
  currentItem.updatedAt = Date.now();
  await DB.saveRecord(currentItem);
}

async function closeViewer() {
  clearTimeout(saveTimer);
  await saveCurrentImage();
  currentItem = null;
  hideScreen('viewer');
  renderGrid();
}

async function deleteCurrentImage() {
  clearTimeout(saveTimer);
  await DB.deleteRecord(currentItem.id);
  items = items.filter(i => i.id !== currentItem.id);
  currentItem = null;
  hideScreen('viewer');
  renderGrid();
}

// ── Image Upload ──────────────────────────────────────────────
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const now = Date.now();
    const draft = { type: 'image', imageName: file.name, imageData: e.target.result, createdAt: now, updatedAt: now };
    draft.id = await DB.saveRecord(draft);
    items.push(draft);
    renderGrid();
  };
  reader.readAsDataURL(file);
}

// ── Screen / Sheet helpers ────────────────────────────────────
function showScreen(id) { document.getElementById(id).classList.add('screen--visible'); }
function hideScreen(id) { document.getElementById(id).classList.remove('screen--visible'); }

function showSheet(id) {
  closeAllSheets();
  document.getElementById(id).classList.add('sheet--open');
  document.getElementById('backdrop').classList.add('backdrop--visible');
  document.body.classList.add('sheet-active');
}

function closeAllSheets() {
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('sheet--open'));
  document.getElementById('backdrop').classList.remove('backdrop--visible');
  document.body.classList.remove('sheet-active');
}

// ── Reset ─────────────────────────────────────────────────────
async function resetEverything() {
  indexedDB.deleteDatabase('appDB');
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  location.reload(true);
}

// ── Events ────────────────────────────────────────────────────
function bindEvents() {
  // FAB
  document.getElementById('fab-btn').addEventListener('click', () => showSheet('add-sheet'));

  // Add sheet
  document.getElementById('add-note-btn').addEventListener('click', async () => {
    closeAllSheets();
    await openNewNote();
  });
  document.getElementById('add-image-btn').addEventListener('click', () => {
    closeAllSheets();
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  });

  // Settings
  document.getElementById('settings-btn').addEventListener('click', () => showSheet('settings-sheet'));
  document.getElementById('theme-toggle').addEventListener('change', (e) => applyTheme(e.target.checked));
  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (confirm('Delete all notes and images, clear cache, unregister service worker?')) {
      await resetEverything();
    }
  });

  // Backdrop
  document.getElementById('backdrop').addEventListener('click', closeAllSheets);

  // Note editor
  document.getElementById('editor-back').addEventListener('click', closeEditor);
  document.getElementById('editor-delete').addEventListener('click', async () => {
    if (confirm('Delete this note?')) await deleteCurrentNote();
  });

  const titleEl = document.getElementById('editor-title');
  const padEl   = document.getElementById('editor-pad');
  [titleEl, padEl].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveCurrentNote, 500);
    });
  });
  padEl.addEventListener('focus', () => {
    setTimeout(() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }, 300);
  });

  // Image viewer
  document.getElementById('viewer-back').addEventListener('click', closeViewer);
  document.getElementById('viewer-delete').addEventListener('click', async () => {
    if (confirm('Delete this image?')) await deleteCurrentImage();
  });
  document.getElementById('viewer-title').addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrentImage, 500);
  });
}
