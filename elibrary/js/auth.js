/* ============================================================
   Athenaeum — authentication layer

   Structure (so a real backend can replace the demo one easily):
     AuthStore    -> where data lives (localStorage here). Swap for API calls.
     AuthService  -> all auth rules (signup/login/reset/profile). Async, like a
                     real API. Swap the body of these methods for fetch() calls.
     Thin wrappers below keep the page scripts unchanged.

   Demo limitations (browser-only): data is still readable in DevTools.
   Passwords are salted + hashed (SHA-256), never stored or returned in plain
   text, and the public user object never contains hash/salt.
   ============================================================ */

function uid(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
const DEMO_EMAIL = 'farhan.kabir@buet.demo';
const SESSION_DAYS = 30;
const EDITABLE_FIELDS = ['name','university','department','semester','bio','avatar'];

/* ---------------- storage adapter ---------------- */
const AuthStore = {
  users(){ return readJSON('el_users', []); },
  saveUsers(list){ localStorage.setItem('el_users', JSON.stringify(list)); },
  getSession(){
    const t = sessionStorage.getItem('el_session_temp');
    if(t) return t;
    const p = readJSON('el_session_persist', null);
    if(p && typeof p === 'object' && p.uid){
      if(p.exp > Date.now()) return p.uid;
      localStorage.removeItem('el_session_persist');
    }
    return null;
  },
  setSession(userId, remember){
    if(remember){
      localStorage.setItem('el_session_persist', JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS*864e5 }));
      sessionStorage.removeItem('el_session_temp');
    } else {
      sessionStorage.setItem('el_session_temp', userId);
      localStorage.removeItem('el_session_persist');
    }
  },
  clearSession(){ sessionStorage.removeItem('el_session_temp'); localStorage.removeItem('el_session_persist'); },
  tokens(){ return readJSON('el_reset_tokens', []).filter(t => t.exp > Date.now()); },
  saveTokens(list){ localStorage.setItem('el_reset_tokens', JSON.stringify(list)); },
  fails(){ return readJSON('el_login_fails', {}); },
  saveFails(o){ localStorage.setItem('el_login_fails', JSON.stringify(o)); },
};

/* ---------------- password hashing ---------------- */
function randHex(n){
  const a = new Uint8Array(n);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random()*256));
  return Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
}
async function hashPassword(pw, salt){
  const enc = new TextEncoder();
  if(window.crypto && crypto.subtle){
    let buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + '::' + pw));
    for(let i = 0; i < 1500; i++) buf = await crypto.subtle.digest('SHA-256', buf);
    return 'sha256$' + Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2,'0')).join('');
  }
  let h = 5381; // fallback for non-secure contexts
  for(const b of enc.encode(salt + '::' + pw)) h = ((h << 5) + h + b) >>> 0;
  return 'weak$' + h.toString(16);
}
function legacyHash(pw){ try { return btoa(unescape(encodeURIComponent('el::' + pw))); } catch(e){ return pw; } }
async function verifyPassword(user, pw){
  if(user.passHash) return (await hashPassword(pw, user.salt)) === user.passHash;
  if(user.password) return user.password === legacyHash(pw); // old demo accounts; upgraded on login
  return false;
}
async function setUserPassword(user, pw){
  user.salt = randHex(16);
  user.passHash = await hashPassword(pw, user.salt);
  delete user.password;
}

function publicUser(u){
  if(!u) return null;
  const { passHash, salt, password, ...safe } = u;
  return safe;
}
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const normEmail = e => String(e || '').trim().toLowerCase();

