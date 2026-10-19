/* Athenaeum — Upload Book
   Validation lives in validateUpload(); persistence in submitBook() (swap for API calls). */
const UPLOAD_LIMITS = { bookMB: 50, coverMB: 5, minDesc: 10 };

function readHead(file, n){
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(new Uint8Array(r.result)); r.onerror = () => res(new Uint8Array()); r.readAsArrayBuffer(file.slice(0, n)); });
}
function imageWidth(file){
  return new Promise(res => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { res(i.naturalWidth); URL.revokeObjectURL(u); }; i.onerror = () => res(0); i.src = u; });
}
const normKey = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* Returns { error } or { data } */
async function validateUpload(v, user){
  const yearMax = new Date().getFullYear();
  if(!v.title) return { error:'Please enter the book title.' };
  if(v.title.length < 3) return { error:'The title must be at least 3 characters.' };
  if(!v.author) return { error:'Please enter the author name.' };
  if(v.author.length < 2) return { error:'Please enter a valid author name.' };
  if(!v.categoryId || !catById(v.categoryId)) return { error:'Please select a category.' };
  if(!v.university || !UNIVERSITIES.includes(v.university)) return { error:'Please select a university.' };
  if(v.description.length < UPLOAD_LIMITS.minDesc) return { error:'Please add a short description (at least 10 characters).' };
  if(v.year && (v.year < 1900 || v.year > yearMax)) return { error:`Publication year must be between 1900 and ${yearMax}.` };

  const f = v.file;
  if(!f) return { error:'Please choose a PDF or EPUB file to upload.' };
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if(!['pdf','epub'].includes(ext)) return { error:'Only PDF and EPUB files are supported.' };
  if(f.size === 0) return { error:'That file is empty.' };
  if(f.size > UPLOAD_LIMITS.bookMB * 1048576) return { error:`The book file is too large (max ${UPLOAD_LIMITS.bookMB}MB).` };
  const head = await readHead(f, 5);
  const isPdf = String.fromCharCode(...head) === '%PDF-';
  const isZip = head[0] === 0x50 && head[1] === 0x4B;
  if((ext === 'pdf' && !isPdf) || (ext === 'epub' && !isZip)) return { error:'That file looks damaged or is not a real ' + ext.toUpperCase() + ' file.' };

  if(v.cover){
    if(!/^image\/(png|jpe?g|webp|gif)$/i.test(v.cover.type)) return { error:'The cover must be a PNG, JPG, WEBP or GIF image.' };
    if(v.cover.size > UPLOAD_LIMITS.coverMB * 1048576) return { error:`The cover image is too large (max ${UPLOAD_LIMITS.coverMB}MB).` };
  }

  const key = normKey(v.title) + '|' + normKey(v.author);
  const mineDup = getMyUploads().some(u => u.ownerId === user.id && u.status !== 'rejected' && (normKey(u.title) + '|' + normKey(u.author) === key || (u.fileName === f.name && u.fileBytes === f.size)));
  if(mineDup) return { error:'You have already submitted this book.' };
  if(getBooks().some(b => normKey(b.title) + '|' + normKey(b.author) === key)) return { error:'This book is already in the library.' };
  return { data:{ ext } };
}

