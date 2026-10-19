/* Athenaeum — book covers.
   Priority for what a book shows:  1) custom cover uploaded by an admin/uploader  2) first page of the PDF  3) generated placeholder.
   - Book fields:  coverCustom (data URL | null), coverPdf (cached first-page thumbnail), coverKey (which PDF it was made from),
                   cover (the resolved URL every page already reads — kept for backward compatibility).
   - First-page previews are rendered with PDF.js (vendored in js/vendor/, loaded only when one is needed), cached on the book record,
     and regenerated if the stored PDF changes (coverKey). The original PDF in FileStore is only ever read, never modified.
   - Real backend: coverCustom/coverPdf become storage URLs, ensurePdfCover becomes a server-side job; the markup helpers stay. */

const COVER_THUMB = { width: 420, maxHeight: 900, quality: 0.8, timeoutMs: 20000 };

/* ---------- shared markup (one 2:3 box for every cover on the site; CSS lives in .cover-box) ---------- */
function coverImgHTML(book, opts){
  const o = opts || {};
  return `<img class="cover-img${o.cls ? ' ' + o.cls : ''}" src="${esc(book.cover)}" alt="${esc(o.alt != null ? o.alt : '')}" loading="lazy" decoding="async"`
    + ` data-cover-id="${esc(book.id || '')}" data-cover-title="${esc(book.title || '')}"${o.noHydrate ? ' data-no-hydrate="1"' : ''}>`;
}
/* size: 'xs' | 'sm' | 'md' (fixed widths for thumbnails) — omit for a fluid box that fills its parent */
function coverBoxHTML(book, opts){
  const o = opts || {};
  return `<div class="cover-box${o.size ? ' cover-box--' + o.size : ''}${o.boxCls ? ' ' + o.boxCls : ''}">${coverImgHTML(book, o)}</div>`;
}

/* ---------- priority helpers ---------- */
const hasLegacyCustom = b => b.coverCustom === undefined && b.coverPdf === undefined && /^data:image\/(?!svg)/i.test(String(b.cover || ''));
function coverSource(b){
  if(!b) return 'placeholder';
  if(b.coverCustom || hasLegacyCustom(b)) return 'custom';
  if(b.coverPdf) return 'pdf';
  return 'placeholder';
}
const pdfCoverKey = b => (b.fileName || '') + '|' + (b.fileBytes || 0);
const isPdfBook = b => !!b && b.hasFile && String(b.fileType || '').toUpperCase() === 'PDF';
const resolveCover = b => b.coverCustom || b.coverPdf || (hasLegacyCustom(b) ? b.cover : '') || defaultCover(b.title);

/* ---------- PDF.js (lazy) ---------- */
let pdfjsPromise = null;
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(!pdfjsPromise) pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js'; resolve(window.pdfjsLib); };
    s.onerror = () => { pdfjsPromise = null; reject(new Error('PDF renderer unavailable')); };
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

/* Render page 1 of a PDF Blob/File -> JPEG data URL, or null on any failure (invalid, encrypted, corrupt, timeout…). */
async function pdfFirstPageDataURL(blob){
  let task, pdf;
  try {
    const lib = await loadPdfJs();
    const data = new Uint8Array(await blob.arrayBuffer());
    task = lib.getDocument({ data, isEvalSupported:false });
    const timer = setTimeout(() => { try { task.destroy(); } catch(e){} }, COVER_THUMB.timeoutMs);
    try {
      pdf = await task.promise;
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale:1 });
      const scale = Math.min(COVER_THUMB.width / base.width, COVER_THUMB.maxHeight / base.height);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(vp.width)); canvas.height = Math.max(1, Math.round(vp.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext:ctx, viewport:vp }).promise;
      return canvas.toDataURL('image/jpeg', COVER_THUMB.quality);
    } finally { clearTimeout(timer); }
  } catch(e){
    console.warn('Cover preview failed:', e && e.message || e);
    return null;
  } finally { try { if(pdf) pdf.destroy(); else if(task) task.destroy(); } catch(e){} }
}

/* ---------- storage: write a cover patch to every copy of the book ---------- */
function patchBookCover(id, patch){
  const apply = b => { const n = { ...b, ...patch }; n.cover = resolveCover(n); return n; };
  try {
    if(getBooks().some(b => b.id === id)) saveBooks(getBooks().map(b => b.id === id ? apply(b) : b));
    if(getMyUploads().some(b => b.id === id)) saveMyUploads(getMyUploads().map(b => b.id === id ? apply(b) : b));
    const rows = getPendingAdmin();
    if(rows.some(r => r.id === id)){
      savePendingAdmin(rows.map(r => r.id !== id ? r : { ...r, cover: resolveCover({ ...(r.book || findBookData(id) || {}), ...patch, title: r.title }), book: r.book ? apply(r.book) : r.book }));
    }
    return { ok:true };
  } catch(e){
    console.error(e);
    return { ok:false, error:'Could not save the cover — browser storage may be full. Try a smaller image.' };
  }
}

