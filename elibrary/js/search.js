document.addEventListener('DOMContentLoaded', () => {
  const books = getBooks();
  const params = new URLSearchParams(window.location.search);

  const uniSelect = document.getElementById('fUniversity');
  UNIVERSITIES.forEach(u => uniSelect.insertAdjacentHTML('beforeend', `<option value="${esc(u)}">${esc(u)}</option>`));

  const authorSelect = document.getElementById('fAuthor');
  [...new Set(books.map(b=>b.author))].forEach(a => authorSelect.insertAdjacentHTML('beforeend', `<option value="${esc(a)}">${esc(a)}</option>`));

  const yearSelect = document.getElementById('fYear');
  [...new Set(books.map(b=>b.year).filter(Boolean))].sort((a,b)=>b-a).forEach(y => yearSelect.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));

  const deptWrap = document.getElementById('fDepartment');
  deptWrap.innerHTML = CATEGORIES.map(c => `<label class="check-row"><input type="checkbox" value="${esc(c.id)}" class="fDept" ${params.get('cat')===c.id ? 'checked':''}> ${deptIconHTML(c.name, 'sm')} ${esc(c.name)}</label>`).join('');

  if(params.get('q')) document.getElementById('mainSearchInput').value = params.get('q');
  if(params.get('sort') === 'trending') document.getElementById('sortSelect').value = 'downloads';

  let quickFilters = new Set();

  function currentFilters(){
    return {
      q: document.getElementById('mainSearchInput').value.trim().toLowerCase(),
      university: uniSelect.value,
      departments: [...document.querySelectorAll('.fDept:checked')].map(el=>el.value),
      semester: document.getElementById('fSemester').value,
      author: authorSelect.value,
      year: yearSelect.value,
      fileTypes: [...document.querySelectorAll('.fFileType:checked')].map(el=>el.value),
      langs: [...document.querySelectorAll('.fLang:checked')].map(el=>el.value),
      sort: document.getElementById('sortSelect').value,
    };
  }

  function applyFilters(){
    const f = currentFilters();
    const terms = f.q.split(/\s+/).filter(Boolean);
    let list = books.filter(b => {
      if(terms.length){
        const hay = [b.title, b.author, (catById(b.categoryId) || {}).name, b.department, b.description, b.university].join(' ').toLowerCase();
        if(!terms.every(t => hay.includes(t))) return false;
      }
      if(f.university && b.university !== f.university) return false;
      if(f.departments.length && !f.departments.includes(b.categoryId)) return false;
      if(f.semester && b.semester !== f.semester) return false;
      if(f.author && b.author !== f.author) return false;
      if(f.year && String(b.year) !== f.year) return false;
      if(f.fileTypes.length && !f.fileTypes.includes(b.fileType)) return false;
      if(f.langs.length && !f.langs.includes(b.language)) return false;
      if(quickFilters.has('verified') && !b.verified) return false;
      if(quickFilters.has('highrated') && parseFloat(b.rating) < 4.5) return false;
      return true;
    });

    if(f.sort === 'relevance' && terms.length){
      const score = b => terms.reduce((n, t) => n + (b.title.toLowerCase().includes(t) ? 3 : 0) + (b.author.toLowerCase().includes(t) ? 2 : 0), 0);
      list.sort((a, b) => score(b) - score(a));
    }
    if(f.sort === 'downloads') list.sort((a,b)=>b.downloads-a.downloads);
    else if(f.sort === 'rating') list.sort((a,b)=>b.rating-a.rating);
    else if(f.sort === 'newest') list.sort((a,b)=>new Date(b.uploadedOn)-new Date(a.uploadedOn));

    const grid = document.getElementById('resultsGrid');
    document.getElementById('resultsCount').textContent = `${list.length} book${list.length!==1?'s':''} found`;
    const filtered = f.university || f.departments.length || f.semester || f.author || f.year || f.fileTypes.length || f.langs.length || quickFilters.size;
    grid.innerHTML = list.length ? list.map(bookCardHTML).join('') : `<div class="empty-state" style="grid-column:1/-1;"><h4>No results found</h4><p>${terms.length ? 'Nothing matched "' + esc(f.q) + '"' + (filtered ? ' with the selected filters' : '') + '. ' : ''}Try a different keyword${filtered ? ' or clear some filters' : ''}.</p></div>`;
    initScrollReveal();
  }

  ['input','change'].forEach(evt => {
    document.getElementById('mainSearchInput').addEventListener(evt, applyFilters);
    document.querySelectorAll('.filter-panel select, .filter-panel input[type="checkbox"]').forEach(el => el.addEventListener(evt, applyFilters));
  });
  document.getElementById('sortSelect').addEventListener('change', applyFilters);

  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.quick;
      quickFilters.has(key) ? quickFilters.delete(key) : quickFilters.add(key);
      btn.classList.toggle('active');
      applyFilters();
    });
  });

  document.getElementById('clearFilters').addEventListener('click', () => {
    document.querySelectorAll('.filter-panel select').forEach(el => el.value = '');
    document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(el => el.checked = false);
    document.getElementById('mainSearchInput').value = '';
    quickFilters.clear();
    document.querySelectorAll('[data-quick]').forEach(b=>b.classList.remove('active'));
    applyFilters();
  });

  document.getElementById('trendingGrid').innerHTML = [...books].sort((a,b)=>b.views-a.views).slice(0,4).map(bookCardHTML).join('');

  applyFilters();
  initScrollReveal();
});
