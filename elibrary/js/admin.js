/* Athenaeum — Admin panel. Every action goes through BookService / CommentService / AuthService,
   which re-check admin permission (a real backend must do the same on the server). */
document.addEventListener('DOMContentLoaded', () => {
  const sideIcons = { overview: ICONS.dashboard, pending: ICONS.clock, approved: ICONS.check, rejected: ICONS.x, users: ICONS.users, comments: ICONS.comment, categories: ICONS.grid, universities: ICONS.university, departments: ICONS.layers, settings: ICONS.settings };
  document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(link => { const sp = link.querySelector('span'); if(sp) sp.innerHTML = sideIcons[link.dataset.tab] || ''; });
  const main = document.getElementById('appMain');

  function lock(title, text, actions){
    main.innerHTML = `<div class="login-prompt"><div class="icon">${ICONS.settings}</div>
      <h2 style="font-size:22px; margin-bottom:10px;">${title}</h2>
      <p style="color:var(--ink-soft); font-size:14.5px; line-height:1.6; margin-bottom:22px;">${text}</p>
      <div style="display:flex; gap:12px; justify-content:center;">${actions}</div></div>`;
    document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(l => { l.style.opacity = '0.5'; l.style.pointerEvents = 'none'; });
  }
  if(!isLoggedIn()) return lock('Log in to access the admin panel', 'Admin tools are only available to signed-in administrators.',
    '<a class="btn btn-primary" href="login.html?redirect=admin.html">Log In</a>');
  if(!isAdmin()) return lock('Admins only', 'Your account does not have permission to open the admin panel.', '<a class="btn btn-primary" href="index.html">Back to home</a>');

  /* ---------- helpers ---------- */
  const cap = t => t ? t[0].toUpperCase() + t.slice(1) : '';
  const say = r => { if(!r.ok) showToast(r.error); return r.ok; };
  function rowsFor(status){
    if(status === 'approved') return getBooks().map(b => bookRowFromBook(b, 'approved'));
    return getPendingAdmin().filter(p => p.status === status);
  }
  function statCard(label, value, icon, color){
    return `<div class="stat-card">
      <div class="top"><div class="stat-icon" style="background:color-mix(in srgb, ${color} 16%, transparent); color:${color};">${icon}</div></div>
      <div class="value">${value}</div><div class="label">${label}</div></div>`;
  }
  function tableToolbar(prefix, status){
    const depts = [...new Set(rowsFor(status).map(p => p.department).filter(Boolean))];
    return `<div class="table-toolbar">
      <input type="text" id="${prefix}Search" placeholder="Search by book or student name...">
      <select id="${prefix}Dept"><option value="">All departments</option>${depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select>
    </div>`;
  }
  function bookTable(rows){
    if(!rows.length) return `<div class="empty-state"><h4>Nothing here</h4><p>Books will show up here once they match this status.</p></div>`;
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Book</th><th>Student</th><th>Department</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows.map(r => `<tr data-id="${esc(r.id)}">
        <td><div class="row-book" data-info="${esc(r.id)}" style="cursor:pointer;">${coverBoxHTML(r, { size:'sm' })}<div><div class="t">${esc(r.title)}</div><div class="s">${esc(r.university)}${r.flagged ? ' · Flagged for review' : ''}</div></div></div></td>
        <td>${r.avatar ? `<div style="display:flex; align-items:center; gap:8px;"><img src="${esc(r.avatar)}" alt="" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">${esc(r.student)}</div>` : esc(r.student)}</td>
        <td>${esc(r.department)}</td>
        <td>${esc(r.date)}</td>
        <td><span class="badge badge-${esc(r.status)}">${cap(r.status)}</span></td>
        <td><div class="table-actions">
          <button title="Preview" data-preview="${esc(r.id)}">${ICONS.eye}</button>
          <button title="Download" data-download="${esc(r.id)}">${ICONS.download}</button>
          ${r.status !== 'approved' ? `<button class="approve" title="Approve" data-approve="${esc(r.id)}">${ICONS.check}</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="reject" title="${r.status === 'approved' ? 'Unpublish' : 'Reject'}" data-reject="${esc(r.id)}">${ICONS.x}</button>` : ''}
          <button title="Delete" data-delete="${esc(r.id)}">${ICONS.trash}</button>
        </div></td></tr>`).join('')}</tbody></table></div>`;
  }
  function statusPage(status, title, sub){
    return `<div class="page-head"><div><h2>${title}</h2><div class="sub">${sub}</div></div></div>
      <div class="panel">${tableToolbar(status, status)}<div id="${status}TableWrap">${bookTable(rowsFor(status))}</div></div>`;
  }
  const simpleTable = (head, rows) => `<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  const rowBtns = (edit, del, extra) => `<div class="table-actions">${extra || ''}${edit ? `<button title="Edit" ${edit}>${ICONS.edit}</button>` : ''}${del ? `<button title="Delete" class="reject" ${del}>${ICONS.trash}</button>` : ''}</div>`;

  /* ---------- sections ---------- */
  const sections = {
    overview(){
      const books = getBooks(), pend = rowsFor('pending').length, rej = rowsFor('rejected').length;
      const comments = getAllComments().reduce((n, c) => n + 1 + c.replies.length, 0);
      return `<div class="page-head"><div><h2>Admin Dashboard</h2><div class="sub">Library-wide activity at a glance</div></div></div>
        <div class="stat-grid">
          ${statCard('Total Books', books.length + pend + rej, ICONS.book, 'var(--indigo)')}
          ${statCard('Pending Approvals', pend, ICONS.clock, 'var(--amber)')}
          ${statCard('Approved Books', books.length, ICONS.check, 'var(--green)')}
          ${statCard('Rejected Books', rej, ICONS.x, 'var(--red)')}
        </div>
        <div class="stat-grid">
          ${statCard('Total Users', getUsers().length.toLocaleString(), ICONS.users, 'var(--blue)')}
          ${statCard('Comments', comments.toLocaleString(), ICONS.comment, 'var(--indigo)')}
          ${statCard('Total Views', books.reduce((s, b) => s + (b.views || 0), 0).toLocaleString(), ICONS.eye, 'var(--amber)')}
          ${statCard('Total Downloads', books.reduce((s, b) => s + (b.downloads || 0), 0).toLocaleString(), ICONS.download, 'var(--blue)')}
        </div>
        <div class="panel"><h3>Latest Submissions</h3>${bookTable(getPendingAdmin().slice(0, 5))}</div>`;
    },
    pending(){ return statusPage('pending', 'Pending Books', 'Review new student submissions before they go live'); },
    approved(){ return statusPage('approved', 'Approved Books', 'Books currently visible in the public library'); },
    rejected(){ return statusPage('rejected', 'Rejected Books', 'Submissions sent back for changes'); },

    users(){
      const owned = {}; getMyUploads().forEach(u => { owned[u.ownerId] = (owned[u.ownerId] || 0) + 1; });
      const me = getCurrentUser();
      return `<div class="page-head"><div><h2>Users</h2><div class="sub">Everyone with an Athenaeum account</div></div></div>` +
        simpleTable(['Name', 'University', 'Uploads', 'Role', 'Actions'], getUsers().map(u => `<tr>
          <td>${esc(u.name)}<div class="s" style="color:var(--ink-faint); font-size:12px;">${esc(u.email)}</div></td><td>${esc(u.university) || '—'}</td><td>${owned[u.id] || 0}</td>
          <td>${u.isAdmin ? 'Admin' : u.suspended ? 'Suspended' : (u.verified ? 'Verified' : 'Student')}</td>
          <td>${u.isAdmin || u.id === me.id ? '—' : `<div class="table-actions"><button title="${u.suspended ? 'Reinstate' : 'Suspend'}" class="${u.suspended ? 'approve' : 'reject'}" data-suspend="${esc(u.id)}" data-flag="${u.suspended ? '0' : '1'}">${u.suspended ? ICONS.check : ICONS.x}</button></div>`}</td></tr>`).join(''));
    },

    comments(){
      const rows = getAllComments().flatMap(c => [{ ...c, isReply:false }, ...c.replies.map(r => ({ ...r, bookId:c.bookId, isReply:true }))]).sort((a, b) => b.time - a.time);
      return `<div class="page-head"><div><h2>Comments</h2><div class="sub">Moderate discussion across the library</div></div></div>` +
        (rows.length ? simpleTable(['Comment', 'Author', 'Book', 'Posted', 'Actions'], rows.map(c => {
          const b = getBookById(c.bookId);
          return `<tr><td style="max-width:360px;">${c.isReply ? '↳ ' : ''}${esc(c.text.length > 140 ? c.text.slice(0, 140) + '…' : c.text)}</td><td>${esc(c.user)}</td>
            <td>${b ? `<a href="book-details.html?id=${encodeURIComponent(b.id)}" style="color:var(--indigo);">${esc(b.title)}</a>` : '—'}</td><td>${timeAgo(c.time)}</td>
            <td>${rowBtns('', `data-del-comment="${esc(c.id)}"`)}</td></tr>`;
        }).join('')) : `<div class="panel"><div class="empty-state"><h4>No comments yet</h4><p>Comments will appear here as readers join the discussion.</p></div></div>`);
    },

    categories(){
      return `<div class="page-head"><div><h2>Categories</h2><div class="sub">Manage the categories books are organized under</div></div>
          <button class="btn btn-primary" data-add="category">${ICONS.plus} Add Category</button></div>` +
        simpleTable(['Category', 'Code', 'Books', 'Actions'], CATEGORIES.map((c, i) => `<tr><td><div class="dept-cell">${deptIconHTML(c.name, 'sm')}<div>${esc(c.name)}</div></div></td><td>${esc(c.abbr)}</td><td>${catBookCount(c.id)}</td>
          <td>${rowBtns(`data-edit-cat="${esc(c.id)}"`, `data-del-cat="${esc(c.id)}"`)}</td></tr>`).join(''));
    },
    universities(){
      return `<div class="page-head"><div><h2>Universities</h2><div class="sub">Partner institutions represented in the library</div></div>
          <button class="btn btn-primary" data-add="university">${ICONS.plus} Add University</button></div>` +
        simpleTable(['University', 'Books', 'Students', 'Actions'], UNIVERSITIES.map(u => `<tr><td>${esc(u)}</td><td>${getBooks().filter(b => b.university === u).length}</td>
          <td>${getUsers().filter(x => x.university === u).length}</td><td>${rowBtns(`data-edit-uni="${esc(u)}"`, `data-del-uni="${esc(u)}"`)}</td></tr>`).join(''));
    },
    departments(){
      const map = {};
      DEPARTMENTS.forEach(n => { map[n] = { books:0, users:0 }; });
      getBooks().forEach(b => { if(b.department) (map[b.department] = map[b.department] || { books:0, users:0 }).books++; });
      getUsers().forEach(u => { if(u.department) (map[u.department] = map[u.department] || { books:0, users:0 }).users++; });
      const names = Object.keys(map).sort((a, b) => a.localeCompare(b));
      return `<div class="page-head"><div><h2>Departments</h2><div class="sub">Departments students can pick when signing up, uploading and editing their profile</div></div>
          <button class="btn btn-primary" data-add="department">${ICONS.plus} Add Department</button></div>` +
        (names.length ? simpleTable(['Department', 'Books', 'Students', 'Actions'], names.map(n => {
          const managed = DEPARTMENTS.includes(n);
          return `<tr><td><div class="dept-cell">${deptIconHTML(n, 'sm')}<div>${esc(n)}${managed ? '' : '<div class="s" style="color:var(--ink-faint); font-size:12px;">Entered by students — not in the dropdown list</div>'}</div></div></td><td>${map[n].books}</td><td>${map[n].users}</td>
            <td>${managed ? rowBtns(`data-edit-dept="${esc(n)}"`, `data-del-dept="${esc(n)}"`) : `<div class="table-actions"><button title="Add to dropdown list" class="approve" data-adopt-dept="${esc(n)}">${ICONS.plus}</button></div>`}</td></tr>`;
        }).join(''))
          : `<div class="panel"><div class="empty-state"><h4>No departments yet</h4><p>Add your first department with the button above.</p></div></div>`);
    },
    settings(){
      const st = getSettings();
      const row = (key, t, d) => `<div class="setting-row"><div><div class="t">${t}</div><div class="d">${d}</div></div><button class="switch ${st[key] ? 'on' : ''}" data-setting="${key}" aria-pressed="${!!st[key]}"></button></div>`;
      return `<div class="page-head"><div><h2>Settings</h2><div class="sub">Platform-wide admin preferences</div></div></div>
        <div class="panel"><h3>Moderation</h3>
          ${row('requireApproval', 'Require admin approval for uploads', 'Turn off to auto-publish student uploads')}
          ${row('autoFlag', 'Auto-flag low-resolution scans', 'Flags covers under 800px wide for manual review')}
          ${row('allowAnonymous', 'Allow anonymous uploads', 'Students can upload without attaching their name')}
        </div>`;
    },
  };

  /* ---------- info modal ---------- */
  function showInfo(id){
    const b = findBookData(id);
    if(!b) return showToast('This submission no longer exists.');
    const cat = catById(b.categoryId), line = (k, v) => `<div style="display:flex; justify-content:space-between; gap:16px; padding:7px 0; border-bottom:1px solid var(--border); font-size:13.5px;"><span style="color:var(--ink-soft);">${k}</span><b style="text-align:right;">${v}</b></div>`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:998; display:flex; align-items:center; justify-content:center; padding:20px;';
    wrap.innerHTML = `<div class="panel" style="max-width:480px; width:100%; max-height:85vh; overflow:auto;" role="dialog" aria-modal="true">
      <div style="display:flex; gap:14px; margin-bottom:12px;">${coverBoxHTML(b, { size:'md', noHydrate:false })}
        <div style="min-width:0;"><h3 style="margin-bottom:4px;">${esc(b.title)}</h3><div style="color:var(--ink-soft); font-size:13.5px;">${esc(b.author)}</div>
          <div class="cover-meta" id="coverMeta" style="margin-top:8px;"></div>
          <div class="cover-actions">
            <button class="btn btn-secondary btn-sm" data-cover-replace>Upload / replace cover</button>
            <button class="btn btn-secondary btn-sm" data-cover-remove>Remove custom cover</button>
            <button class="btn btn-secondary btn-sm" data-cover-regen>Refresh PDF preview</button>
          </div>
          <input type="file" id="coverFileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;"></div></div>
      ${line('Category', esc(cat ? cat.name : '—'))}${line('University', esc(b.university))}${line('Department', esc(b.department || '—'))}
      ${line('Language', esc(b.language || '—'))}${line('Year', esc(b.year || '—'))}${line('File', `${esc(b.fileType)} · ${esc(b.sizeMb)}MB`)}
      ${line('Uploaded by', esc((b.uploader || {}).name || '—'))}${line('Status', esc(b.status || 'approved'))}
      ${b.rejectReason ? line('Rejection reason', esc(b.rejectReason)) : ''}${b.flagged ? line('Flag', 'Low-resolution cover') : ''}
      <p class="desc-block" style="margin:12px 0;">${esc(b.description)}</p>
      <button class="btn btn-secondary btn-block" data-close>Close</button></div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if(e.key === 'Escape') close(); };

    /* cover: custom > PDF first page > placeholder. Changes show everywhere instantly (syncCoverImgs). */
    const metaEl = wrap.querySelector('#coverMeta'), fileInput = wrap.querySelector('#coverFileInput');
    const btnReplace = wrap.querySelector('[data-cover-replace]'), btnRemove = wrap.querySelector('[data-cover-remove]'), btnRegen = wrap.querySelector('[data-cover-regen]');
    const paintCover = () => {
      const cur = findBookData(id) || b, src = coverSource(cur), pdf = isPdfBook(cur);
      metaEl.textContent = src === 'custom' ? 'Custom cover image' : src === 'pdf' ? 'Automatic — first page of the PDF'
        : pdf ? (needsPdfCover(cur) ? 'Generating a preview from the PDF…' : 'Placeholder — a preview could not be generated') : 'Placeholder cover';
      btnRemove.style.display = src === 'custom' ? '' : 'none';
      btnRegen.style.display = pdf ? '' : 'none';
      btnReplace.textContent = src === 'custom' ? 'Replace cover' : 'Upload custom cover';
    };
    const busy = (on) => [btnReplace, btnRemove, btnRegen].forEach(x => { x.disabled = on; });
    const run = async fn => { busy(true); try { const r = await fn(); if(say(r)) showToast('Cover updated'); } finally { busy(false); paintCover(); } };
    btnReplace.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { const f = fileInput.files[0]; fileInput.value = ''; if(f) run(() => BookService.setCustomCover(id, f)); });
    btnRemove.addEventListener('click', () => run(() => BookService.clearCustomCover(id)));
    btnRegen.addEventListener('click', () => run(() => BookService.refreshPdfCover(id)));
    paintCover(); setTimeout(paintCover, 1500);

    wrap.addEventListener('click', e => { if(e.target === wrap || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
  }

  /* ---------- category / university editing ---------- */
  const PALETTE = ['#4B3FA0', '#2F6FED', '#2E9E6B', '#E8A33D', '#D64545', '#8B5CF6', '#0EA5A5', '#DB2777'];
  function askName(label, current){
    const v = prompt(label, current || '');
    if(v === null) return null;
    const t = v.trim().replace(/\s+/g, ' ');
    if(t.length < 2 || t.length > 40){ showToast('Name must be 2–40 characters.'); return null; }
    return t;
  }
  function persistExtras(){
    localStorage.setItem('el_extra_categories', JSON.stringify(CATEGORIES.slice(BUILTIN_CATEGORY_COUNT)));
    localStorage.setItem('el_extra_universities', JSON.stringify(UNIVERSITIES.slice(BUILTIN_UNIVERSITY_COUNT)));
    localStorage.setItem('el_extra_departments', JSON.stringify(DEPARTMENTS.slice(BUILTIN_DEPARTMENT_COUNT)));
  }
  const addCategory = () => {
    const name = askName('New category name:'); if(!name) return;
    if(CATEGORIES.some(c => c.name.toLowerCase() === name.toLowerCase())) return showToast('That category already exists.');
    const abbr = (name.split(' ').length > 1 ? name.split(' ').map(w => w[0]).join('') : name.slice(0, 4)).toUpperCase().slice(0, 5);
    CATEGORIES.push({ id:uid('cat'), name, abbr, color:PALETTE[CATEGORIES.length % PALETTE.length] });
    persistExtras(); showToast('Category added'); render('categories');
  };
  const addUniversity = () => {
    const name = askName('New university name:'); if(!name) return;
    if(UNIVERSITIES.some(u => u.toLowerCase() === name.toLowerCase())) return showToast('That university already exists.');
    UNIVERSITIES.push(name); persistExtras(); showToast('University added'); render('universities');
  };
  const hasDept = name => DEPARTMENTS.some(d => d.toLowerCase() === name.toLowerCase());
  /* Name + icon dialog shared by Add and Edit. Resolves { name, icon } or null if cancelled. */
  function askDepartment({ title, name, icon, confirmText }){
    return new Promise(resolve => {
      let chosen = icon || 'graduation-cap';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:998; display:flex; align-items:center; justify-content:center; padding:20px;';
      wrap.innerHTML = `<form class="panel" style="max-width:460px; width:100%; max-height:90vh; overflow:auto;" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h3 style="margin-bottom:14px;">${esc(title)}</h3>
        <div class="field"><label for="deptNameInput">Department name</label><input type="text" id="deptNameInput" maxlength="40" value="${esc(name || '')}" placeholder="e.g. Physics" autocomplete="off"></div>
        <div class="field"><label>Icon</label>
          <div class="icon-picker" role="radiogroup" aria-label="Department icon">${DEPARTMENT_ICON_CHOICES.map(c =>
            `<button type="button" class="icon-opt" role="radio" data-icon="${esc(c.id)}" title="${esc(c.label)}" aria-label="${esc(c.label)}" aria-checked="${c.id === chosen}" style="--opt-fg:${c.color};"><span class="dept-icon dept-icon--sm">${lucideSVG(c.id)}</span></button>`).join('')}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin:4px 0 16px; color:var(--ink-soft); font-size:13px;">Preview <span id="deptPreview"></span><b id="deptPreviewName" style="color:var(--ink);"></b></div>
        <div style="display:flex; gap:10px;"><button type="button" class="btn btn-secondary btn-block" data-cancel>Cancel</button><button type="submit" class="btn btn-primary btn-block">${esc(confirmText)}</button></div></form>`;
      const input = wrap.querySelector('#deptNameInput');
      const paint = () => {
        const c = DEPARTMENT_ICON_CHOICES.find(x => x.id === chosen);
        wrap.querySelectorAll('.icon-opt').forEach(b => b.setAttribute('aria-checked', b.dataset.icon === chosen));
        wrap.querySelector('#deptPreview').innerHTML = `<span class="dept-icon" style="--dept-fg:${c.color};">${lucideSVG(c.id)}</span>`;
        wrap.querySelector('#deptPreviewName').textContent = input.value.trim() || 'Department name';
      };
      const done = v => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = e => { if(e.key === 'Escape') done(null); };
      wrap.addEventListener('click', e => {
        const opt = e.target.closest('.icon-opt');
        if(opt){ chosen = opt.dataset.icon; paint(); return; }
        if(e.target === wrap || e.target.closest('[data-cancel]')) done(null);
      });
      input.addEventListener('input', paint);
      wrap.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const t = input.value.trim().replace(/\s+/g, ' ');
        if(t.length < 2 || t.length > 40) return showToast('Name must be 2–40 characters.');
        done({ name:t, icon:chosen });
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap); paint(); input.focus();
    });
  }
  const currentIconId = name => departmentIconInfo(name).icon;
  const addDepartment = async () => {
    const r = await askDepartment({ title:'Add department', name:'', icon:'graduation-cap', confirmText:'Add department' }); if(!r) return;
    if(hasDept(r.name)) return showToast('That department already exists.');
    DEPARTMENTS.push(r.name); setDeptIcon(r.name, r.icon); persistExtras(); showToast('Department added'); render('departments');
  };
  async function adoptDepartment(name){
    if(hasDept(name)) return showToast('That department already exists.');
    const r = await askDepartment({ title:'Add to department list', name, icon:currentIconId(name), confirmText:'Add to list' }); if(!r) return;
    if(hasDept(r.name)) return showToast('That department already exists.');
    DEPARTMENTS.push(r.name); setDeptIcon(r.name, r.icon); persistExtras(); showToast('Department added to the list'); render('departments');
  }
  async function editDepartment(name){
    const i = DEPARTMENTS.indexOf(name), builtin = i < BUILTIN_DEPARTMENT_COUNT;
    const r = await askDepartment({ title: builtin ? 'Change icon' : 'Edit department', name, icon:currentIconId(name), confirmText:'Save' }); if(!r) return;
    if(builtin && r.name !== name){ showToast('Built-in departments cannot be renamed — only the icon was changed.'); r.name = name; }
    if(r.name !== name){
      if(DEPARTMENTS.some((d, j) => j !== i && d.toLowerCase() === r.name.toLowerCase())) return showToast('That department already exists.');
      const swapB = b => b.department === name ? { ...b, department:r.name } : b;
      saveBooks(getBooks().map(swapB)); saveMyUploads(getMyUploads().map(swapB));
      savePendingAdmin(getPendingAdmin().map(swapB));
      AuthStore.saveUsers(AuthStore.users().map(u => u.department === name ? { ...u, department:r.name } : u));
      DEPARTMENTS[i] = r.name; renameDeptIcon(name, r.name);
    }
    setDeptIcon(r.name, r.icon); persistExtras(); showToast('Department updated'); render('departments');
  }
  function deleteDepartment(name){
    const i = DEPARTMENTS.indexOf(name);
    if(i < BUILTIN_DEPARTMENT_COUNT) return showToast('Built-in departments cannot be deleted.');
    if(getBooks().some(b => b.department === name) || getMyUploads().some(b => b.department === name) || getUsers().some(u => u.department === name)) return showToast('This department is still in use.');
    if(!confirm('Delete this department?')) return;
    DEPARTMENTS.splice(i, 1); removeDeptIcon(name); persistExtras(); showToast('Department deleted'); render('departments');
  }
  function editCategory(id){
    const i = CATEGORIES.findIndex(c => c.id === id);
    if(i < BUILTIN_CATEGORY_COUNT) return showToast('Built-in categories cannot be renamed.');
    const name = askName('Rename category:', CATEGORIES[i].name); if(!name) return;
    if(CATEGORIES.some((c, j) => j !== i && c.name.toLowerCase() === name.toLowerCase())) return showToast('That category already exists.');
    CATEGORIES[i].name = name; persistExtras(); showToast('Category renamed'); render('categories');
  }
  function deleteCategory(id){
    const i = CATEGORIES.findIndex(c => c.id === id);
    if(i < BUILTIN_CATEGORY_COUNT) return showToast('Built-in categories cannot be deleted.');
    if(getBooks().some(b => b.categoryId === id) || getMyUploads().some(b => b.categoryId === id)) return showToast('Move or delete this category’s books first.');
    if(!confirm('Delete this category?')) return;
    CATEGORIES.splice(i, 1); persistExtras(); showToast('Category deleted'); render('categories');
  }
  function editUniversity(name){
    const i = UNIVERSITIES.indexOf(name);
    if(i < BUILTIN_UNIVERSITY_COUNT) return showToast('Built-in universities cannot be renamed.');
    const n = askName('Rename university:', name); if(!n) return;
    if(UNIVERSITIES.some((u, j) => j !== i && u.toLowerCase() === n.toLowerCase())) return showToast('That university already exists.');
    const swap = b => b.university === name ? { ...b, university:n } : b;
    saveBooks(getBooks().map(swap)); saveMyUploads(getMyUploads().map(swap));
    UNIVERSITIES[i] = n; persistExtras(); showToast('University renamed'); render('universities');
  }
  function deleteUniversity(name){
    const i = UNIVERSITIES.indexOf(name);
    if(i < BUILTIN_UNIVERSITY_COUNT) return showToast('Built-in universities cannot be deleted.');
    if(getBooks().some(b => b.university === name) || getMyUploads().some(b => b.university === name)) return showToast('This university still has books.');
    if(!confirm('Delete this university?')) return;
    UNIVERSITIES.splice(i, 1); persistExtras(); showToast('University deleted'); render('universities');
  }

  /* ---------- one delegated click handler ---------- */
  let tab = 'overview';
  main.addEventListener('click', async (e) => {
    const t = e.target.closest('button, [data-info]');
    if(!t) return;
    const d = t.dataset;
    if(d.info) return showInfo(d.info);
    if(d.preview){ const b = findBookData(d.preview); return b ? void openBookFile(b) : showToast('This submission no longer exists.'); }
    if(d.download){ const b = findBookData(d.download); return b ? void downloadBookFile(b) : showToast('This submission no longer exists.'); }
    if(d.approve){ if(say(BookService.approve(d.approve))){ showToast('Book approved and published'); render(tab); } return; }
    if(d.reject){
      const reason = prompt('Reason (shown to the student):', 'Please upload a clearer scan.');
      if(reason === null) return;
      if(say(BookService.reject(d.reject, reason))){ showToast('Book rejected'); render(tab); }
      return;
    }
    if(d.delete){ if(confirm('Delete this submission permanently?') && say(BookService.remove(d.delete))){ showToast('Submission deleted'); render(tab); } return; }
    if(d.suspend){ if(say(AuthService.setSuspended(d.suspend, d.flag === '1'))){ showToast(d.flag === '1' ? 'User suspended' : 'User reinstated'); render(tab); } return; }
    if(d.delComment){ if(confirm('Delete this comment?') && say(CommentService.adminRemove(d.delComment))){ showToast('Comment deleted'); render(tab); } return; }
    if(d.setting){
      const next = !getSettings()[d.setting];
      if(say(saveSettings({ [d.setting]: next }))){ t.classList.toggle('on', next); t.setAttribute('aria-pressed', next); showToast('Setting saved'); }
      return;
    }
    if(d.add === 'category') return addCategory();
    if(d.add === 'university') return addUniversity();
    if(d.add === 'department') return addDepartment();
    if(d.editDept) return editDepartment(d.editDept);
    if(d.delDept) return deleteDepartment(d.delDept);
    if(d.adoptDept) return adoptDepartment(d.adoptDept);
    if(d.editCat) return editCategory(d.editCat);
    if(d.delCat) return deleteCategory(d.delCat);
    if(d.editUni) return editUniversity(d.editUni);
    if(d.delUni) return deleteUniversity(d.delUni);
  });

  function render(name){
    tab = sections[name] ? name : 'overview';
    document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
    main.innerHTML = sections[tab]();

    const searchInput = main.querySelector('[id$="Search"]'), deptSelect = main.querySelector('[id$="Dept"]'), wrap = main.querySelector('[id$="TableWrap"]');
    if(searchInput && wrap){
      const refilter = () => {
        let rows = rowsFor(tab);
        const q = searchInput.value.trim().toLowerCase();
        if(q) rows = rows.filter(r => r.title.toLowerCase().includes(q) || String(r.student).toLowerCase().includes(q));
        if(deptSelect.value) rows = rows.filter(r => r.department === deptSelect.value);
        wrap.innerHTML = bookTable(rows);
      };
      searchInput.addEventListener('input', refilter);
      deptSelect.addEventListener('change', refilter);
    }
    initScrollReveal();
  }

  document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault(); window.location.hash = link.dataset.tab; render(link.dataset.tab);
    document.getElementById('appSidebar').classList.remove('open');
  }));
  const sidebarToggle = document.getElementById('sidebarToggle');
  if(sidebarToggle) sidebarToggle.addEventListener('click', () => document.getElementById('appSidebar').classList.toggle('open'));
  window.addEventListener('hashchange', () => render(location.hash.replace('#', '') || 'overview'));

  render(window.location.hash.replace('#', '') || 'overview');
});
