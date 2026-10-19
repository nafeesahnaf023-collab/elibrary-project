/* Athenaeum — Supabase sync (phase 1: catalogue data + book files).
   Load BEFORE data.js. If SUPABASE_URL / KEY are empty, the site works exactly as before (localStorage + IndexedDB). */
const SUPABASE_URL = 'https://msclgrdvvmiziktqlhmz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PE2YwWttFvEEZ1F0inkEDA_SL5IJIw4';
const SUPABASE_BUCKET = 'books';

const SB = (() => {
  const enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  const KEYS = ['el_extra_categories','el_extra_universities','el_extra_departments','el_settings'];
  /* headers: apikey always; Bearer = the signed-in user's token (Supabase Auth), else legacy JWT anon key. sb_publishable_ keys go in apikey only */
  const hdr = () => {
    const h = { apikey: SUPABASE_ANON_KEY }; let t = SUPABASE_ANON_KEY.startsWith('eyJ') ? SUPABASE_ANON_KEY : null;
    try { const s = JSON.parse(localStorage.getItem('sb_session')); if(s && s.access_token) t = s.access_token; } catch(e){}
    if(t) h.Authorization = 'Bearer ' + t; return h;
  };
  const remoteKeys = new Set(), timers = {};
  const rawSet = Storage.prototype.setItem;

  function upsert(key, value){
    return fetch(`${SUPABASE_URL}/rest/v1/app_store?on_conflict=key`, {
      method: 'POST', keepalive: true,
      headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    }).catch(e => console.warn('Supabase sync failed:', key, e));
  }
  function queue(key, raw){
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => { try { upsert(key, JSON.parse(raw)); } catch(e){} }, 300);
  }

  /* per-row tables: books / comments / uploads / moderation queue (diffed on every save) */
  const TABLES = { el_books:'books', el_comments:'comments', el_my_uploads:'my_uploads', el_pending_admin:'pending_admin' };
  const snap = {}, seedKeys = new Set(), ttimers = {};
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ownerOf = (k, d) => { const v = k === 'el_comments' ? d.userId : d.ownerId; return UUID.test(v || '') ? v : null; };
  const send = (path, method, body) => fetch(SUPABASE_URL + path, { method, keepalive: true,
    headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: body ? JSON.stringify(body) : undefined })
    .then(r => { if(!r.ok) console.warn('Supabase', method, path.split('?')[0], r.status); return r.ok; }).catch(() => false);
  function pushTable(k, raw){
    clearTimeout(ttimers[k]);
    ttimers[k] = setTimeout(async () => {
      let list; try { list = JSON.parse(raw); } catch(e){ return; } if(!Array.isArray(list)) return;
      const t = TABLES[k], old = snap[k] || {}, next = {}, fresh = [], changed = [];
      list.forEach((d, i) => { if(!d || !d.id) return; const j = JSON.stringify(d); next[d.id] = j;
        if(!(d.id in old)) fresh.push({ id: d.id, owner_id: ownerOf(k, d), data: d, created_at: new Date(Date.now() - i).toISOString() });
        else if(old[d.id] !== j) changed.push({ id: d.id, owner_id: ownerOf(k, d), data: d }); });
      const gone = Object.keys(old).filter(id => !(id in next));
      snap[k] = next;
      if(fresh.length) await send(`/rest/v1/${t}?on_conflict=id`, 'POST', fresh);
      if(changed.length) await send(`/rest/v1/${t}?on_conflict=id`, 'POST', changed);
      if(gone.length) await send(`/rest/v1/${t}?id=in.(${gone.map(id => '"' + String(id).replace(/"/g, '') + '"').join(',')})`, 'DELETE');
    }, 300);
  }

  if(enabled){
    /* 0) per-row tables -> localStorage (empty server table keeps the local seed; an admin seeds it, others only send their own changes) */
    let isAdminLocal = false; try { isAdminLocal = !!JSON.parse(localStorage.getItem('el_profile')).isAdmin; } catch(e){}
    Object.entries(TABLES).forEach(([k, t]) => {
      try {
        const x = new XMLHttpRequest();
        x.open('GET', `${SUPABASE_URL}/rest/v1/${t}?select=id,data&order=created_at.${k === 'el_comments' ? 'asc' : 'desc'}`, false);
        Object.entries(hdr()).forEach(([a, b]) => x.setRequestHeader(a, b)); x.send();
        if(x.status !== 200){ console.warn('Supabase hydrate failed', t, x.status); snap[k] = null; return; }
        const rows = JSON.parse(x.responseText);
        if(rows.length){ rawSet.call(localStorage, k, JSON.stringify(rows.map(r => r.data))); snap[k] = Object.fromEntries(rows.map(r => [r.id, JSON.stringify(r.data)])); }
        else if(isAdminLocal){ snap[k] = {}; seedKeys.add(k); }
        else { try { snap[k] = Object.fromEntries((JSON.parse(localStorage.getItem(k)) || []).map(d => [d.id, JSON.stringify(d)])); } catch(e){ snap[k] = {}; } }
      } catch(e){ console.warn('Supabase unreachable —', t, e); snap[k] = null; }
    });
    /* 1) hydrate localStorage from Supabase before data.js runs (sync XHR: the app's data layer is synchronous) */
    try {
      const x = new XMLHttpRequest();
      x.open('GET', `${SUPABASE_URL}/rest/v1/app_store?select=key,value`, false);
      Object.entries(hdr()).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.send();
      if(x.status === 200) JSON.parse(x.responseText).forEach(r => { if(KEYS.includes(r.key)){ remoteKeys.add(r.key); rawSet.call(localStorage, r.key, JSON.stringify(r.value)); } });
      else console.warn('Supabase hydrate failed, status', x.status);
    } catch(e){ console.warn('Supabase unreachable — using local data', e); }

    /* 2) mirror every write to a synced key */
    Storage.prototype.setItem = function(k, v){
      rawSet.call(this, k, v);
      if(this === localStorage && KEYS.includes(k)) queue(k, v);
      else if(this === localStorage && TABLES[k] && snap[k]) pushTable(k, v);
    };

    /* 3) first run: push local seed data for keys Supabase doesn't have yet */
    document.addEventListener('DOMContentLoaded', () => {
      seedKeys.forEach(k => { const v = localStorage.getItem(k); if(v) pushTable(k, v); });
      KEYS.forEach(k => { const v = localStorage.getItem(k); if(v && !remoteKeys.has(k)) queue(k, v); });
    });
  }

  const fileUrl = id => `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURIComponent(id)}`;
  return {
    enabled, hdr,
    async filePut(id, blob){
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { ...hdr(), 'x-upsert': 'true', 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
      if(!r.ok) throw new Error('Upload failed (' + r.status + ')');
    },
    async fileGet(id){ const r = await fetch(fileUrl(id)); return r.ok ? r.blob() : null; },
    async fileDel(id){ await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: hdr() }); },
  };
})();