async function submitBook(v, user, ext){
  const settings = getSettings();
  const cat = catById(v.categoryId);
  /* cover priority: custom image > first page of the PDF > generated placeholder (see js/covers.js) */
  let coverCustom = null, coverPdf = null, flagged = false;
  if(v.cover){
    coverCustom = await resizeImage(v.cover, 600);
    if(settings.autoFlag && (await imageWidth(v.cover)) < 800) flagged = true;
  } else if(ext === 'pdf'){
    coverPdf = await pdfFirstPageDataURL(v.file);          // null if the PDF can't be rendered -> placeholder
  }
  const cover = resolveCover({ title:v.title, coverCustom, coverPdf });
  const id = uid('bk');
  const anonymous = !!(v.anonymous && settings.allowAnonymous);
  const autoPublish = !settings.requireApproval && !flagged;
  const book = {
    id, ownerId:user.id, title:v.title, author:v.author, university:v.university,
    department: v.department || cat.name, categoryId:v.categoryId, cover, coverCustom, coverPdf,
    coverKey: coverPdf ? v.file.name + '|' + v.file.size : undefined,
    rating:'0.0', reviews:0, downloads:0, views:0,
    sizeMb: Math.max(0.1, v.file.size / 1048576).toFixed(1), pages:0,
    language:v.language, year: v.year || new Date().getFullYear(), semester: semesterRange(user.semester),
    verified:false, fileType: ext.toUpperCase(), uploadedOn:new Date().toISOString(),
    description:v.description, hasFile:true, fileName:v.file.name, fileBytes:v.file.size,
    flagged, anonymous, status: autoPublish ? 'approved' : 'pending',
    uploader: anonymous ? { name:'Anonymous', avatar:defaultCover('A'), role:'Student Contributor' }
      : { name:user.name, avatar:user.avatar, role: user.verified ? 'Verified Student' : 'Student Contributor', university:user.university, department:user.department, verified:!!user.verified },
  };
  const mime = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';
  await FileStore.put(id, new Blob([v.file], { type:mime }));
  try {
    const mine = getMyUploads(); mine.unshift(book); saveMyUploads(mine);
    const pend = getPendingAdmin(); pend.unshift(bookRowFromBook(book, book.status)); savePendingAdmin(pend);
    if(autoPublish){ const { status:_s, ...pub } = book; saveBooks([pub, ...getBooks()]); }
  } catch(e){
    FileStore.del(id).catch(() => {});
    saveMyUploads(getMyUploads().filter(u => u.id !== id)); savePendingAdmin(getPendingAdmin().filter(p => p.id !== id));
    throw e;
  }
  return book;
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const form = document.getElementById('uploadForm');
  if(!user){
    form.style.display = 'none';
    const prompt = document.createElement('div');
    prompt.className = 'login-prompt';
    prompt.innerHTML = `
      <div class="icon">${ICONS.upload}</div>
      <h2 style="font-size:22px; margin-bottom:10px;">Log in to upload a book</h2>
      <p style="color:var(--ink-soft); font-size:14.5px; line-height:1.6; margin-bottom:22px;">Uploads are linked to your account so readers can see who contributed each book.</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <a class="btn btn-secondary" href="signup.html">Create account</a>
        <a class="btn btn-primary" href="login.html?redirect=upload.html">Log In</a>
      </div>`;
    form.parentElement.appendChild(prompt);
    return;
  }

  document.getElementById('coverIcon').innerHTML = ICONS.image;
  document.getElementById('pdfIcon').innerHTML = ICONS.upload;
  document.getElementById('submitIcon').innerHTML = ICONS.upload;
  document.getElementById('successIcon').innerHTML = ICONS.check;

  const banner = document.createElement('div');
  banner.className = 'form-banner';
  form.parentElement.insertBefore(banner, form);
  const showBanner = (msg, type) => { banner.textContent = msg; banner.className = 'form-banner show ' + (type || 'error'); if(type !== 'success') banner.scrollIntoView({ behavior:'smooth', block:'center' }); };

  const categorySelect = document.getElementById('categorySelect');
  CATEGORIES.forEach(c => categorySelect.insertAdjacentHTML('beforeend', `<option value="${esc(c.id)}">${esc(c.name)}</option>`));
  const universitySelect = document.getElementById('universitySelect');
  UNIVERSITIES.forEach(u => universitySelect.insertAdjacentHTML('beforeend', `<option value="${esc(u)}">${esc(u)}</option>`));
  if(user.university && UNIVERSITIES.includes(user.university)) universitySelect.value = user.university;
  const deptInput = document.getElementById('fDepartment');
  deptInput.innerHTML = departmentOptions(user.department || '', 'Select department');

  const submitBtn = form.querySelector('button[type="submit"]');
  if(getSettings().allowAnonymous){
    submitBtn.insertAdjacentHTML('beforebegin', '<div class="check-row" style="margin-bottom:12px;"><input type="checkbox" id="anonCheck"> Upload anonymously (hide my name)</div>');
  }

  let coverFile = null, bookFile = null;
  function setupDropzone(zoneId, inputId, onFile){
    const zone = document.getElementById(zoneId), input = document.getElementById(inputId);
    zone.addEventListener('click', () => input.click());
    ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave','drop'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', (e) => { if(e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', () => { if(input.files[0]) onFile(input.files[0]); });
  }

  /* live cover preview — same 2:3 box as the public site: custom image > PDF first page > nothing */
  const previewBox = document.getElementById('coverPreviewBox'), preview = document.getElementById('coverPreview');
  const previewNote = document.getElementById('coverPreviewNote'), removeBtn = document.getElementById('coverRemoveBtn');
  let previewToken = 0;
  async function refreshCoverPreview(){
    const token = ++previewToken;
    removeBtn.style.display = coverFile ? '' : 'none';
    if(coverFile){
      try { const url = await resizeImage(coverFile, 600); if(token !== previewToken) return; preview.src = url; previewBox.hidden = false; previewNote.textContent = 'Using your custom cover image.'; }
      catch(err){ coverFile = null; document.getElementById('coverInput').value = ''; removeBtn.style.display = 'none'; showBanner(err.message); return refreshCoverPreview(); }
      return;
    }
    previewBox.hidden = true; preview.removeAttribute('src');
    if(!bookFile){ previewNote.textContent = ''; return; }
    if(!/\.pdf$/i.test(bookFile.name)){ previewNote.textContent = 'EPUB files have no page preview — a clean placeholder cover will be used unless you add an image.'; return; }
    previewNote.textContent = 'Generating a cover from the first page of your PDF…';
    const url = await pdfFirstPageDataURL(bookFile);
    if(token !== previewToken) return;
    if(url){ preview.src = url; previewBox.hidden = false; previewNote.textContent = 'No custom cover chosen — the first page of your PDF will be used.'; }
    else previewNote.textContent = 'Couldn’t preview this PDF — a clean placeholder cover will be used unless you add an image.';
  }

  setupDropzone('coverDropzone', 'coverInput', file => { coverFile = file; banner.className = 'form-banner'; refreshCoverPreview(); });
  removeBtn.addEventListener('click', () => { coverFile = null; document.getElementById('coverInput').value = ''; refreshCoverPreview(); });
  setupDropzone('pdfDropzone', 'pdfInput', (file) => {
    bookFile = file;
    document.getElementById('pdfFileName').textContent = `Selected: ${file.name} (${(file.size/1048576).toFixed(1)}MB)`;
    banner.className = 'form-banner';
    refreshCoverPreview();
  });

  let submitting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(submitting) return;
    const settings = getSettings();
    const v = {
      title: document.getElementById('fTitle').value.trim(),
      author: document.getElementById('fAuthor').value.trim(),
      categoryId: categorySelect.value,
      university: universitySelect.value,
      department: deptInput.value.trim(),
      language: document.getElementById('fLanguage').value,
      year: parseInt(document.getElementById('fYear').value, 10) || 0,
      description: document.getElementById('fDescription').value.trim(),
      anonymous: !!(document.getElementById('anonCheck') || {}).checked,
      file: bookFile, cover: coverFile,
    };
    submitting = true; submitBtn.disabled = true;
    try {
      const fresh = getCurrentUser();
      if(!fresh){ showBanner('Your session has expired. Please log in again.'); return; }
      const check = await validateUpload(v, fresh);
      if(check.error){ showBanner(check.error); return; }
      const book = await submitBook(v, fresh, check.data.ext);
      const msg = document.querySelector('#successScreen p');
      if(book.status === 'approved') msg.textContent = 'Thanks — your book is now live in the library.';
      form.style.display = 'none'; banner.className = 'form-banner';
      document.getElementById('successScreen').style.display = 'block';
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch(err){
      console.error(err);
      showBanner('We could not save your upload. Your browser storage may be full — try a smaller file.');
    } finally { submitting = false; submitBtn.disabled = false; }
  });
});
