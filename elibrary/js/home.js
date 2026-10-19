document.addEventListener('DOMContentLoaded', () => {
  const books = getBooks();

  const catGrid = document.getElementById('catGrid');
  catGrid.innerHTML = CATEGORIES.map(categoryCardHTML).join('');

  /* Departments: show first 6, "View All" / "Show Less" toggle (no page navigation) */
  const CAT_VISIBLE = 6;
  const catToggleWrap = document.getElementById('catToggleWrap');
  const catToggleBtn = document.getElementById('catToggleBtn');
  const catCards = [...catGrid.querySelectorAll('.cat-card')];
  const catExtras = catCards.slice(CAT_VISIBLE);
  if(catToggleBtn && catExtras.length){
    let expanded = false;
    const apply = () => {
      catExtras.forEach(c => {
        c.classList.toggle('cat-extra-hidden', !expanded);
        c.classList.remove('cat-just-shown');
        if(expanded){ c.classList.add('in'); void c.offsetWidth; c.classList.add('cat-just-shown'); }
      });
      catToggleBtn.textContent = expanded ? 'Show Less' : 'View All';
      catToggleBtn.setAttribute('aria-expanded', String(expanded));
    };
    apply();
    catToggleWrap.hidden = false;
    catToggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      apply();
      if(!expanded){
        const sec = document.getElementById('categories');
        if(sec && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  }

  const featRating = document.getElementById('featRating');
  if(featRating && books.length) featRating.innerHTML = starRow(books[0].rating) + `<span style="color:var(--ink-faint); font-weight:500;">(${books[0].reviews} reviews)</span>`;

  const heroEyebrow = document.querySelector('.hero-eyebrow');
  if(heroEyebrow) heroEyebrow.textContent = `${books.length.toLocaleString()} ${books.length === 1 ? 'academic title' : 'academic titles'} and growing`;
  const dlChip = document.querySelector('.floating-chip.c2 .num');
  if(dlChip) dlChip.textContent = books.reduce((s, b) => s + (b.downloads || 0), 0).toLocaleString();
  const rated = books.filter(b => parseFloat(b.rating) > 0);
  const ratingChip = document.querySelector('.floating-chip.c1 .num');
  if(ratingChip && rated.length) ratingChip.textContent = (rated.reduce((s, b) => s + parseFloat(b.rating), 0) / rated.length).toFixed(1);

  const feat = [...books].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0];
  const card = document.querySelector('.featured-card');
  if(card && feat){
    const fc = card.querySelector('.featured-cover');
    fc.src = feat.cover; fc.alt = feat.title + ' cover'; fc.dataset.coverId = feat.id; fc.dataset.coverTitle = feat.title; registerCoverImg(fc);
    card.querySelector('h3').textContent = feat.title;
    card.querySelector('.meta').textContent = `${feat.author} · ${feat.university}`;
    card.querySelector('.btn-primary').href = 'book-details.html?id=' + encodeURIComponent(feat.id);
    const dl = card.querySelector('.btn-secondary');
    dl.addEventListener('click', async () => {
      if(!isLoggedIn()){ showToast('Please log in to download'); setTimeout(() => { window.location.href = 'login.html?redirect=index.html'; }, 900); return; }
      if(dl.disabled) return;
      dl.disabled = true;
      try { if(await downloadBookFile(feat)) registerDownload(feat.id); } finally { setTimeout(() => { dl.disabled = false; }, 800); }
    });
  } else if(card){ card.style.display = 'none'; }

  const byDownloads = [...books].sort((a,b) => b.downloads - a.downloads).slice(0,8);
  document.getElementById('downloadGrid').innerHTML = byDownloads.map(bookCardHTML).join('');

  const collections = {
    rated: [...books].sort((a,b) => b.rating - a.rating).slice(0,4),
    new: [...books].sort((a,b) => new Date(b.uploadedOn) - new Date(a.uploadedOn)).slice(0,4),
    editors: books.filter(b => b.verified).slice(0,4),
  };
  const collectionGrid = document.getElementById('collectionGrid');
  function renderCollection(key){ collectionGrid.innerHTML = collections[key].map(bookCardHTML).join(''); initScrollReveal(); }
  renderCollection('rated');
  document.querySelectorAll('#collectionTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#collectionTabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCollection(btn.dataset.tab);
    });
  });

  const heroForm = document.getElementById('heroSearchForm');
  heroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('heroSearchInput').value.trim();
    window.location.href = 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  initScrollReveal();
});
