// Minimal hash-based SPA router.
// Each route maps a hash string to a lazy-loaded screen module.
// The screen module must export render(container) → cleanupFn.

const routes = {
  '':         () => import('./screens/home.js'),
  '#build':    () => import('./screens/build.js'),
  '#simulate': () => import('./screens/simulate.js'),
  '#results':  () => import('./screens/results.js'),
};

let currentCleanup = null;

// [UI] Resolves the current URL hash to a screen module and renders it.
// Calls the previous screen's cleanup function first.
async function navigate(container) {
  const hash = location.hash || '';
  const loader = routes[hash] ?? routes[''];

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  try {
    const module = await loader();
    currentCleanup = module.render(container) ?? null;
  } catch (err) {
    console.error('[router] Failed to load screen:', hash, err);
    container.innerHTML = `<div class="error-screen">Failed to load screen. <a href="#">Home</a></div>`;
  }
}

// [UI] Initialises the router and starts listening for hash changes.
export function initRouter(container) {
  window.addEventListener('hashchange', () => navigate(container));
  navigate(container);
}
