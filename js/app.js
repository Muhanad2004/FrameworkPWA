// app.js — UI logic only. Data ops via window.DB

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
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

  const saved = await DB.getRecord(1);
  if (saved) pad.value = saved.content;

  let saveTimer;
  pad.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await DB.saveRecord({ id: 1, content: pad.value });
    }, 500);
  });

  pad.addEventListener('focus', () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 300);
  });
});