/* ---------------- service (swap for real API) ---------------- */
const AuthService = {
  async signup({ name, email, university, department, semester, password, avatar }){
    name = String(name || '').trim(); email = normEmail(email);
    if(name.length < 2) return { ok:false, error:'Please enter your full name.' };
    if(!validEmail(email)) return { ok:false, error:'Please enter a valid email address.' };
    if(String(password || '').length < 6) return { ok:false, error:'Password should be at least 6 characters.' };
    const users = AuthStore.users();
    if(users.some(u => normEmail(u.email) === email)) return { ok:false, error:'An account with this email already exists.' };
    const user = { id: uid('u'), name, email, university: university || '', department: String(department || '').trim(), semester: semester || '',
      bio:'', avatar: avatar || AVATAR(email), verified:false, isAdmin:false, createdAt: Date.now() };
    await setUserPassword(user, password);
    users.push(user); AuthStore.saveUsers(users);
    AuthStore.setSession(user.id, true);
    return { ok:true, user: publicUser(user) };
  },

  async login(email, password, remember){
    email = normEmail(email);
    const fails = AuthStore.fails(), f = fails[email];
    if(f && f.count >= 5 && Date.now() - f.last < 60000) return { ok:false, error:'Too many attempts. Please wait a minute and try again.' };
    const users = AuthStore.users();
    const user = users.find(u => normEmail(u.email) === email);
    if(!user || !(await verifyPassword(user, password || ''))){
      fails[email] = { count: (f && Date.now() - f.last < 60000 ? f.count : 0) + 1, last: Date.now() };
      AuthStore.saveFails(fails);
      return { ok:false, error:'Incorrect email or password.' };
    }
    if(user.suspended) return { ok:false, error:'This account has been suspended. Please contact an administrator.' };
    delete fails[email]; AuthStore.saveFails(fails);
    if(user.password){ await setUserPassword(user, password); AuthStore.saveUsers(users); }
    AuthStore.setSession(user.id, !!remember);
    return { ok:true, user: publicUser(user) };
  },

  logout(){ AuthStore.clearSession(); },

  currentUser(){
    const id = AuthStore.getSession();
    const u = id ? AuthStore.users().find(x => x.id === id) : null;
    if(u && u.suspended){ AuthStore.clearSession(); return null; }
    return publicUser(u);
  },
  setSuspended(userId, flag){
    const me = this.currentUser();
    if(!me || !me.isAdmin) return { ok:false, error:'Only administrators can manage users.' };
    const users = AuthStore.users(), u = users.find(x => x.id === userId);
    if(!u) return { ok:false, error:'User not found.' };
    if(u.id === me.id || u.isAdmin) return { ok:false, error:'Administrator accounts cannot be suspended.' };
    u.suspended = !!flag; AuthStore.saveUsers(users);
    return { ok:true };
  },

  async updateProfile(updates){
    const me = this.currentUser();
    if(!me) return { ok:false, error:'You need to be logged in.' };
    const clean = {};
    EDITABLE_FIELDS.forEach(k => { if(updates[k] !== undefined) clean[k] = updates[k]; });
    if(clean.name !== undefined){ clean.name = String(clean.name).trim(); if(clean.name.length < 2) return { ok:false, error:'Please enter your full name.' }; }
    if(clean.bio !== undefined) clean.bio = String(clean.bio).trim().slice(0, 300);
    if(clean.avatar !== undefined && !/^(data:image\/|https?:\/\/)/.test(clean.avatar)) delete clean.avatar;
    const users = AuthStore.users();
    const i = users.findIndex(u => u.id === me.id);
    users[i] = { ...users[i], ...clean };
    AuthStore.saveUsers(users);
    propagateProfile(publicUser(users[i]));
    return { ok:true, user: publicUser(users[i]) };
  },

  async changePassword(oldPass, newPass){
    const id = AuthStore.getSession();
    const users = AuthStore.users(), user = users.find(u => u.id === id);
    if(!user) return { ok:false, error:'You need to be logged in.' };
    if(!(await verifyPassword(user, oldPass))) return { ok:false, error:'Current password is incorrect.' };
    if(String(newPass).length < 6) return { ok:false, error:'New password should be at least 6 characters.' };
    if(oldPass === newPass) return { ok:false, error:'New password must be different from the current one.' };
    await setUserPassword(user, newPass); AuthStore.saveUsers(users);
    return { ok:true };
  },

  /* Real backend: emails a link. Demo: no mail server, so we hand the link back. */
  async requestReset(email){
    email = normEmail(email);
    if(!validEmail(email)) return { ok:false, error:'Please enter a valid email address.' };
    const user = AuthStore.users().find(u => normEmail(u.email) === email);
    if(!user) return { ok:true }; // same response either way (no account enumeration)
    const token = randHex(20);
    const tokens = AuthStore.tokens().filter(t => t.uid !== user.id);
    tokens.push({ token, uid: user.id, exp: Date.now() + 15*60000 });
    AuthStore.saveTokens(tokens);
    return { ok:true, demoLink: 'forgot-password.html?token=' + token };
  },
  checkResetToken(token){ return AuthStore.tokens().some(t => t.token === token); },
  async resetPassword(token, newPass){
    if(String(newPass).length < 6) return { ok:false, error:'Password should be at least 6 characters.' };
    const t = AuthStore.tokens().find(x => x.token === token);
    if(!t) return { ok:false, error:'This reset link is invalid or has expired.' };
    const users = AuthStore.users(), user = users.find(u => u.id === t.uid);
    if(!user) return { ok:false, error:'This reset link is invalid or has expired.' };
    await setUserPassword(user, newPass); AuthStore.saveUsers(users);
    AuthStore.saveTokens(AuthStore.tokens().filter(x => x.token !== token));
    return { ok:true };
  },
};

