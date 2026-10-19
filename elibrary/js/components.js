function starRow(rating){
  return `<span class="rating">${ICONS.star}${rating}</span>`;
}

function categoryCardHTML(cat){
  return `<a class="cat-card reveal" href="search.html?cat=${encodeURIComponent(cat.id)}">
    <div class="cat-icon">${deptIconHTML(cat.name)}</div>
    <h4>${esc(cat.name)}</h4>
    <div class="code">${esc(cat.abbr)} · ${catBookCount(cat.id)} book${catBookCount(cat.id)!==1?'s':''}</div>
  </a>`;
}

function bookCardHTML(book){
  return `<a class="book-card reveal" href="book-details.html?id=${encodeURIComponent(book.id)}">
    <div class="book-cover-wrap cover-box">
      ${coverImgHTML(book, { cls:'book-cover', alt:book.title + ' cover' })}
      ${book.verified ? `<span class="badge badge-verified">${ICONS.check} Verified</span>` : ''}
    </div>
    <div class="book-card-body">
      <h4>${esc(book.title)}</h4>
      <div class="dept">${esc(book.department)} · ${esc(book.university)}</div>
      ${starRow(book.rating)}
      <div class="book-card-foot">
        <span class="stat">${ICONS.download}${book.downloads.toLocaleString()}</span>
        <span class="stat">${book.fileType} · ${book.sizeMb}MB</span>
      </div>
    </div>
  </a>`;
}

