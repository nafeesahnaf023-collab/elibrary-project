/* ============================================================
   Athenaeum — shared chrome behaviors (navbar, theme, notifications)
   ============================================================ */

function applyTheme(){
  const t = localStorage.getItem('el_theme') || 'light';
  document.body.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.innerHTML = t === 'dark' ? ICONS.sun : ICONS.moon;
  });
}

function toggleTheme(){
  const t = localStorage.getItem('el_theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('el_theme', t);
  applyTheme();
}

function closeAllPanels(except){
  document.querySelectorAll('.dropdown-panel.open').forEach(p => { if(p !== except) p.classList.remove('open'); });
}

function renderNotifDropdown(){
  const list = document.getElementById('notifList');
  if(!list) return;
  const notifs = getNotifications();
  const iconMap = {
    approved: { bg:'rgba(47,158,107,0.14)', color:'var(--green)', icon: ICONS.check },
    rejected: { bg:'rgba(214,69,69,0.14)', color:'var(--red)', icon: ICONS.x },
    comment: { bg:'rgba(47,111,237,0.12)', color:'var(--blue)', icon: ICONS.comment },
    favorite: { bg:'rgba(232,163,61,0.15)', color:'var(--amber)', icon: ICONS.heart },
  };
  list.innerHTML = notifs.map(n => {
    const s = iconMap[n.type] || iconMap.comment;
    return `<div class="notif-item ${n.unread ? 'unread':''}">
      <div class="notif-dot-icon" style="background:${s.bg}; color:${s.color}">${s.icon}</div>
      <div><p>${esc(n.text)}</p><time>${timeAgo(n.time)}</time></div>
    </div>`;
  }).join('') || '<div style="padding:24px;text-align:center;color:var(--ink-faint);font-size:13.5px;">No notifications yet</div>';

  const unreadCount = notifs.filter(n=>n.unread).length;
  const dot = document.getElementById('notifDot');
  if(dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

function markNotifsRead(){
  const notifs = getNotifications().map(n => ({...n, unread:false}));
  saveNotifications(notifs);
}

function fillChromeIcons(){
  document.querySelectorAll('.nav-search > span:first-child').forEach(el => el.innerHTML = ICONS.search);
  document.querySelectorAll('#notifBtn > span:last-child').forEach(el => el.innerHTML = ICONS.bell);
  document.querySelectorAll('.mobile-toggle span').forEach(el => el.innerHTML = ICONS.menu);
  document.querySelectorAll('.bottom-nav a').forEach(a => { if(a.dataset.icon && ICONS[a.dataset.icon]) a.insertAdjacentHTML('afterbegin', ICONS[a.dataset.icon]); });
}

/* ---------- mobile menu extras (<=860px): notifications, dark mode, auth ---------- */
/* Builds the rows that the compact mobile header no longer shows. Every row proxies the existing
   control (notifBtn, theme toggle, auth links, logout) so behaviour stays identical to desktop. */
function buildMobileExtras(container, { closeMenu, withNavLinks }){
  if(!container || container.querySelector('.mm-extra')) return;
  const extra = document.createElement('div');
  extra.className = 'mm-extra';
  extra.innerHTML = `
    <div class="mm-nav"></div>
    <button type="button" class="mm-row" data-mm="notif"><span class="mm-ico">${ICONS.bell}</span><span>Notifications</span><span class="mm-unread"></span></button>
    <button type="button" class="mm-row" data-mm="theme" role="switch"><span class="mm-ico theme-toggle-icon"></span><span>Dark mode</span><span class="mm-switch"></span></button>
    <div class="mm-account"></div>`;
  container.appendChild(extra);

  if(withNavLinks){
    const nav = extra.querySelector('.mm-nav');
    document.querySelectorAll('.nav-links a:not(.nav-search-link)').forEach(a => {
      const c = a.cloneNode(true); c.className = 'mm-row'; nav.appendChild(c);
    });
    nav.insertAdjacentHTML('beforeend', `<a class="mm-row" href="search.html"><span class="mm-ico">${ICONS.search}</span><span>Search books</span></a>`);
  }

  // notifications: reuse the existing bell handler (opens #notifPanel, marks read)
  const notifRow = extra.querySelector('[data-mm="notif"]');
  const notifBtn = document.getElementById('notifBtn');
  if(notifBtn){
    notifRow.addEventListener('click', () => { closeMenu(); notifBtn.click(); });
  } else { notifRow.remove(); }
  const dot = document.getElementById('notifDot');
  const toggle = document.querySelector('.mobile-toggle');
  const syncUnread = () => {
    const unread = !!dot && dot.style.display !== 'none';
    notifRow.classList.toggle('has-unread', unread);
    if(toggle) toggle.classList.toggle('has-unread', unread);
  };
  if(dot){ new MutationObserver(syncUnread).observe(dot, { attributes:true, attributeFilter:['style'] }); syncUnread(); }

  // dark mode: same toggleTheme()/preference as the desktop button
  const themeRow = extra.querySelector('[data-mm="theme"]');
  const syncTheme = () => themeRow.setAttribute('aria-checked', String(document.body.getAttribute('data-theme') === 'dark'));
  themeRow.addEventListener('click', () => { toggleTheme(); syncTheme(); });
  new MutationObserver(syncTheme).observe(document.body, { attributes:true, attributeFilter:['data-theme'] });
  applyTheme(); syncTheme();

  // account area: mirrors whatever renderAuthArea() produced (logged out: Log In / Sign Up; logged in: profile links + log out)
  const account = extra.querySelector('.mm-account');
  const authArea = document.getElementById('navAuthArea');
  const renderAccount = () => {
    account.innerHTML = '';
    if(!authArea) return;
    const head = authArea.querySelector('.dropdown-head');
    if(head){
      const user = head.cloneNode(true); user.className = 'mm-user'; user.removeAttribute('style'); user.style.cssText = 'display:flex;align-items:center;gap:12px;';
      account.appendChild(user);
      const have = new Set([...document.querySelectorAll('.nav-links a')].map(a => a.getAttribute('href')));
      authArea.querySelectorAll('#avatarPanel a[href]').forEach(a => {
        if(have.has(a.getAttribute('href'))) return;
        const c = a.cloneNode(true); c.className = 'mm-row'; c.removeAttribute('style'); account.appendChild(c);
      });
      const out = document.createElement('button');
      out.type = 'button'; out.className = 'mm-row mm-danger';
      out.innerHTML = `<span class="mm-ico">${ICONS.x}</span><span>Log out</span>`;
      out.addEventListener('click', () => { const b = document.getElementById('logoutBtn'); if(b) b.click(); });
      account.appendChild(out);
    } else {
      const wrap = document.createElement('div'); wrap.className = 'mm-auth';
      authArea.querySelectorAll('a[href]').forEach(a => {
        const c = a.cloneNode(true); c.removeAttribute('style'); c.classList.remove('btn-sm'); c.classList.add('mm-btn'); wrap.appendChild(c);
      });
      account.appendChild(wrap);
    }
  };
  renderAccount();
  if(authArea) new MutationObserver(renderAccount).observe(authArea, { childList:true });
}

function initNavbar(){
  fillChromeIcons();
  applyTheme();

  document.querySelectorAll('.theme-toggle').forEach(btn => btn.addEventListener('click', toggleTheme));

  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  if(notifBtn && notifPanel){
    renderNotifDropdown();
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !notifPanel.classList.contains('open');
      closeAllPanels();
      notifPanel.classList.toggle('open', willOpen);
      if(willOpen){ markNotifsRead(); setTimeout(renderNotifDropdown, 400); }
    });
  }

  if(typeof renderAuthArea === 'function') renderAuthArea();

  document.addEventListener('click', () => closeAllPanels());

  // mobile nav toggle (drawer with proper open/close, Escape, outside click, aria)
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  // On dashboard/admin the hamburger (#sidebarToggle) opens the sidebar instead of the nav drawer.
  if(mobileToggle && navLinks && mobileToggle.id !== 'sidebarToggle'){
    if(!navLinks.querySelector('.nav-search-link')){
      navLinks.insertAdjacentHTML('beforeend', '<a class="nav-search-link" href="search.html">Search books</a>');
    }
    mobileToggle.setAttribute('aria-label', 'Open menu');
    mobileToggle.setAttribute('aria-expanded', 'false');
    const setMenu = (open) => {
      navLinks.classList.toggle('open', open);
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      const sp = mobileToggle.querySelector('span');
      if(sp) sp.innerHTML = open ? ICONS.x : ICONS.menu;
    };
    navLinks.id = navLinks.id || 'mobileMenu';
    mobileToggle.setAttribute('aria-controls', navLinks.id);
    buildMobileExtras(navLinks, { closeMenu: () => setMenu(false), withNavLinks: false });
    mobileToggle.addEventListener('click', (e) => { e.stopPropagation(); setMenu(!navLinks.classList.contains('open')); });
    navLinks.addEventListener('click', (e) => { e.stopPropagation(); if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape'){ setMenu(false); mobileToggle.focus(); } });
    window.matchMedia('(min-width: 861px)').addEventListener('change', (m) => { if(m.matches) setMenu(false); });
  }

  // sidebar toggle (dashboard / admin): backdrop, Escape, aria
  const sideToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('appSidebar');
  if(sideToggle && sidebar){
    sideToggle.setAttribute('aria-label', 'Toggle sidebar menu');
    // dashboard/admin: the hamburger opens the sidebar, so the header actions + site links are added there
    buildMobileExtras(sidebar, { closeMenu: () => sidebar.classList.remove('open'), withNavLinks: true });
    const syncSidebar = () => {
      const open = sidebar.classList.contains('open');
      sideToggle.setAttribute('aria-expanded', String(open));
      let bd = document.getElementById('sidebarBackdrop');
      if(open && !bd){
        bd = document.createElement('div'); bd.id = 'sidebarBackdrop'; bd.className = 'sidebar-backdrop';
        bd.addEventListener('click', () => { sidebar.classList.remove('open'); syncSidebar(); });
        document.body.appendChild(bd);
      } else if(!open && bd){ bd.remove(); }
    };
    new MutationObserver(syncSidebar).observe(sidebar, { attributes:true, attributeFilter:['class'] });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && sidebar.classList.contains('open')){ sidebar.classList.remove('open'); sideToggle.focus(); } });
    syncSidebar();
  }

  // accessible labels for icon-only controls
  document.querySelectorAll('.theme-toggle').forEach(b => b.setAttribute('aria-label', 'Toggle dark mode'));
  const nb = document.getElementById('notifBtn'); if(nb) nb.setAttribute('aria-label', 'Notifications');

  // nav search suggestions
  const navInput = document.getElementById('navSearchInput');
  const suggestBox = document.getElementById('navSuggest');
  if(navInput && suggestBox){
    navInput.addEventListener('input', () => {
      const q = navInput.value.trim().toLowerCase();
      if(!q){ suggestBox.classList.remove('open'); return; }
      const results = getBooks().filter(b =>
        [b.title, b.author, b.university, b.description, (catById(b.categoryId)||{}).name].some(f => String(f||'').toLowerCase().includes(q))
      ).slice(0,5);
      suggestBox.innerHTML = `<div class="sg-label">Books</div>` + (results.map(b => `
        <a class="sg-item" href="book-details.html?id=${encodeURIComponent(b.id)}">
          ${coverBoxHTML(b, { size:'xs', noHydrate:true })}
          <div><div style="font-weight:600;">${esc(b.title)}</div><div style="color:var(--ink-faint);font-size:12px;">${esc(b.author)} · ${esc(b.university)}</div></div>
        </a>`).join('') || `<div style="padding:10px;font-size:13.5px;color:var(--ink-faint);">No matches yet — press Enter to search all books</div>`);
      suggestBox.classList.add('open');
    });
    navInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ const v = navInput.value.trim(); window.location.href = 'search.html' + (v ? '?q=' + encodeURIComponent(v) : ''); }
    });
    navInput.addEventListener('click', e => e.stopPropagation());
    suggestBox.addEventListener('click', e => e.stopPropagation());
  }

  initFavButtons();
}

