import './style.css';
import { initRouter } from './router.js';

// [UI] Application entry point. Mounts the router into the #app container.
const appEl = document.getElementById('app');
initRouter(appEl);

// PWA service worker registration (silent fail — not critical)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
