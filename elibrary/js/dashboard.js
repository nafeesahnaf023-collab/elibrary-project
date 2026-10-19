document.addEventListener('DOMContentLoaded', () => {
  const sideIcons = { dashboard: ICONS.dashboard, uploads: ICONS.book, favorites: ICONS.heart, reading: ICONS.bookmark, profile: ICONS.user, settings: ICONS.settings };
  document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(link => {
    link.querySelector('span').innerHTML = sideIcons[link.dataset.tab];
  });

  const main = document.getElementById('appMain');
  const user = getCurrentUser();
  const uploads = getMyUploadsMine();
  const recents = getRecent().map(r => ({ ...r, book: getBookById(r.id) })).filter(r => r.book);
  const myCommentCount = getAllComments().reduce((n,c) => n + (c.userId===(user&&user.id)?1:0) + c.replies.filter(r => r.userId===(user&&user.id)).length, 0);
  const favBooks = getBooks().filter(b => getFavorites().includes(b.id));

  const sidebarProfile = document.getElementById('sidebarProfile');
  if(sidebarProfile){
    sidebarProfile.innerHTML = user ? `
      <a href="dashboard.html?tab=profile" class="sidebar-profile" data-tab-link="profile">
        <img src="${esc(user.avatar)}" alt="${esc(user.name)}">
        <div style="min-width:0;">
          <div class="name">${esc(user.name)}</div>
          <div class="role">${esc(user.university) || 'Athenaeum member'}</div>
        </div>
      </a>` : '';
  }

  if(!user){
    main.innerHTML = `
      <div class="login-prompt">
        <div class="icon">${ICONS.user}</div>
        <h2 style="font-size:22px; margin-bottom:10px;">Log in to see your dashboard</h2>
        <p style="color:var(--ink-soft); font-size:14.5px; line-height:1.6; margin-bottom:22px;">Your uploads, favorites and reading list are tied to your account.</p>
        <div style="display:flex; gap:12px; justify-content:center;">
          <a class="btn btn-secondary" href="signup.html">Create account</a>
          <a class="btn btn-primary" href="login.html">Log In</a>
        </div>
      </div>`;
    document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(l => { l.style.opacity = '0.5'; l.style.pointerEvents = 'none'; });
    return;
  }

  const prefs = getPrefs(user.id);
  const sections = {
    dashboard(){
      const totalDownloads = uploads.reduce((s,u)=>s+u.downloads,0);
      return `
        <div class="page-head">
          <div><h2>Welcome back, ${esc(user.name.split(' ')[0])}</h2><div class="sub">Here's what's happening with your library activity</div></div>
          <a class="btn btn-primary" href="upload.html">${ICONS.plus} Add Book</a>
        </div>
        <div class="stat-grid">
          ${statCard('Total Books', uploads.length, ICONS.book, 'var(--indigo)')}
          ${statCard('Downloads', totalDownloads, ICONS.download, 'var(--blue)')}
          ${statCard('Favorites', favBooks.length, ICONS.heart, 'var(--red)')}
          ${statCard('Reading List', recents.length, ICONS.bookmark, 'var(--amber)')}
        </div>
        <div class="two-col">
          <div class="panel">
            <h3>Recent Activity</h3>
            ${activityFeed()}
          </div>
          <div class="panel">
            <h3>Quick Actions</h3>
            <div class="quick-actions">
              <a class="btn btn-secondary" href="upload.html">${ICONS.upload} Upload a new book</a>
              <a class="btn btn-secondary" href="my-books.html">${ICONS.book} View my uploads</a>
              <a class="btn btn-secondary" href="search.html">${ICONS.search} Browse the catalog</a>
              <a class="btn btn-secondary" href="#reading" data-tab-link="reading">${ICONS.bookmark} Continue reading</a>
            </div>
          </div>
        </div>`;
    },
    uploads(){
      return `
        <div class="page-head"><div><h2>My Uploaded Books</h2><div class="sub">Everything you've contributed to the library</div></div>
          <a class="btn btn-primary" href="upload.html">${ICONS.plus} Add Book</a></div>
        <div class="panel">
          ${uploads.length ? uploads.map(u => `
            <div class="mybook-card">
              ${coverBoxHTML(u, { size:'md' })}
              <div class="grow">
                <h4>${esc(u.title)}</h4>
                ${u.uploader ? `<div style="display:flex; align-items:center; gap:6px; margin:4px 0;"><img src="${u.uploader.avatar}" alt="" style="width:18px; height:18px; border-radius:50%; object-fit:cover;"><span style="font-size:12px; color:var(--ink-faint);">${esc(u.uploader.name)}</span></div>` : ''}
                <span class="badge badge-${u.status}">${u.status[0].toUpperCase()+u.status.slice(1)}</span>
                <div class="row-stats"><span>${ICONS.eye} ${u.views}</span><span>${ICONS.download} ${u.downloads}</span></div>
              </div>
              <div class="actions"><a class="btn btn-secondary btn-sm" href="my-books.html">Manage</a></div>
            </div>`).join('') : `<div class="empty-state"><h4>No uploads yet</h4><p>Books you upload will appear here.</p></div>`}
        </div>`;
    },
    favorites(){
      return `
        <div class="page-head"><div><h2>Favorites</h2><div class="sub">Books you've saved to come back to</div></div></div>
        <div class="book-grid">${favBooks.length ? favBooks.map(bookCardHTML).join('') : `<div class="empty-state" style="grid-column:1/-1;"><h4>No favorites yet</h4><p>Tap the heart on any book to save it here.</p></div>`}</div>`;
    },
    reading(){
      return `
        <div class="page-head"><div><h2>Reading List</h2><div class="sub">Books you've opened recently</div></div></div>
        <div class="panel">
          ${recents.length ? recents.map(r => `
            <div class="mybook-card">
              ${coverBoxHTML(r.book, { size:'md' })}
              <div class="grow">
                <h4>${esc(r.book.title)}</h4>
                <div class="row-stats"><span>${ICONS.bookmark} Opened ${timeAgo(r.time)}</span></div>
              </div>
              <div class="actions"><a class="btn btn-primary btn-sm" href="book-details.html?id=${esc(r.book.id)}">Continue</a></div>
            </div>`).join('') : `<div class="empty-state"><h4>Nothing here yet</h4><p>Books you open will show up here.</p></div>`}
        </div>`;
    },
    profile(){
      return `
        <div class="page-head"><div><h2>Profile</h2><div class="sub">How other students see you</div></div>
          <button class="btn btn-secondary" id="editProfileBtn">${ICONS.edit} Edit profile</button></div>
        <div class="profile-head">
          <img src="${esc(user.avatar)}" alt="">
          <div>
            <h3 style="font-size:22px;">${esc(user.name)}</h3>
            <div style="color:var(--ink-soft); font-size:14px; margin-top:4px;">${esc(user.department) || '—'} · ${esc(user.university) || '—'} · ${esc(user.semester) || '—'}</div>
            ${user.verified ? `<span class="badge badge-verified" style="margin-top:8px; display:inline-flex;">${ICONS.check} Verified Student</span>` : ''}
          </div>
        </div>
        <div class="profile-stats">
          ${statCard('Uploaded', uploads.length, ICONS.book, 'var(--indigo)')}
          ${statCard('Downloads Received', uploads.reduce((s,u)=>s+u.downloads,0), ICONS.download, 'var(--blue)')}
          ${statCard('Comments', myCommentCount, ICONS.comment, 'var(--amber)')}
          ${statCard('Favorite Books', favBooks.length, ICONS.heart, 'var(--red)')}
        </div>
        <div class="panel" id="bioPanel"><h3>Bio</h3><p style="color:var(--ink-soft); font-size:14.5px; line-height:1.6;">${esc(user.bio) || 'No bio yet — click Edit profile to add one.'}</p></div>

        <div class="panel" id="editProfilePanel" style="display:none;">
          <h3>Edit Profile</h3>
          <div class="field">
            <label>Profile photo</label>
            <div class="dropzone" id="profilePhotoDropzone">
              <span>${ICONS.image}</span>
              <p>Drag & drop a new photo, or <span class="link">browse</span></p>
              <input type="file" id="profilePhotoInput" accept="image/*" style="display:none;">
            </div>
            <img class="cover-preview" id="profilePhotoPreview" src="${esc(user.avatar)}" style="display:block; height:120px; width:120px; border-radius:50%; object-fit:cover;">
          </div>
          <div class="field-row">
            <div class="field"><label>Full name</label><input type="text" id="editName" value="${esc(user.name)}"></div>
            <div class="field"><label>Semester</label>
              <select id="editSemester">
                ${['1st Semester','2nd Semester','3rd Semester','4th Semester','5th Semester','6th Semester','7th Semester','8th Semester'].map(s=>`<option ${user.semester===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>University</label>
              <select id="editUniversity">${UNIVERSITIES.map(u2=>`<option ${user.university===u2?'selected':''}>${u2}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Department</label><select id="editDepartment">${departmentOptions(user.department || '', 'Select department')}</select></div>
          </div>
          <div class="field"><label>Bio</label><textarea id="editBio" placeholder="Tell other students a bit about yourself..." maxlength="300">${esc(user.bio)}</textarea></div>

          <div class="side-divider"></div>
          <h3>Change Password</h3>
          <div class="field-row">
            <div class="field"><label>Current password</label><input type="password" id="editOldPass" placeholder="••••••••"></div>
            <div class="field"><label>New password</label><input type="password" id="editNewPass" placeholder="••••••••"></div>
          </div>

          <div style="display:flex; gap:10px; margin-top:6px;">
            <button class="btn btn-primary" id="saveProfileBtn">Save changes</button>
            <button class="btn btn-ghost" id="cancelEditProfileBtn">Cancel</button>
          </div>
        </div>`;
    },
    settings(){
      return `
        <div class="page-head"><div><h2>Settings</h2><div class="sub">Manage how Athenaeum notifies and displays things for you</div></div></div>
        <div class="panel">
          <h3>Notifications</h3>
          ${settingRow('Book approvals & rejections', 'Get notified when your uploads are reviewed', prefs.approvals, 'pref:approvals')}
          ${settingRow('Comment replies', 'Get notified when someone replies to your comment', prefs.replies, 'pref:replies')}
          ${settingRow('Favorites activity', 'Get notified when your uploads are favorited', prefs.favorites, 'pref:favorites')}
        </div>
        <div class="panel">
          <h3>Appearance</h3>
          ${settingRow('Dark mode', 'Match the reading experience to your environment', localStorage.getItem('el_theme')==='dark', 'theme')}
        </div>`;
    },
  };

  function activityFeed(){
    const iconMap = { approved:[ICONS.check,'var(--green)'], rejected:[ICONS.x,'var(--red)'], comment:[ICONS.comment,'var(--blue)'], favorite:[ICONS.heart,'var(--red)'] };
    const items = [
      ...getNotifications().map(n => ({ t:n.time, icon:(iconMap[n.type]||iconMap.comment), text:esc(n.text) })),
      ...uploads.map(u => ({ t:new Date(u.uploadedOn || 0).getTime(), icon:[ICONS.upload,'var(--indigo)'], text:'You submitted "'+esc(u.title)+'" for review.' })),
      ...recents.slice(0,3).map(r => ({ t:r.time, icon:[ICONS.eye,'var(--amber)'], text:'You viewed "'+esc(r.book.title)+'".' })),
    ].sort((a,b) => b.t - a.t).slice(0,5);
    return items.length ? items.map(i => activityRow(i.icon[0], i.icon[1], i.text, timeAgo(i.t))).join('') : '<p style="color:var(--ink-soft); font-size:14px;">No activity yet — upload a book or browse the catalog to get started.</p>';
  }
  function statCard(label, value, icon, color){
    return `<div class="stat-card">
      <div class="top"><div class="stat-icon" style="background:color-mix(in srgb, ${color} 16%, transparent); color:${color};">${icon}</div></div>
      <div class="value">${value}</div><div class="label">${label}</div>
    </div>`;
  }
  function activityRow(icon, color, text, time){
    return `<div class="activity-row"><div class="activity-icon" style="background:color-mix(in srgb, ${color} 16%, transparent); color:${color};">${icon}</div><div>${text}<time>${time}</time></div></div>`;
  }
  function settingRow(title, desc, on, key){
    return `<div class="setting-row"><div><div class="t">${title}</div><div class="d">${desc}</div></div><button class="switch ${on?'on':''}" ${key ? `data-setting="${key}"` : ''}></button></div>`;
  }

  function render(tab){
    document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
    main.innerHTML = sections[tab] ? sections[tab]() : sections.dashboard();
    main.querySelectorAll('.fav-toggle').forEach(btn => {
      const id = btn.dataset.bookId;
      if(getFavorites().includes(id)) btn.classList.add('is-fav');
      btn.addEventListener('click', () => { toggleFavorite(id); render(tab); });
    });
    main.querySelectorAll('[data-tab-link]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); go(el.dataset.tabLink); }));
    main.querySelectorAll('[data-setting]').forEach(sw => sw.addEventListener('click', () => {
      const key = sw.dataset.setting, on = !sw.classList.contains('on');
      if(key === 'theme'){ toggleTheme(); }
      else if(key.startsWith('pref:')){ savePrefs({ [key.slice(5)]: on }); }
      sw.classList.toggle('on', on);
      showToast('Setting saved');
    }));

    if(tab === 'profile') wireProfileEdit();
    initScrollReveal();
  }

  let pendingAvatar = null;
  function wireProfileEdit(){
    const editBtn = document.getElementById('editProfileBtn');
    const panel = document.getElementById('editProfilePanel');
    const bioPanel = document.getElementById('bioPanel');
    if(!editBtn) return;

    editBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
    document.getElementById('cancelEditProfileBtn').addEventListener('click', () => { panel.style.display = 'none'; });

    const dropzone = document.getElementById('profilePhotoDropzone');
    const input = document.getElementById('profilePhotoInput');
    const preview = document.getElementById('profilePhotoPreview');
    dropzone.addEventListener('click', () => input.click());
    ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
    ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
    async function handleFile(file){
      if(!file) return;
      try { pendingAvatar = await resizeImage(file, 256); preview.src = pendingAvatar; }
      catch(err){ showToast(err.message); }
    }
    dropzone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
    input.addEventListener('change', () => handleFile(input.files[0]));

    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
      const updates = {
        name: document.getElementById('editName').value.trim() || user.name,
        semester: document.getElementById('editSemester').value,
        university: document.getElementById('editUniversity').value,
        department: document.getElementById('editDepartment').value,
        bio: document.getElementById('editBio').value.trim(),
      };
      if(pendingAvatar) updates.avatar = pendingAvatar;

      const oldPass = document.getElementById('editOldPass').value;
      const newPass = document.getElementById('editNewPass').value;
      if(oldPass || newPass){
        if(!oldPass || !newPass){ showToast('Fill in both password fields to change it'); return; }
        const pwResult = await changeCurrentPassword(oldPass, newPass);
        if(!pwResult.ok){ showToast(pwResult.error); return; }
      }

      const saved = await updateCurrentUser(updates);
      if(!saved.ok){ showToast(saved.error); return; }
      pendingAvatar = null;
      showToast('Profile updated');
      setTimeout(() => window.location.reload(), 500);
    });
  }

  function go(tab){ window.location.hash = tab; render(tab); const sb = document.getElementById('appSidebar'); if(sb) sb.classList.remove('open'); }

  document.querySelectorAll('.app-sidebar .side-link[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); go(link.dataset.tab); });
  });

  const sidebarToggle = document.getElementById('sidebarToggle');
  if(sidebarToggle){
    sidebarToggle.addEventListener('click', () => document.getElementById('appSidebar').classList.toggle('open'));
  }

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || window.location.hash.replace('#','') || 'dashboard';
  render(initialTab);
});
