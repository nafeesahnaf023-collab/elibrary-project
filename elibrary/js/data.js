/* ============================================================
   Athenaeum — mock data layer (no backend; localStorage as the "DB")
   ============================================================ */

const COVER = (seed, w=400, h=560) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AVATAR = (seed) => `https://i.pravatar.cc/100?u=${seed}`;

const CATEGORIES = [
  { id:'cs', name:'Computer Science', abbr:'CSE', color:'#4B3FA0' },
  { id:'ee', name:'Electrical Engineering', abbr:'EEE', color:'#2F6FED' },
  { id:'ce', name:'Civil Engineering', abbr:'CE', color:'#2E9E6B' },
  { id:'bba', name:'Business Studies', abbr:'BBA', color:'#E8A33D' },
  { id:'med', name:'Medical Science', abbr:'MBBS', color:'#D64545' },
  { id:'math', name:'Mathematics', abbr:'MATH', color:'#8B5CF6' },
];

const UNIVERSITIES = ['BUET','Dhaka University','NSU','BRAC University','MIST','KUET'];
const DEPARTMENTS = ['Computer Science & Engineering','Electrical & Electronic Engineering','Civil Engineering','Business Administration','Medical Science','Mathematics'];
const BUILTIN_CATEGORY_COUNT = CATEGORIES.length, BUILTIN_UNIVERSITY_COUNT = UNIVERSITIES.length, BUILTIN_DEPARTMENT_COUNT = DEPARTMENTS.length;
/* <option> list for department dropdowns; keeps a legacy value (not in the managed list) selectable */
function departmentOptions(selected, placeholder){
  const list = selected && !DEPARTMENTS.includes(selected) ? [...DEPARTMENTS, selected] : DEPARTMENTS;
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  return (placeholder ? `<option value="">${placeholder}</option>` : '') + list.map(d => `<option value="${e(d)}"${d === selected ? ' selected' : ''}>${e(d)}</option>`).join('');
}
const SEMESTER_RANGES = ['1st–2nd','3rd–4th','5th–6th','7th–8th'];
function semesterRange(text){
  const n = parseInt(String(text || '').replace(/[^0-9]/g, ' ').trim(), 10);
  return n >= 1 && n <= 8 ? SEMESTER_RANGES[Math.floor((n - 1) / 2)] : '';
}
function catById(id){ return CATEGORIES.find(c => c.id === id); }
function catBookCount(id){ return getBooks().filter(b => b.categoryId === id).length; }
function defaultCover(title){
  const t = String(title || 'Academic Book').trim();
  const safe = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const palette = /math|probability|algebra/i.test(t) ? ['#173F48','#2B7772'] : /business|account|marketing|organizational/i.test(t) ? ['#6C3E27','#C17D43'] : /elect|signal|power|control/i.test(t) ? ['#24345D','#4D69A2'] : ['#242D60','#6354C7'];
  const words = safe.split(/\s+/); const lines=[]; let line='';
  words.forEach(word=>{ if((line+' '+word).trim().length>19 && line){lines.push(line);line=word;} else line=(line+' '+word).trim(); });
  if(line) lines.push(line);
  const titleLines = lines.slice(0,4).map((line,i)=>`<text x="38" y="${238+i*31}" font-family="Georgia,serif" font-size="${i===0?25:23}" fill="#fff" font-weight="${i===0?700:400}">${line}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 28L28 0" stroke="#fff" stroke-opacity=".08" stroke-width="1"/></pattern></defs><rect width="400" height="600" fill="url(#g)"/><rect width="400" height="600" fill="url(#p)"/><rect x="22" y="22" width="356" height="556" rx="3" fill="none" stroke="#fff" stroke-opacity=".45"/><path d="M38 72H112" stroke="#D9D4FF" stroke-width="4"/><text x="38" y="112" font-family="Arial,sans-serif" font-size="13" letter-spacing="3" fill="#E5E2FF">ATHENAEUM ACADEMIC</text>${titleLines}<circle cx="305" cy="405" r="88" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><circle cx="305" cy="405" r="61" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><path d="M218 459L385 292M218 292L385 459" stroke="#fff" stroke-opacity=".15" stroke-width="2"/><text x="38" y="498" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="#fff" fill-opacity=".78">STUDENT EDITION</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const AUTHORS = ['S. Rahman','A. Chowdhury','M. Islam','T. Ahmed','K. Sultana','R. Karim','N. Hasan','F. Akter'];

function makeBook(i){
  const cat = CATEGORIES[i % CATEGORIES.length];
  const titles = [
    'Introduction to Algorithms & Data Structures','Principles of Digital Electronics','Structural Analysis for Engineers',
    'Fundamentals of Financial Accounting','Human Anatomy: A Regional Study','Linear Algebra and Its Applications',
    'Operating Systems: Design & Concepts','Signals and Systems','Concrete Technology & Design',
    'Marketing Management in Practice','Pathology Essentials','Discrete Mathematics for Computing',
    'Database Systems: The Complete Guide','Power Systems Analysis','Geotechnical Engineering Basics',
    'Organizational Behaviour','Pharmacology Made Easy','Probability & Statistics for Engineers',
    'Computer Networks: A Top-Down Approach','Control Systems Engineering'
  ];
  const title = titles[i % titles.length];
  return {
    id: 'b' + i,
    title,
    author: AUTHORS[i % AUTHORS.length],
    university: UNIVERSITIES[i % UNIVERSITIES.length],
    department: cat.name,
    categoryId: cat.id,
    cover: defaultCover(title),
    rating: (3.6 + (i % 5) * 0.3).toFixed(1),
    reviews: 20 + (i * 7) % 300,
    downloads: 300 + (i * 137) % 9000,
    views: 900 + (i * 211) % 20000,
    sizeMb: (2 + (i % 6) * 1.4).toFixed(1),
    pages: 180 + (i * 13) % 400,
    language: i % 4 === 0 ? 'Bangla' : 'English',
    year: 2018 + (i % 8),
    verified: i % 3 !== 0,
    fileType: 'PDF',
    semester: SEMESTER_RANGES[i % 4],
    uploadedOn: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    description: 'A comprehensive, exam-focused text written for undergraduate coursework, covering core theory with worked examples, chapter summaries, and practice problems aligned with the current syllabus.',
    uploader: { name: AUTHORS[(i+2) % AUTHORS.length], avatar: AVATAR('user'+i), role: 'Student Contributor' },
  };
}

const SEED_BOOKS = Array.from({length: 20}, (_, i) => makeBook(i));


function seedDB(){
  if(!localStorage.getItem('el_books')) localStorage.setItem('el_books', JSON.stringify(SEED_BOOKS));
  if(!localStorage.getItem('el_theme')) localStorage.setItem('el_theme', 'light');
}
seedDB();

function getBooks(){ return JSON.parse(localStorage.getItem('el_books') || '[]').map(b => (!b.cover || String(b.cover).includes('picsum.photos')) ? {...b, cover: defaultCover(b.title)} : b); }
function saveBooks(list){ localStorage.setItem('el_books', JSON.stringify(list)); }
function getBookById(id){ return getBooks().find(b => b.id === id); }
function getMyUploads(){ return JSON.parse(localStorage.getItem('el_my_uploads') || '[]'); }
function saveMyUploads(list){ localStorage.setItem('el_my_uploads', JSON.stringify(list)); }
function getPendingAdmin(){ return JSON.parse(localStorage.getItem('el_pending_admin') || '[]'); }
function savePendingAdmin(list){ localStorage.setItem('el_pending_admin', JSON.stringify(list)); }
function getComments(bookId){ return JSON.parse(localStorage.getItem('el_comments') || '[]').filter(c => c.bookId === bookId); }
function getAllComments(){ return JSON.parse(localStorage.getItem('el_comments') || '[]'); }
function saveAllComments(list){ localStorage.setItem('el_comments', JSON.stringify(list)); }
function getNotifications(){ return readJSON(userKey('el_notifications'), []); }
function saveNotifications(list){ localStorage.setItem(userKey('el_notifications'), JSON.stringify(list)); }
function pushNotification(uid, n){
  if(!uid) return;
  if(getPrefs(uid)[PREF_FOR_TYPE[n.type]] === false) return;
  const key = userKey('el_notifications', uid);
  const list = readJSON(key, []);
  if(list.some(x => x.unread && x.type === n.type && x.text === n.text)) return;
  list.unshift({ id:'n'+Date.now(), time: Date.now(), unread:true, ...n });
  localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
}
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function userKey(base, uid){ return base + ':' + (uid || (typeof getSession === 'function' && getSession()) || 'guest'); }
function readJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } }

/* Resize + validate an image file -> small JPEG data URL (keeps localStorage light) */
function resizeImage(file, max){
  max = max || 256;
  return new Promise((resolve, reject) => {
    if(!file || !/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return reject(new Error('Please choose a PNG, JPG, WEBP or GIF image.'));
    if(file.size > 5*1024*1024) return reject(new Error('Image is too large (max 5MB).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function getFavorites(){ return readJSON(userKey('el_favorites'), []); }
function saveFavorites(list){ localStorage.setItem(userKey('el_favorites'), JSON.stringify(list)); }
function getMyUploadsMine(){ const u = typeof getCurrentUser === 'function' && getCurrentUser(); return u ? getMyUploads().filter(x => x.ownerId === u.id) : []; }
function getRecent(){ return readJSON(userKey('el_recent'), []); }
function pushRecent(bookId){
  if(!getSession()) return;
  const list = getRecent().filter(r => r.id !== bookId);
  list.unshift({ id: bookId, time: Date.now() });
  localStorage.setItem(userKey('el_recent'), JSON.stringify(list.slice(0, 20)));
}
function toggleFavorite(id){
  let f = getFavorites();
  if(f.includes(id)) f = f.filter(x => x !== id); else f.push(id);
  saveFavorites(f);
  return f.includes(id);
}
function timeAgo(ts){
  const diff = Date.now() - ts;
  const mins = Math.floor(diff/60000);
  if(mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs/24);
  return days + 'd ago';
}


/* ---------- admin-created categories & universities ---------- */
readJSON('el_extra_categories', []).forEach(c => CATEGORIES.push(c));
readJSON('el_extra_universities', []).forEach(u => UNIVERSITIES.push(u));
readJSON('el_extra_departments', []).forEach(d => DEPARTMENTS.push(d));

/* ---------- platform settings (Admin > Settings) ---------- */
const DEFAULT_SETTINGS = { requireApproval:true, autoFlag:true, allowAnonymous:false };
function getSettings(){ return { ...DEFAULT_SETTINGS, ...readJSON('el_settings', {}) }; }
function saveSettings(patch){
  if(!isAdmin()) return { ok:false, error:'You do not have permission to change settings.' };
  localStorage.setItem('el_settings', JSON.stringify({ ...getSettings(), ...patch }));
  return { ok:true };
}

/* ---------- per-user notification preferences ---------- */
const DEFAULT_PREFS = { approvals:true, replies:true, favorites:false };
const PREF_FOR_TYPE = { approved:'approvals', rejected:'approvals', comment:'replies', favorite:'favorites' };
function getPrefs(uid){ return { ...DEFAULT_PREFS, ...readJSON(userKey('el_prefs', uid), {}) }; }
function savePrefs(patch){ localStorage.setItem(userKey('el_prefs'), JSON.stringify({ ...getPrefs(), ...patch })); }

/* ---------- guarded storage write (quota-safe) ---------- */
function safely(fn, msg){
  try { return fn(); }
  catch(e){ console.error(e); showToast(msg || 'Something went wrong. Please try again.'); return undefined; }
}

/* ============================================================
   Book service — every mutation re-checks permissions here.
   (In a real backend these checks live on the server.)
   ============================================================ */
function bookRowFromBook(b, status){
  return { id:b.id, ownerId:b.ownerId, title:b.title, student:(b.uploader && b.uploader.name) || 'Unknown', avatar:b.uploader && b.uploader.avatar,
    department:b.department || '', university:b.university || '', date:timeAgo(new Date(b.uploadedOn || Date.now()).getTime()), cover:b.cover, status, flagged:!!b.flagged };
}
function findBookData(id){
  const item = getPendingAdmin().find(p => p.id === id);
  return getBooks().find(b => b.id === id) || getMyUploads().find(u => u.id === id) || (item && item.book) || null;
}
function purgeBookEverywhere(id){
  saveBooks(getBooks().filter(b => b.id !== id));
  savePendingAdmin(getPendingAdmin().filter(p => p.id !== id));
  saveMyUploads(getMyUploads().filter(u => u.id !== id));
  saveAllComments(getAllComments().filter(c => c.bookId !== id));
  if(typeof FileStore !== 'undefined') FileStore.del(id).catch(() => {});
}
const BookService = {
  approve(id){
    if(!isAdmin()) return { ok:false, error:'Only administrators can approve books.' };
    const data = findBookData(id);
    if(!data) return { ok:false, error:'This submission no longer exists.' };
    const { status:_s, rejectReason:_r, book:_b, ...pub } = data;
    const list = getPendingAdmin(), item = list.find(p => p.id === id);
    if(item){ item.status = 'approved'; delete item.book; savePendingAdmin(list); }
    saveBooks([{ ...pub, verified:true, uploadedOn: new Date().toISOString() }, ...getBooks().filter(b => b.id !== id)]);
    const ups = getMyUploads(), up = ups.find(u => u.id === id);
    if(up){ up.status = 'approved'; delete up.rejectReason; saveMyUploads(ups); }
    pushNotification(data.ownerId, { type:'approved', text:`Your upload "${data.title}" was approved.` });
    return { ok:true };
  },
  reject(id, reason){
    if(!isAdmin()) return { ok:false, error:'Only administrators can reject books.' };
    const data = findBookData(id);
    if(!data) return { ok:false, error:'This submission no longer exists.' };
    reason = String(reason || '').trim().slice(0, 300) || 'Rejected by an administrator.';
    const { status:_s, ...snap } = data;
    const list = getPendingAdmin();
    let item = list.find(p => p.id === id);
    if(!item){ item = bookRowFromBook(data, 'rejected'); list.unshift(item); }
    item.status = 'rejected'; item.book = snap; item.rejectReason = reason;
    savePendingAdmin(list);
    saveBooks(getBooks().filter(b => b.id !== id));
    const ups = getMyUploads(), up = ups.find(u => u.id === id);
    if(up){ up.status = 'rejected'; up.rejectReason = reason; saveMyUploads(ups); }
    pushNotification(data.ownerId, { type:'rejected', text:`"${data.title}" was rejected: ${reason}` });
    return { ok:true };
  },
  remove(id){
    if(!isAdmin()) return { ok:false, error:'Only administrators can delete submissions.' };
    if(!findBookData(id)) return { ok:false, error:'This submission no longer exists.' };
    purgeBookEverywhere(id);
    return { ok:true };
  },
  removeOwn(id){
    const me = getCurrentUser();
    if(!me) return { ok:false, error:'Please log in first.' };
    const up = getMyUploads().find(u => u.id === id);
    if(!up) return { ok:false, error:'Book not found.' };
    if(up.ownerId !== me.id) return { ok:false, error:'You can only delete your own books.' };
    purgeBookEverywhere(id);
    return { ok:true };
  },
  resubmit(id){
    const me = getCurrentUser();
    const ups = getMyUploads(), up = ups.find(u => u.id === id);
    if(!me || !up || up.ownerId !== me.id) return { ok:false, error:'You can only resubmit your own books.' };
    up.status = 'pending'; delete up.rejectReason; saveMyUploads(ups);
    const list = getPendingAdmin(), it = list.find(p => p.id === id);
    if(it){ it.status = 'pending'; delete it.book; delete it.rejectReason; savePendingAdmin(list); }
    return { ok:true };
  },
  editOwnTitle(id, title){
    const me = getCurrentUser();
    title = String(title || '').trim();
    if(title.length < 3 || title.length > 150) return { ok:false, error:'Title must be 3–150 characters.' };
    const ups = getMyUploads(), up = ups.find(u => u.id === id);
    if(!me || !up || up.ownerId !== me.id) return { ok:false, error:'You can only edit your own books.' };
    if(up.status !== 'pending') return { ok:false, error:'Only pending books can be edited.' };
    up.title = title; saveMyUploads(ups);
    const list = getPendingAdmin(), it = list.find(p => p.id === id);
    if(it){ it.title = title; savePendingAdmin(list); }
    return { ok:true };
  },
};

/* ============================================================
   Comment service — ownership enforced on every mutation
   ============================================================ */
function commentIsOwner(c, user){ return !!user && !!c && c.userId === user.id; }
function findComment(id){
  const all = getAllComments();
  for(const c of all){
    if(c.id === id) return { all, item:c, parent:null };
    const r = c.replies.find(x => x.id === id);
    if(r) return { all, item:r, parent:c };
  }
  return { all, item:null, parent:null };
}
function cleanCommentText(t){
  t = String(t || '').trim();
  if(!t) return { error:'Please write something first.' };
  if(t.length > 1000) return { error:'Comments can be at most 1000 characters.' };
  return { text:t };
}
const CommentService = {
  add(bookId, text, image){
    const me = getCurrentUser();
    if(!me) return { ok:false, error:'Please log in to comment.' };
    if(!getBookById(bookId)) return { ok:false, error:'This book is no longer available.' };
    const v = cleanCommentText(text); if(v.error) return { ok:false, error:v.error };
    const all = getAllComments();
    all.push({ id:uid('c'), userId:me.id, bookId, user:me.name, avatar:me.avatar, text:v.text,
      image: image && /^data:image\//.test(image) ? image : null, likedBy:[], time:Date.now(), replies:[] });
    saveAllComments(all);
    return { ok:true };
  },
  reply(commentId, text){
    const me = getCurrentUser();
    if(!me) return { ok:false, error:'Please log in to reply.' };
    const v = cleanCommentText(text); if(v.error) return { ok:false, error:v.error };
    const { all, item } = findComment(commentId);
    if(!item || !item.replies) return { ok:false, error:'That comment no longer exists.' };
    item.replies.push({ id:uid('r'), userId:me.id, user:me.name, avatar:me.avatar, text:v.text, likedBy:[], time:Date.now() });
    saveAllComments(all);
    if(item.userId && item.userId !== me.id){
      const b = getBookById(item.bookId);
      pushNotification(item.userId, { type:'comment', text:`${me.name} replied to your comment${b ? ' on "' + b.title + '"' : ''}.` });
    }
    return { ok:true };
  },
  toggleLike(id){
    const me = getCurrentUser();
    if(!me) return { ok:false, error:'Please log in to like comments.' };
    const { all, item } = findComment(id);
    if(!item) return { ok:false, error:'That comment no longer exists.' };
    item.likedBy = item.likedBy || [];
    const i = item.likedBy.indexOf(me.id);
    if(i >= 0) item.likedBy.splice(i, 1); else item.likedBy.push(me.id);
    saveAllComments(all);
    return { ok:true };
  },
  edit(id, text){
    const me = getCurrentUser();
    const { all, item } = findComment(id);
    if(!item) return { ok:false, error:'That comment no longer exists.' };
    if(!commentIsOwner(item, me)) return { ok:false, error:'You can only edit your own comments.' };
    const v = cleanCommentText(text); if(v.error) return { ok:false, error:v.error };
    item.text = v.text; item.edited = true;
    saveAllComments(all);
    return { ok:true };
  },
  remove(id){
    const me = getCurrentUser();
    const { all, item, parent } = findComment(id);
    if(!item) return { ok:false, error:'That comment no longer exists.' };
    if(!commentIsOwner(item, me)) return { ok:false, error:'You can only delete your own comments.' };
    saveAllComments(parent ? all.map(c => c === parent ? { ...c, replies:c.replies.filter(r => r.id !== id) } : c) : all.filter(c => c.id !== id));
    return { ok:true };
  },
  adminRemove(id){
    if(!isAdmin()) return { ok:false, error:'Only administrators can moderate comments.' };
    const { all, item, parent } = findComment(id);
    if(!item) return { ok:false, error:'That comment no longer exists.' };
    saveAllComments(parent ? all.map(c => c === parent ? { ...c, replies:c.replies.filter(r => r.id !== id) } : c) : all.filter(c => c.id !== id));
    return { ok:true };
  },
};
function likeCount(c){ return (c.likedBy || []).length; }
