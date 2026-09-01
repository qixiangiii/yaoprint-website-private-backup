(function () {
  const main = document.querySelector('[data-page-main]');
  if (!main) return;
  const meta = document.documentElement.dataset;
  const title = meta.title || '曜印内容中心';
  const lead = meta.lead || '围绕设备、材料、创作与服务，找到适合你的下一步。';
  const type = meta.contentType || '';
  const detail = meta.detail === 'true';
  const sectionTitle = meta.sectionTitle || title;
  const sectionLead = meta.sectionLead || lead;
  const prefix = location.pathname.split('/').length > 2 ? '../' : '';
  const contact = prefix + 'contact.html';
  const detailMarkup = `<section class="page-hero"><div class="container"><span class="kicker">YAOPRINT CONTENT</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section"><div class="container"><div data-content-detail></div></div></section>`;
  const ticketMarkup = `<section class="page-hero"><div class="container"><span class="kicker">SERVICE TICKET</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section soft"><div class="container"><form id="ticketForm" class="form-wrap"><h2>提交技术服务请求</h2><p class="mt-1 mb-3" style="color:var(--gray-4)">请提供尽可能完整的信息，方便技术团队快速定位问题。</p><div class="form-row"><div><label for="ticketName">姓名 *</label><input id="ticketName" name="name" required></div><div><label for="ticketPhone">电话</label><input id="ticketPhone" name="phone" type="tel"></div></div><div class="form-row"><div><label for="ticketEmail">邮箱</label><input id="ticketEmail" name="email" type="email"></div><div><label for="ticketProduct">设备型号</label><input id="ticketProduct" name="product"></div></div><div class="form-row"><div><label for="ticketSerial">设备序列号</label><input id="ticketSerial" name="serial_no"></div><div><label for="ticketSubject">问题分类</label><input id="ticketSubject" name="subject" placeholder="打印异常、连接、维护等"></div></div><div class="form-row single"><div><label for="ticketDescription">问题描述 *</label><textarea id="ticketDescription" name="description" required placeholder="请描述设备现象、发生频率和已尝试的操作"></textarea></div></div><button class="btn btn-primary btn-lg" type="submit">提交工单</button><div id="ticketTip" class="form-tip"></div></form></div></section>`;
  const staticCards = meta.cards ? JSON.parse(meta.cards) : [];
  const staticMarkup = `<section class="page-hero"><div class="container"><span class="kicker">YAOPRINT</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section"><div class="container"><div class="section-head"><span class="kicker">${sectionTitle}</span><h2>${sectionTitle}</h2><p>${sectionLead}</p></div><div class="content-grid">${staticCards.map(card => `<article class="content-card"><div class="content-cover">${card.image ? `<img src="${card.image}" alt="${card.title}">` : '<div class="image-fallback">曜印<br>服务</div>'}</div><div class="content-card-body"><span class="badge">${card.tag || '曜印服务'}</span><h3>${card.title}</h3><p>${card.desc}</p><a class="btn-link" href="${card.link || contact}">${card.cta || '了解更多'}</a></div></article>`).join('')}</div></div></section><section class="cta-band"><div class="container"><h2>需要更具体的建议？</h2><p>告诉我们你的项目、设备或材料需求，曜印顾问会为你匹配合适方案。</p><a class="btn btn-lg" href="${contact}">联系曜印顾问</a></div></section>`;
  const listMarkup = `<section class="page-hero"><div class="container"><span class="kicker">YAOPRINT CONTENT</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section"><div class="container"><div class="section-head"><span class="kicker">${type || 'CONTENT'}</span><h2>${sectionTitle}</h2><p>${sectionLead}</p></div><div class="content-grid" data-content-list="${type}"></div></div></section>`;
  main.innerHTML = detail ? detailMarkup : meta.ticket === 'true' ? ticketMarkup : type ? listMarkup : staticMarkup;
})();