/* ---------------- keep profile info consistent everywhere ---------------- */
function propagateProfile(u){
  const uploaderInfo = { name:u.name, avatar:u.avatar, university:u.university, department:u.department, verified:!!u.verified, role: u.verified ? 'Verified Student' : 'Student Contributor' };
  const comments = getAllComments();
  comments.forEach(c => {
    if(c.userId === u.id){ c.user = u.name; c.avatar = u.avatar; }
    c.replies.forEach(r => { if(r.userId === u.id){ r.user = u.name; r.avatar = u.avatar; } });
  });
  saveAllComments(comments);
  saveMyUploads(getMyUploads().map(x => x.ownerId === u.id && !x.anonymous ? { ...x, uploader: uploaderInfo } : x));
  saveBooks(getBooks().map(x => x.ownerId === u.id && !x.anonymous ? { ...x, uploader: uploaderInfo } : x));
  savePendingAdmin(getPendingAdmin().map(x => x.ownerId === u.id && !x.anonymous ? { ...x, student:u.name, avatar:u.avatar, department:u.department || x.department, university:u.university || x.university } : x));
}

/* ---------------- first-run seed + one-time migration ---------------- */
function seedAuth(){
  if(AuthStore.users().length) return;
  // Demo account only. No auto-login: visitors must sign in.
  AuthStore.saveUsers([{
    id: uid('u'), name:'Farhan Kabir', email: DEMO_EMAIL, password: legacyHash('password123'),
    university:'BUET', department:'Computer Science & Engineering', semester:'7th Semester',
    bio:'CSE student and library contributor. I upload lecture notes and out-of-print course texts for my department.',
    avatar: AVATAR('me'), verified:true, isAdmin:true, createdAt: Date.now(),
  }]);
}
function migrateV2(){
  if(localStorage.getItem('el_mig_v2')) return;
  const demo = AuthStore.users().find(u => u.email === DEMO_EMAIL);
  if(demo){
    if(localStorage.getItem('el_notifications') && !localStorage.getItem('el_notifications:' + demo.id)) localStorage.setItem('el_notifications:' + demo.id, localStorage.getItem('el_notifications'));
    if(localStorage.getItem('el_favorites') && !localStorage.getItem('el_favorites:' + demo.id)) localStorage.setItem('el_favorites:' + demo.id, localStorage.getItem('el_favorites'));
    saveMyUploads(getMyUploads().map(x => x.ownerId ? x : { ...x, ownerId: demo.id }));
    if(!AuthStore.users().some(u => u.isAdmin)){ const us = AuthStore.users(); us.find(u => u.id === demo.id).isAdmin = true; AuthStore.saveUsers(us); }
  }
  localStorage.removeItem('el_notifications'); localStorage.removeItem('el_favorites');
  localStorage.setItem('el_mig_v2', '1');
}
function migrateV3(){
  if(localStorage.getItem('el_mig_v3')) return;
  const demoIds = ['p1','p2','p3','p4','p5','u1','u2','u3'];
  savePendingAdmin(getPendingAdmin().filter(p => !demoIds.includes(p.id)));
  saveMyUploads(getMyUploads().filter(p => !demoIds.includes(p.id)));
  saveAllComments(getAllComments().filter(c => !['c1','c2'].includes(c.id)));
  AuthStore.users().forEach(u => {
    const nk = 'el_notifications:' + u.id, fk = 'el_favorites:' + u.id;
    const demoN = ['n1','n2','n3','n4'];
    const n = readJSON(nk, []).filter(x => !demoN.includes(x.id));
    if(localStorage.getItem(nk)) localStorage.setItem(nk, JSON.stringify(n));
    if(JSON.stringify(readJSON(fk, [])) === JSON.stringify(['b2','b7'])) localStorage.setItem(fk, '[]');
  });
  const seen = new Set();
  saveBooks(getBooks().filter(b => !seen.has(b.id) && seen.add(b.id)).map((b, i) => ({ semester: SEMESTER_RANGES[i % 4], ...b, categoryId: b.categoryId })));
  const seenP = new Set();
  savePendingAdmin(getPendingAdmin().filter(p => !seenP.has(p.id) && seenP.add(p.id)));
  localStorage.setItem('el_mig_v3', '1');
}
seedAuth();
migrateV2();
migrateV3();

