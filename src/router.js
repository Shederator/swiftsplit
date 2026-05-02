/* ═══════════════════════════════════════════════════════════════
   HisabX — Hash Router
   ═══════════════════════════════════════════════════════════════ */

const routes = {};
let currentCleanup = null;
let lastRoute = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getParams() {
  const hash = window.location.hash.slice(1) || '/';
  const params = {};
  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');
    if (patternParts.length !== hashParts.length) continue;
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = hashParts[i];
      } else if (patternParts[i] !== hashParts[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler: routes[pattern], params };
    Object.keys(params).forEach(k => delete params[k]);
  }
  return { handler: routes['/'] || null, params: {} };
}

function resolveRoute() {
  const app = document.getElementById('app');
  if (!app) return;
  
  const { handler, params } = getParams();
  if (!handler) return;

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const currentHash = window.location.hash.slice(1) || '/';
  const isSameRoute = lastRoute === currentHash;
  const isBack = lastRoute && (currentHash === '/' || currentHash.split('/').length < (lastRoute.split('/').length));
  lastRoute = currentHash;

  const pageContainer = app.querySelector('.page-container') || app;
  
  pageContainer.innerHTML = '';
  const pageEl = document.createElement('div');
  
  if (isSameRoute) {
    pageEl.className = 'page';
  } else {
    const animClass = isBack ? 'page-enter-back' : 'page-enter';
    pageEl.className = `page ${animClass}`;
    setTimeout(() => {
      pageEl.classList.remove(animClass);
    }, 400);
  }
  
  pageContainer.appendChild(pageEl);
  
  const cleanup = handler(pageEl, params);
  if (typeof cleanup === 'function') currentCleanup = cleanup;
}

export function startRouter() {
  window.addEventListener('hashchange', resolveRoute);
  if (!window.location.hash) window.location.hash = '#/';
  resolveRoute();
}
