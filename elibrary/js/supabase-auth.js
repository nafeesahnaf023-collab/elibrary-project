/* Athenaeum — Supabase Auth (phase 2). Load right AFTER auth.js. Replaces the demo localStorage auth when Supabase is configured. */
(() => {
  if(typeof SB === 'undefined' || !SB.enabled) return;
  const BASE = SUPABASE_URL, KEY = SUPABASE_ANON_KEY, S = 'sb_session', P = 'el_profile';
  const jget = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
  const sess = () => jget(S);
  const api = async (path, { method = 'POST', body, token, prefer } = {}) => {
    const h = SB.hdr(); h['Content-Type'] = 'application/json'; if(token) h.Authorization = 'Bearer ' + token; if(prefer) h.Prefer = prefer;
    const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch(e){}
    return { ok: r.ok, data };
  };
  const syncReq = (path, method, body) => {            // used only where the page code needs an immediate answer (admin screens)
    try {
      const x = new XMLHttpRequest(); x.open(method || 'GET', BASE + path, false);
      const h = SB.hdr(); h['Content-Type'] = 'application/json'; Object.entries(h).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.send(body ? JSON.stringify(body) : null);
      return { ok: x.status >= 200 && x.status < 300, data: (() => { try { return JSON.parse(x.responseText); } catch(e){ return null; } })() };
    } catch(e){ return { ok: false, data: null }; }
  };
  const toUser = p => p && ({ id: p.id, name: p.name, email: p.email, university: p.university || '', department: p.department || '', semester: p.semester || '',
    bio: p.bio || '', avatar: p.avatar || AVATAR(p.email), verified: !!p.verified, isAdmin: !!p.is_admin, suspended: !!p.suspended, createdAt: Date.parse(p.created_at) || Date.now() });
  const saveSession = d => localStorage.setItem(S, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, uid: d.user.id }));
  const clear = () => { localStorage.removeItem(S); localStorage.removeItem(P); };
  const errMsg = (d, fallback) => {
    const m = String((d && (d.msg || d.error_description || d.message)) || '');
    if(/already registered|already been registered/i.test(m)) return 'An account with this email already exists.';
    return fallback || m || 'Something went wrong. Please try again.';
  };
  async function fetchProfile(){
    const s = sess(); if(!s) return null;
    const r = await api(`/rest/v1/profiles?id=eq.${s.uid}&select=*`, { method: 'GET' });
    const u = r.ok && r.data && r.data[0] ? toUser(r.data[0]) : null;
    if(u) localStorage.setItem(P, JSON.stringify(u)); return u;
  }

  /* ---- storage adapter ---- */
  let allProfiles = null;
  Object.assign(AuthStore, {
    users(){
      const me = AuthService.currentUser(); if(!me) return [];
      if(me.isAdmin){ if(!allProfiles){ const r = syncReq('/rest/v1/profiles?select=*&order=created_at.desc'); allProfiles = r.ok && r.data ? r.data.map(toUser) : [me]; } return allProfiles; }
      return [me];
    },
    saveUsers(){}, getSession(){ const s = sess(); return s ? s.uid : null; }, setSession(){}, clearSession: clear,
  });

  /* ---- service ---- */
  Object.assign(AuthService, {
    async signup({ name, email, university, department, semester, password, avatar }){
      name = String(name || '').trim(); email = normEmail(email);
      if(name.length < 2) return { ok: false, error: 'Please enter your full name.' };
      if(!validEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
      if(String(password || '').length < 6) return { ok: false, error: 'Password should be at least 6 characters.' };
      const r = await api('/auth/v1/signup', { body: { email, password, data: { name, university: university || '', department: String(department || '').trim(), semester: semester || '' } } });
      if(!r.ok) return { ok: false, error: errMsg(r.data) };
      if(!r.data.access_token) return { ok: false, error: 'Account created. Please confirm your email, then log in.' };
      saveSession(r.data);
      if(avatar && /^(data:image\/|https?:\/\/)/.test(avatar)) await api(`/rest/v1/profiles?id=eq.${r.data.user.id}`, { method: 'PATCH', body: { avatar } });
      return { ok: true, user: await fetchProfile() };
    },
    async login(email, password){
      email = normEmail(email);
      const r = await api('/auth/v1/token?grant_type=password', { body: { email, password: password || '' } });
      if(!r.ok) return { ok: false, error: /too many|rate/i.test(errMsg(r.data)) ? 'Too many attempts. Please wait a minute and try again.' : 'Incorrect email or password.' };
      saveSession(r.data);
      const u = await fetchProfile();
      if(!u || u.suspended){ clear(); return { ok: false, error: u ? 'This account has been suspended. Please contact an administrator.' : 'Could not load your profile. Please try again.' }; }
      return { ok: true, user: u };
    },
    logout(){ const s = sess(); if(s) api('/auth/v1/logout', { token: s.access_token }).catch(() => {}); clear(); },
    currentUser(){
      const s = sess(), u = s && jget(P);
      if(!u || u.id !== s.uid) return null;
      if(u.suspended){ clear(); return null; }
      return u;
    },
    setSuspended(userId, flag){
      const me = this.currentUser();
      if(!me || !me.isAdmin) return { ok: false, error: 'Only administrators can manage users.' };
      if(userId === me.id) return { ok: false, error: 'Administrator accounts cannot be suspended.' };
      const t = (allProfiles || []).find(x => x.id === userId); if(t && t.isAdmin) return { ok: false, error: 'Administrator accounts cannot be suspended.' };
      const r = syncReq(`/rest/v1/profiles?id=eq.${userId}`, 'PATCH', { suspended: !!flag });
      if(!r.ok) return { ok: false, error: 'Could not update the user.' };
      allProfiles = null; return { ok: true };
    },
    async updateProfile(updates){
      const me = this.currentUser(); if(!me) return { ok: false, error: 'You need to be logged in.' };
      const clean = {}; EDITABLE_FIELDS.forEach(k => { if(updates[k] !== undefined) clean[k] = updates[k]; });
      if(clean.name !== undefined){ clean.name = String(clean.name).trim(); if(clean.name.length < 2) return { ok: false, error: 'Please enter your full name.' }; }
      if(clean.bio !== undefined) clean.bio = String(clean.bio).trim().slice(0, 300);
      if(clean.avatar !== undefined && !/^(data:image\/|https?:\/\/)/.test(clean.avatar)) delete clean.avatar;
      const r = await api(`/rest/v1/profiles?id=eq.${me.id}`, { method: 'PATCH', body: clean, prefer: 'return=representation' });
      if(!r.ok){ console.error('Profile save failed', r.data); return { ok: false, error: 'Could not save your profile' + (r.data && r.data.message ? ' (' + r.data.message + ')' : '') + '. Please try again.' }; }
      /* PATCH can "succeed" with 0 rows when a policy blocks it - treat that as a failure instead of silently losing the photo */
      if(!Array.isArray(r.data) || !r.data.length){ console.error('Profile save matched 0 rows (check RLS / session)'); return { ok: false, error: 'Your changes were not saved (permission problem). Please log out, log in again and retry.' }; }
      const u = toUser(r.data[0]); localStorage.setItem(P, JSON.stringify(u)); propagateProfile(u); return { ok: true, user: u };
    },
    async changePassword(oldPass, newPass){
      const me = this.currentUser(), s = sess(); if(!me) return { ok: false, error: 'You need to be logged in.' };
      if(String(newPass).length < 6) return { ok: false, error: 'New password should be at least 6 characters.' };
      if(oldPass === newPass) return { ok: false, error: 'New password must be different from the current one.' };
      const chk = await api('/auth/v1/token?grant_type=password', { body: { email: me.email, password: oldPass || '' } });
      if(!chk.ok) return { ok: false, error: 'Current password is incorrect.' };
      const r = await api('/auth/v1/user', { method: 'PUT', body: { password: newPass }, token: s.access_token });
      return r.ok ? { ok: true } : { ok: false, error: errMsg(r.data) };
    },
    async requestReset(email){
      email = normEmail(email); if(!validEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
      await api('/auth/v1/recover', { body: { email, redirect_to: new URL('forgot-password.html', location.href).href } });
      return { ok: true };                      // same answer either way; the email link does the rest
    },
    checkResetToken(t){ return !!t && String(t).split('.').length === 3; },
    async resetPassword(token, newPass){
      if(String(newPass).length < 6) return { ok: false, error: 'Password should be at least 6 characters.' };
      const r = await api('/auth/v1/user', { method: 'PUT', body: { password: newPass }, token });
      return r.ok ? { ok: true } : { ok: false, error: 'This reset link is invalid or has expired.' };
    },
  });

  /* password-recovery email lands on forgot-password.html#access_token=...&type=recovery -> expose it as ?token= for the existing page script */
  if(/type=recovery/.test(location.hash)){
    const t = new URLSearchParams(location.hash.slice(1)).get('access_token');
    if(t) history.replaceState(null, '', location.pathname + '?token=' + encodeURIComponent(t));
  }
  window.addEventListener('storage', e => { if(e.key === S) location.reload(); });

  /* background refresh of token + profile (never blocks the page) */
  (async () => {
    let s = sess(); if(!s) return;
    if(s.exp - Date.now() < 120000 && s.refresh_token){
      const r = await api('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
      if(r.ok) saveSession(r.data); else if(s.exp < Date.now()){ clear(); return location.reload(); }
    }
    const u = await fetchProfile();
    if(u && u.suspended){ clear(); location.reload(); }
  })();
})();
