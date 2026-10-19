document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('detailsRoot');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const book = id ? getBookById(id) : null;
  const backBtn = `<button class="btn btn-ghost btn-sm" id="backBtn" style="margin-bottom:14px;"><span style="display:inline-flex; transform:rotate(180deg);">${ICONS.chevronRight}</span> Back</button>`;
  const goBack = () => { if(document.referrer && history.length > 1) history.back(); else window.location.href = 'search.html'; };

  if(!book){
    document.getElementById('pageTitle').textContent = 'Book not found — Athenaeum';
    root.innerHTML = `${backBtn}<div class="empty-state"><h4>We couldn't find that book</h4><p>It may have been removed, or the link is incorrect.</p>
      <a class="btn btn-primary" href="search.html" style="margin-top:16px;">Browse all books</a></div>`;
    document.getElementById('backBtn').addEventListener('click', goBack);
    return;
  }

  document.getElementById('pageTitle').textContent = book.title + ' — Athenaeum';
  const cat = catById(book.categoryId);
  const isFav = getFavorites().includes(book.id);
  const uploader = book.uploader || { name:'Unknown', avatar:defaultCover('?') };
  const deptText = book.department && (!cat || book.department !== cat.name) ? ` · ${esc(book.department)}` : '';

  root.innerHTML = `
    ${backBtn}
    <div class="bd-layout">
      <div class="bd-main">
        <div class="bd-top">
          <div class="bd-side">
            <div class="cover-box details-cover bd-cover">${coverImgHTML(book, { alt:book.title + ' cover' })}</div>
            <div class="book-actions">
              <button class="book-action book-action--primary" id="previewBtn"><span class="book-action__icon">${ICONS.eye}</span><span class="book-action__label">${book.fileType === 'EPUB' ? 'Open EPUB' : 'Read Online'}</span></button>
              <button class="book-action" id="downloadBtn"><span class="book-action__icon">${ICONS.download}</span><span class="book-action__label">Download ${esc(book.fileType)}</span></button>
              <button class="book-action fav-toggle" data-book-id="${esc(book.id)}"><span class="book-action__icon">${ICONS.heart}</span><span class="book-action__label fav-label">${isFav ? 'Saved to Favorites' : 'Add to Favorites'}</span></button>
            </div>
          </div>

          <div class="bd-info">
            <h1 class="details-title">${esc(book.title)}</h1>
            <div class="details-meta-row">
              <span>${ICONS.user} ${esc(book.author)}</span>
              <span>${starRow(book.rating)} (${book.reviews} reviews)</span>
              ${book.verified ? `<span class="badge badge-verified">${ICONS.check} Verified</span>` : ''}
            </div>
            <div class="details-meta-row">
              <span>${ICONS.university} ${esc(book.university)}</span>
              <span>${ICONS.book} ${esc(cat ? cat.name : book.department)}${deptText}</span>
              <span>${ICONS.file} ${esc(book.fileType)} · ${esc(book.sizeMb)}MB</span>
              ${book.pages > 0 ? `<span>${ICONS.layers} ${book.pages} pages</span>` : ''}
              <span>${ICONS.clock} Uploaded ${timeAgo(new Date(book.uploadedOn).getTime())}</span>
            </div>

            <h3 class="bd-h3">Description</h3>
            <p class="desc-block">${esc(book.description)}</p>

            <div class="bd-cards">
              <div class="info-card">
                <h5>Statistics</h5>
                <div class="stat-row"><span>Views</span><b id="statViews">${(book.views||0).toLocaleString()}</b></div>
                <div class="stat-row"><span>Downloads</span><b id="statDownloads">${(book.downloads||0).toLocaleString()}</b></div>
                <div class="stat-row"><span>Rating</span><b>${esc(book.rating)} / 5.0</b></div>
              </div>
              <div class="info-card">
                <h5>Uploaded by</h5>
                <div class="uploader-row">
                  <img src="${esc(uploader.avatar)}" alt="">
                  <div>
                    <div class="name">${esc(uploader.name)} ${uploader.verified ? `<span class="badge badge-verified" style="margin-left:4px; transform:translateY(-1px); display:inline-flex;">${ICONS.check} Verified</span>` : ''}</div>
                    <div class="role">${esc(uploader.university || '')}${uploader.university && uploader.department ? ' · ' : ''}${esc(uploader.department || uploader.role || '')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="bd-discussion" aria-labelledby="discussionHeading">
        <h3 class="bd-h3" id="discussionHeading">Discussion (<span id="commentCount">0</span>)</h3>
        <div id="commentComposer"></div>
        <div id="commentsList"></div>
      </section>
    </div>

    <div class="section" id="relatedSection" style="padding-top:20px;">
      <div class="section-head"><h2 style="font-size:20px;">Related Books</h2></div>
      <div class="carousel" id="relatedCarousel"></div>
    </div>`;

  document.getElementById('backBtn').addEventListener('click', goBack);
  initFavButtons(root);

  const related = getBooks().filter(b => b.id !== book.id && b.categoryId === book.categoryId).slice(0, 6);
  if(related.length) document.getElementById('relatedCarousel').innerHTML = related.map(bookCardHTML).join('');
  else document.getElementById('relatedSection').style.display = 'none';

  /* ---------- stats, read & download ---------- */
  function bumpStat(field){
    const all = getBooks(), b = all.find(x => x.id === book.id);
    if(!b) return;
    b[field] = (b[field] || 0) + 1;
    saveBooks(all);
    const el = document.getElementById(field === 'views' ? 'statViews' : 'statDownloads');
    if(el) el.textContent = b[field].toLocaleString();
  }
  const viewedKey = 'el_viewed_' + book.id;
  if(!sessionStorage.getItem(viewedKey)){ sessionStorage.setItem(viewedKey, '1'); bumpStat('views'); }
  pushRecent(book.id);

  let busy = false;
  async function guarded(fn){ if(busy) return; busy = true; try { await fn(); } catch(e){ console.error(e); showToast('Something went wrong. Please try again.'); } finally { setTimeout(() => { busy = false; }, 800); } }
  document.getElementById('previewBtn').addEventListener('click', () => guarded(() => openBookFile(book)));
  document.getElementById('downloadBtn').addEventListener('click', () => guarded(async () => {
    const me = getCurrentUser();
    if(!me){ showToast('Please log in to download'); setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent('book-details.html?id=' + book.id), 900); return; }
    if(!(await downloadBookFile(book))) return;
    const updated = registerDownload(book.id);
    if(updated) document.getElementById('statDownloads').textContent = updated.downloads.toLocaleString();
  }));

  /* ---------- comments ---------- */
  const currentUser = getCurrentUser();
  const composer = document.getElementById('commentComposer');
  composer.innerHTML = currentUser ? `
    <div class="comment-input-row">
      <img src="${esc(currentUser.avatar)}" alt="">
      <div style="flex:1;">
        <textarea id="commentInput" maxlength="1000" placeholder="Ask a question or leave a note for other readers..."></textarea>
        <div class="comment-attach-row" style="padding-left:0;">
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">${ICONS.image} Attach image
            <input type="file" id="commentImgInput" accept="image/*" style="display:none;">
          </label>
          <button class="btn btn-primary btn-sm" id="postCommentBtn">Post comment</button>
          <img id="attachPreview" class="attach-preview" style="display:none;">
        </div>
      </div>
    </div>` : `
    <div class="panel" style="display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:18px;">
      <span style="font-size:14px; color:var(--ink-soft);">Log in to join the discussion.</span>
      <a class="btn btn-primary btn-sm" href="login.html?redirect=${encodeURIComponent('book-details.html?id=' + book.id)}">Log In</a>
    </div>`;

  let attachedImage = null;
  const imgInput = document.getElementById('commentImgInput'), preview = document.getElementById('attachPreview');
  if(imgInput) imgInput.addEventListener('change', async () => {
    const file = imgInput.files[0];
    if(!file) return;
    try { attachedImage = await resizeImage(file, 800); preview.src = attachedImage; preview.style.display = 'block'; }
    catch(err){ attachedImage = null; imgInput.value = ''; preview.style.display = 'none'; showToast(err.message); }
  });

  const owns = c => commentIsOwner(c, currentUser);
  const replyLabel = n => `${ICONS.reply} Reply${n ? ` (${n})` : ''}`;

  function likeBtn(c){
    const liked = currentUser && (c.likedBy || []).includes(currentUser.id);
    return `<button class="like-btn ${liked ? 'liked' : ''}" data-id="${esc(c.id)}">${ICONS.heart} ${likeCount(c)}</button>`;
  }
  function commentHTML(c){
    return `<div class="comment" data-id="${esc(c.id)}">
      <img src="${esc(c.avatar)}" alt="">
      <div class="comment-body">
        <div class="comment-head"><b>${esc(c.user)}</b><time>${timeAgo(c.time)}${c.edited ? ' · edited' : ''}</time></div>
        <div class="comment-text">${esc(c.text)}</div>
        ${c.image && /^data:image\//.test(c.image) ? `<img src="${esc(c.image)}" alt="" style="max-width:220px; border-radius:12px; margin-top:8px;">` : ''}
        <div class="comment-actions">
          ${likeBtn(c)}
          <button class="reply-btn" data-id="${esc(c.id)}">${replyLabel(c.replies.length)}</button>
          ${owns(c) ? `<button class="edit-btn" data-id="${esc(c.id)}">${ICONS.edit} Edit</button><button class="delete-btn" data-id="${esc(c.id)}">${ICONS.trash} Delete</button>` : ''}
        </div>
        <div class="reply-block">
          ${c.replies.map(r => `
            <div class="comment" data-id="${esc(r.id)}" style="border-bottom:none; padding:10px 0;">
              <img src="${esc(r.avatar)}" alt="">
              <div class="comment-body">
                <div class="comment-head"><b>${esc(r.user)}</b><time>${timeAgo(r.time)}${r.edited ? ' · edited' : ''}</time></div>
                <div class="comment-text">${esc(r.text)}</div>
                <div class="comment-actions">
                  ${likeBtn(r)}
                  ${owns(r) ? `<button class="edit-btn" data-id="${esc(r.id)}">${ICONS.edit} Edit</button><button class="delete-btn" data-id="${esc(r.id)}">${ICONS.trash} Delete</button>` : ''}
                </div>
              </div>
            </div>`).join('')}
          <div class="reply-input" id="replyInput-${esc(c.id)}" style="display:none; margin-top:10px;">
            <textarea maxlength="1000" placeholder="Write a reply..." style="width:100%; border:1px solid var(--border); border-radius:12px; padding:10px 12px; background:var(--surface-2); color:var(--ink); min-height:44px;"></textarea>
            <button class="btn btn-primary btn-sm" style="margin-top:8px;" data-submit-reply="${esc(c.id)}">Reply</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  const openReplies = new Set();
  function renderComments(){
    const comments = getComments(book.id).sort((a, b) => a.time - b.time);
    document.getElementById('commentCount').textContent = comments.reduce((n, c) => n + 1 + c.replies.length, 0);
    document.getElementById('commentsList').innerHTML = comments.map(commentHTML).join('') || `<p style="color:var(--ink-faint); font-size:13.5px; padding:16px 0;">No comments yet — be the first to start the discussion.</p>`;
    openReplies.forEach(cid => { const b = document.getElementById('replyInput-' + cid); if(b) b.style.display = 'block'; });
  }
  const fail = r => { if(!r.ok) showToast(r.error); return r.ok; };
  const needLogin = () => { if(currentUser) return false; window.location.href = 'login.html?redirect=' + encodeURIComponent('book-details.html?id=' + book.id); return true; };

  const postBtn = document.getElementById('postCommentBtn');
  if(postBtn) postBtn.addEventListener('click', () => {
    if(postBtn.disabled) return;
    postBtn.disabled = true;
    const input = document.getElementById('commentInput');
    const r = safely(() => CommentService.add(book.id, input.value, attachedImage), 'Could not post your comment. Storage may be full.') || { ok:false, error:'Could not post your comment.' };
    if(fail(r)){
      input.value = ''; attachedImage = null; preview.style.display = 'none'; imgInput.value = '';
      renderComments(); showToast('Comment posted');
    }
    setTimeout(() => { postBtn.disabled = false; }, 500);
  });

  document.getElementById('commentsList').addEventListener('click', (e) => {
    const like = e.target.closest('.like-btn'), reply = e.target.closest('.reply-btn'),
          del = e.target.closest('.delete-btn'), edit = e.target.closest('.edit-btn'), sendReply = e.target.closest('[data-submit-reply]');

    if(like){ if(needLogin()) return; if(fail(CommentService.toggleLike(like.dataset.id))) renderComments(); }
    if(reply){
      if(needLogin()) return;
      const cid = reply.dataset.id, box = document.getElementById('replyInput-' + cid);
      const show = box.style.display === 'none';
      box.style.display = show ? 'block' : 'none';
      show ? openReplies.add(cid) : openReplies.delete(cid);
    }
    if(edit){
      const found = findComment(edit.dataset.id);
      if(!found.item) return;
      const t = prompt('Edit your comment:', found.item.text);
      if(t === null) return;
      if(fail(CommentService.edit(edit.dataset.id, t))){ renderComments(); showToast('Comment updated'); }
    }
    if(del){
      if(!confirm('Delete this comment?')) return;
      if(fail(CommentService.remove(del.dataset.id))){ renderComments(); showToast('Comment deleted'); }
    }
    if(sendReply){
      if(needLogin() || sendReply.disabled) return;
      sendReply.disabled = true;
      const cid = sendReply.dataset.submitReply, ta = document.getElementById('replyInput-' + cid).querySelector('textarea');
      const r = CommentService.reply(cid, ta.value);
      sendReply.disabled = false;
      if(fail(r)){ ta.value = ''; openReplies.add(cid); renderComments(); showToast('Reply posted'); }
    }
  });

  renderComments();
  initScrollReveal();
});
