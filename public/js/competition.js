(function () {
  const root = document.querySelector('[data-competition-list]');
  if (!root) return;
  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const link = (url, label, className = 'btn btn-outline btn-sm') => url
    ? `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
    : '';
  const card = item => {
    const officialUrl = item.official_url || item.url || '';
    const image = item.cover || item.image || '/img/education/makerspace-commons.webp';
    const imageType = item.image_type || '相关方向图片';
    const imageNote = imageType === '相关方向图片'
      ? '相关方向图片，赛事信息以官方页面为准'
      : `${imageType}，具体信息以官方页面为准`;
    return `<article class="competition-card">
      <a class="competition-card-media" href="${esc(officialUrl)}" target="_blank" rel="noopener noreferrer" aria-label="打开${esc(item.title)}核验入口">
        <img src="${esc(image)}" alt="${esc(item.image_alt || `${item.category || ''}方向图片`)}" loading="lazy">
        <span>${esc(item.category || '竞赛方向')}</span>
        <b>${esc(imageType)}</b>
      </a>
      <div class="competition-card-body">
        <h3>${esc(item.title)}</h3>
        <p class="competition-card-caption">${esc(imageNote)}</p>
        <dl>
          <div><dt>适合项目</dt><dd>${esc(item.fit || '请结合课程顾问建议确定')}</dd></div>
          <div><dt>组织单位</dt><dd>${esc(item.organizer || '以官方通知为准')}</dd></div>
          <div><dt>信息说明</dt><dd>${esc(item.competition_status || item.status || '相关方向信息')}</dd></div>
        </dl>
        <div class="competition-card-foot">
          <small>${esc(item.source_label || item.source || '官方信息入口')} · 信息更新时间 ${esc(item.verified_at || item.verified || '以页面显示为准')}</small>
          <div class="competition-card-actions">
            ${link(officialUrl, '查看官方入口')}
            ${link(item.notice_url, '官方通知')}
            ${link(item.registration_url, '报名入口', 'btn btn-primary btn-sm')}
          </div>
        </div>
      </div>
    </article>`;
  };
  root.innerHTML = '<div class="competition-loading" role="status">正在读取官方入口目录…</div>';
  fetch('/api/competitions')
    .then(response => {
      if (!response.ok) throw new Error('竞赛入口暂时无法读取');
      return response.json();
    })
    .then(rows => {
      root.innerHTML = rows.length ? rows.map(card).join('') : '<div class="empty-panel">暂无进行中的竞赛入口，新赛季开放后会在这里公布。</div>';
    })
    .catch(() => {
      const fallback = Array.isArray(window.QIYUAN_COMPETITIONS) ? window.QIYUAN_COMPETITIONS : [];
      root.innerHTML = fallback.length
        ? fallback.map(card).join('')
        : '<div class="empty-panel">竞赛入口暂时无法读取，请稍后刷新；规则与报名信息请以主办方官网为准。</div>';
    });
})();
