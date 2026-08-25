/* ============================================
   GUARDIAN SA — shared UI behaviour
   ============================================ */

/* ---------- toast / pop-up notifications ---------- */

const TOAST_ICONS = {
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

function ensureToastRegion() {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

/**
 * showToast('error' | 'success' | 'info', 'Title', 'Message', durationMs)
 * This is the "appropriate pop-up" used for login errors, save confirmations, etc.
 */
function showToast(type, title, message, duration = 5000) {
  const region = ensureToastRegion();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${TOAST_ICONS[type] || TOAST_ICONS.info}
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  region.appendChild(toast);
  if (duration) setTimeout(() => toast.remove(), duration);
}

/* ---------- global error handling (never kill the session) ---------- */
/* Any uncaught error or promise rejection is caught here and shown as a
   friendly toast instead of a blank crashed page. Navigation and the
   rest of the UI stay usable. */

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error || event.message);
  showToast(
    'error',
    'Something went wrong',
    'That last action hit a snag, but the rest of Guardian SA is still working — feel free to keep navigating.'
  );
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showToast(
    'error',
    'Something went wrong',
    'A background task failed to complete. You can safely continue using the app.'
  );
});

/* ---------- mobile nav toggle ---------- */

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ---------- skeleton loaders ----------
   Usage: wrap real content in [data-skeleton-target], show a matching
   .skeleton block, then call revealContent('#target-id') once data is ready. */

function revealContent(targetSelector, { skeletonSelector, delay = 350 } = {}) {
  const skeletons = skeletonSelector
    ? document.querySelectorAll(skeletonSelector)
    : document.querySelectorAll('[data-skeleton]');
  const target = document.querySelector(targetSelector);
  setTimeout(() => {
    skeletons.forEach(el => el.style.display = 'none');
    if (target) {
      target.hidden = false;
      target.style.opacity = '0';
      requestAnimationFrame(() => {
        target.style.transition = 'opacity 0.25s ease';
        target.style.opacity = '1';
      });
    }
  }, delay);
}

/* ---------- lazy loading (images + reveal-on-scroll sections) ---------- */

function initLazyLoading() {
  // Native lazy-loading for tagged images is set via loading="lazy" in HTML.
  // This adds a scroll-reveal effect for sections marked [data-lazy].
  const items = document.querySelectorAll('[data-lazy]');
  if (!('IntersectionObserver' in window) || items.length === 0) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => observer.observe(el));
}

/* ---------- shared header/footer injection ---------- */

const LOGO_SVG = `
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 2 L28 7 V15 C28 22.5 22.8 27.8 16 30 C9.2 27.8 4 22.5 4 15 V7 Z" fill="#0F766E"/>
  <path d="M16 2 L28 7 V15 C28 22.5 22.8 27.8 16 30 V2 Z" fill="#14B8A6"/>
  <path d="M16 9 L16 18 M16 22 L16.01 22" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

function buildNav(activePage, isAuthed) {
  const guestLinks = `
    <li><a href="index.html#features">Features</a></li>
    <li><a href="about.html" class="${activePage === 'about' ? 'active' : ''}">About</a></li>
    <li><a href="plans.html" class="${activePage === 'plans' ? 'active' : ''}">Plans</a></li>
  `;
  const authLinks = `
    <li><a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
    <li><a href="contacts.html" class="${activePage === 'contacts' ? 'active' : ''}">Contacts</a></li>
    <li><a href="history.html" class="${activePage === 'history' ? 'active' : ''}">History</a></li>
    <li><a href="plans.html" class="${activePage === 'plans' ? 'active' : ''}">Plans</a></li>
    <li><a href="account.html" class="${activePage === 'account' ? 'active' : ''}">Account</a></li>
  `;
  const actions = isAuthed
    ? `<button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>`
    : `<a href="login.html" class="btn btn-ghost btn-sm">Log in</a><a href="signup.html" class="btn btn-primary btn-sm">Get started</a>`;

  return `
    <nav class="nav">
      <div class="nav-inner">
        <a href="index.html" class="brand">${LOGO_SVG}<span>Guardian SA</span></a>
        <ul class="nav-links">${isAuthed ? authLinks : guestLinks}</ul>
        <div class="nav-actions">
          ${actions}
          <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </nav>
  `;
}

function buildFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        Guardian SA — hackathon demo project. All data is simulated and stored locally in your browser.
      </div>
    </footer>
  `;
}

function mountNavAndFooter(activePage) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const navMount = document.getElementById('nav-mount');
  const footerMount = document.getElementById('footer-mount');
  if (navMount) navMount.outerHTML = buildNav(activePage, !!user);
  if (footerMount) footerMount.outerHTML = buildFooter();
  initNavToggle();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      showToast('info', 'Logged out', 'You have been signed out of Guardian SA.');
      setTimeout(() => window.location.href = 'index.html', 600);
    });
  }
}

document.addEventListener('DOMContentLoaded', initLazyLoading);
