document.addEventListener('DOMContentLoaded', () => {
  const me = getCurrentUser();
  if(!me) return;
  const list = document.getElementById('mybooksList');
  let activeStatus = 'all';

  function render(){
    let uploads = getMyUploadsMine();
    if(activeStatus !== 'all') uploads = uploads.filter(u => u.status === activeStatus);

    list.innerHTML = uploads.length ? uploads.map(u => `
      <div class="mybook-card">
        ${coverBoxHTML(u, { size:'md' })}
        <div class="grow">
          <h4>${esc(u.title)}</h4>
          ${u.uploader ? `<div style="display:flex; align-items:center; gap:6px; margin:4px 0;"><img src="${u.uploader.avatar}" alt="" style="width:18px; height:18px; border-radius:50%; object-fit:cover;"><span style="font-size:12px; color:var(--ink-faint);">${esc(u.uploader.name)}</span></div>` : ''}
          <span class="badge badge-${u.status}">${u.status[0].toUpperCase()+u.status.slice(1)}</span>
          ${u.status === 'rejected' && u.rejectReason ? `<div style="font-size:12.5px; color:var(--red); margin-top:6px;">${esc(u.rejectReason)}</div>` : ''}
          <div class="row-stats"><span>${ICONS.eye} ${u.views} views</span><span>${ICONS.download} ${u.downloads} downloads</span></div>
        </div>
        <div class="actions">
          ${u.status === 'pending' ? `<button class="btn btn-secondary btn-sm" data-edit="${u.id}">Edit</button>` : ''}
          ${u.status === 'rejected' ? `<button class="btn btn-primary btn-sm" data-resubmit="${u.id}">Resubmit</button>` : ''}
          ${u.status === 'approved' ? `<a class="btn btn-secondary btn-sm" href="book-details.html?id=${encodeURIComponent(u.id)}">View</a>` : ''}
          <button class="btn btn-danger btn-sm" data-delete="${u.id}">Delete</button>
        </div>
      </div>`).join('') : `<div class="empty-state"><h4>Nothing here yet</h4><p>Books you upload will show up in this tab once they match its status.</p></div>`;
  }

  document.getElementById('mybooksTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    document.querySelectorAll('#mybooksTabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status;
    render();
  });

  const say = r => { if(!r.ok) showToast(r.error); return r.ok; };
  list.addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete]'), edit = e.target.closest('[data-edit]'), resub = e.target.closest('[data-resubmit]');
    if(del){
      if(!confirm('Delete this upload permanently? This also removes it from the library.')) return;
      if(say(BookService.removeOwn(del.dataset.delete))){ render(); showToast('Upload deleted'); }
    }
    if(edit){
      const current = getMyUploads().find(x => x.id === edit.dataset.edit);
      const title = prompt('Edit title:', current ? current.title : '');
      if(title !== null && say(BookService.editOwnTitle(edit.dataset.edit, title))){ render(); showToast('Upload updated'); }
    }
    if(resub && say(BookService.resubmit(resub.dataset.resubmit))){ render(); showToast('Resubmitted for review'); }
  });

  render();
});