function initFavButtons(scope){
  (scope || document).querySelectorAll('.fav-toggle').forEach(btn => {
    if(btn.dataset.bound) return;
    btn.dataset.bound = '1';
    const id = btn.dataset.bookId;
    if(getFavorites().includes(id)) btn.classList.add('is-fav');
    btn.addEventListener('click', () => {
      if(!isLoggedIn()){ window.location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); return; }
      const book = getBookById(id);
      if(!book){ showToast('This book is no longer available'); return; }
      const isFav = toggleFavorite(id);
      btn.classList.toggle('is-fav', isFav);
      const label = btn.querySelector('.fav-label');
      if(label) label.textContent = isFav ? 'Saved to Favorites' : 'Add to Favorites';
      const me = getCurrentUser();
      if(isFav && book.ownerId && me && book.ownerId !== me.id) pushNotification(book.ownerId, { type:'favorite', text:`Your book "${book.title}" was added to a reader's favorites.` });
      showToast(isFav ? 'Added to favorites' : 'Removed from favorites');
    });
  });
}

function showToast(msg){
  let toast = document.getElementById('toastEl');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'toastEl';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

function initScrollReveal(){
  const els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){ els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
});

/* ---------- global safety nets: friendly messages, no technical details shown ---------- */
window.addEventListener('error', (e) => { if(e.target === window){ console.error(e.error || e.message); showToast('Something went wrong. Please try again.'); } });
window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); showToast('Something went wrong. Please try again.'); });
document.addEventListener('error', (e) => {           // broken image (e.g. offline) -> neutral placeholder
  const img = e.target;
  if(img && img.tagName === 'IMG' && !img.dataset.fallback){ img.dataset.fallback = '1'; img.src = defaultCover(img.alt || 'B'); }
}, true);

/* ---------- search page: collapsible filters on small screens ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('filterToggle'), panel = document.getElementById('filterPanel');
  if(!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('filters-open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Hide filters' : 'Filters';
  });
});