/* ---------------- wrappers used by the pages ---------------- */
function getUsers(){ return AuthStore.users().map(publicUser); }
function getSession(){ return AuthStore.getSession(); }
function getCurrentUser(){ return AuthService.currentUser(); }
function isLoggedIn(){ return !!getCurrentUser(); }
function isAdmin(u){ u = u || getCurrentUser(); return !!u && !!u.isAdmin; }
const signupUser = d => AuthService.signup(d);
const loginUser = (e, p, r) => AuthService.login(e, p, r);
const logoutUser = () => AuthService.logout();
const updateCurrentUser = u => AuthService.updateProfile(u);
const changeCurrentPassword = (o, n) => AuthService.changePassword(o, n);
const requestPasswordReset = e => AuthService.requestReset(e);

/* ---------------- protected pages ---------------- */
/* Run AFTER every script has loaded (DOMContentLoaded), so supabase-auth.js has already replaced the demo auth.
   Running this immediately made it use the old localStorage auth -> always "logged out" -> redirect loop with login.js. */
document.addEventListener('DOMContentLoaded', function guard(){
  const page = location.pathname.split('/').pop() || 'index.html';
  if(['dashboard.html','my-books.html'].includes(page) && !isLoggedIn()){
    location.replace('login.html?redirect=' + encodeURIComponent(page + location.search + location.hash));
  }
});
// keep tabs in sync when the user logs in/out elsewhere
window.addEventListener('storage', e => { if(e.key === 'el_session_persist') location.reload(); });

/* ---------------- navbar auth area ---------------- */
function renderAuthArea(){
  const area = document.getElementById('navAuthArea');
  if(!area) return;
  const user = getCurrentUser();

  if(!user){
    area.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="login.html" class="btn btn-secondary btn-sm">Log In</a>
        <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
      </div>`;
    return;
  }

  area.innerHTML = `
    <button id="avatarBtn" style="border:none;background:none;padding:0;"><img class="avatar" id="navAvatarImg" src="${esc(user.avatar)}" alt="${esc(user.name)}"></button>
    <div class="dropdown-panel" id="avatarPanel" style="width:250px;">
      <div class="dropdown-head" style="display:flex; align-items:center; gap:10px; font-weight:400;">
        <img src="${esc(user.avatar)}" alt="" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
        <div style="min-width:0;">
          <div style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(user.name)}</div>
          <div style="font-weight:400; font-size:12px; color:var(--ink-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(user.email)}</div>
        </div>
      </div>
      <div style="padding:8px;">
        <a href="dashboard.html" class="side-link" style="margin:0;">${ICONS.dashboard} Dashboard</a>
        <a href="my-books.html" class="side-link" style="margin:0;">${ICONS.book} My Books</a>
        <a href="dashboard.html?tab=profile" class="side-link" style="margin:0;">${ICONS.user} Profile</a>
        ${isAdmin(user) ? `<a href="admin.html" class="side-link" style="margin:0;">${ICONS.settings} Admin Panel</a>` : ''}
        <div class="side-divider"></div>
        <button id="logoutBtn" class="side-link" style="width:100%; text-align:left; border:none; background:none; color:var(--red); font-family:inherit; cursor:pointer;">${ICONS.x} Log out</button>
      </div>
    </div>`;

  const avatarBtn = document.getElementById('avatarBtn');
  const avatarPanel = document.getElementById('avatarPanel');
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !avatarPanel.classList.contains('open');
    closeAllPanels();
    avatarPanel.classList.toggle('open', willOpen);
  });
  avatarPanel.addEventListener('click', e => e.stopPropagation());
  document.getElementById('logoutBtn').addEventListener('click', () => { logoutUser(); window.location.href = 'index.html'; });
}