/* ---------- first-page cache (generated only when needed, one at a time) ---------- */
const coverFailed = new Set(JSON.parse(sessionStorage.getItem('el_cover_failed') || '[]'));
const coverInflight = new Map();
let coverQueue = Promise.resolve();
const needsPdfCover = b => isPdfBook(b) && coverSource(b) !== 'custom' && !(b.coverPdf && b.coverKey === pdfCoverKey(b)) && !coverFailed.has(b.id);

function ensurePdfCover(id, force){
  if(coverInflight.has(id)) return coverInflight.get(id);
  const job = coverQueue.then(async () => {
    const b = findBookData(id);
    if(!isPdfBook(b) || (!force && !needsPdfCover(b))) return b ? b.cover : null;
    const blob = await FileStore.get(id).catch(() => null);
    const url = blob ? await pdfFirstPageDataURL(blob) : null;
    if(!url){ coverFailed.add(id); try { sessionStorage.setItem('el_cover_failed', JSON.stringify([...coverFailed])); } catch(e){} return null; }
    coverFailed.delete(id);
    const r = patchBookCover(id, { coverPdf:url, coverKey:pdfCoverKey(b) });
    return r.ok ? url : null;
  }).finally(() => coverInflight.delete(id));
  coverInflight.set(id, job); coverQueue = job.catch(() => {});
  return job;
}

/* ---------- admin operations (permission re-checked here, like the other services) ---------- */
Object.assign(BookService, {
  async setCustomCover(id, file){
    if(!isAdmin()) return { ok:false, error:'Only administrators can change book covers.' };
    const b = findBookData(id);
    if(!b) return { ok:false, error:'This book no longer exists.' };
    let url;
    try { url = await resizeImage(file, 600); } catch(e){ return { ok:false, error:e.message }; }
    const r = patchBookCover(id, { coverCustom:url });
    if(r.ok) syncCoverImgs(id);
    return r;
  },
  async clearCustomCover(id){
    if(!isAdmin()) return { ok:false, error:'Only administrators can change book covers.' };
    const b = findBookData(id);
    if(!b) return { ok:false, error:'This book no longer exists.' };
    const r = patchBookCover(id, { coverCustom:null, coverPdf: b.coverPdf, coverKey: b.coverKey });   // null (not undefined) => legacy custom ignored
    if(!r.ok) return r;
    syncCoverImgs(id);
    if(isPdfBook(findBookData(id))){ await ensurePdfCover(id); syncCoverImgs(id); }   // fall back to the PDF's first page
    return { ok:true };
  },
  async refreshPdfCover(id){
    if(!isAdmin()) return { ok:false, error:'Only administrators can change book covers.' };
    const b = findBookData(id);
    if(!isPdfBook(b)) return { ok:false, error:'This book has no PDF to preview.' };
    const url = await ensurePdfCover(id, true); syncCoverImgs(id);
    return url ? { ok:true } : { ok:false, error:'Could not generate a preview from this PDF.' };
  },
});

/* ---------- live DOM updates (no reload) ---------- */
function syncCoverImgs(id){
  document.querySelectorAll('img.cover-img[data-cover-id]').forEach(img => {
    if(id && img.dataset.coverId !== id) return;
    const b = findBookData(img.dataset.coverId);
    if(!b) return;
    if(img.getAttribute('src') !== b.cover){ img.dataset.fb = ''; img.src = b.cover; }
    const box = img.closest('.cover-box'); if(box) box.classList.remove('is-loading');
  });
}
function hydrateCoverImg(img){
  const id = img.dataset.coverId, b = id && findBookData(id);
  if(!needsPdfCover(b)) return;
  const box = img.closest('.cover-box'); if(box) box.classList.add('is-loading');
  ensurePdfCover(id).then(() => syncCoverImgs(id)).catch(() => { if(box) box.classList.remove('is-loading'); });
}
const coverIO = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ coverIO.unobserve(e.target); hydrateCoverImg(e.target); } }), { rootMargin:'200px' })
  : null;
function registerCoverImg(img){
  if(!img || img.dataset.noHydrate || img.dataset.coverWatched || !img.dataset.coverId) return;
  img.dataset.coverWatched = '1';
  coverIO ? coverIO.observe(img) : hydrateCoverImg(img);
}

/* clean placeholder instead of a broken image (also used for failed/missing files) */
document.addEventListener('error', e => {
  const img = e.target;
  if(!img || img.tagName !== 'IMG' || !img.classList.contains('cover-img') || img.dataset.fb) return;
  img.dataset.fb = '1'; img.src = defaultCover(img.dataset.coverTitle || img.alt);
}, true);

document.addEventListener('DOMContentLoaded', () => {
  const scan = root => (root.matches && root.matches('img.cover-img') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('img.cover-img[data-cover-id]') : [])]).forEach(registerCoverImg);
  scan(document.body);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)))).observe(document.body, { childList:true, subtree:true });
});
/* another tab changed a cover -> refresh what's on screen */
window.addEventListener('storage', e => { if(['el_books', 'el_my_uploads', 'el_pending_admin'].includes(e.key)) syncCoverImgs(); });
