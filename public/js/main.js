// 曜印 YAOPRINT — 前台交互与动态内容
(async function () {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
  const text = (value = '') => escapeHTML(value);

  function renderState(target, type, message, retry) {
    if (!target) return;
    const copy = type === 'loading' ? '正在加载内容…' : message;
    target.innerHTML = `<div class="content-state ${type}"><p>${text(copy || '暂时没有内容')}</p>${retry ? '<button type="button" class="btn btn-outline btn-sm" data-retry>重新加载</button>' : ''}</div>`;
    const button = $('[data-retry]', target);
    if (button && retry) button.addEventListener('click', retry);
  }

  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`请求失败 (${response.status})`);
    return response.json();
  }

  // 导航滚动状态与移动端菜单
  const nav = $('.navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  const menuBtn = $('#menuToggle');
  const navLinks = $('#navLinks');
  if (menuBtn && navLinks) {
    const setOpen = open => {
      navLinks.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    };
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    $$('a', navLinks).forEach(link => link.addEventListener('click', () => setOpen(false)));
  }

  // 滚动入场
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  $$('.reveal').forEach(element => observer.observe(element));

  // 全站可替换信息：只更新标记过 data-setting / data-social 的节点，避免影响内页独立文案。
  async function applySettings() {
    try {
      const settings = await fetchJSON('/api/settings');
      $$('[data-setting]').forEach(element => {
        const value = settings[element.dataset.setting];
        if (value !== undefined && value !== '') element.textContent = value;
      });
      $$('[data-social]').forEach(element => {
        const value = settings[`social_${element.dataset.social}`];
        if (value && value !== '#') element.href = value;
      });
    } catch {
      // 设置接口不可用时保留页面中的默认信息。
    }
  }
  applySettings();

  // 首页 Hero：自动轮播、键盘、暂停/播放、减少动态效果。
  function initHero(swiper) {
    if (!swiper || swiper.dataset.initialized === 'true') return;
    swiper.dataset.initialized = 'true';
    const slides = $$('.hero-slide', swiper);
    const dotsWrap = $('.hero-pagination', swiper);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;
    let timer = null;
    let paused = reduceMotion;

    const go = next => {
      if (!slides.length) return;
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.hidden = !active;
        slide.setAttribute('aria-hidden', String(!active));
      });
      $$('.dot', dotsWrap || document).forEach((dot, i) => {
        const active = i === index;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => {
      stop();
      if (!paused && slides.length > 1) timer = setInterval(() => go(index + 1), 5500);
    };

    if (dotsWrap && slides.length > 1) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot';
        dot.setAttribute('aria-label', `切换到第 ${i + 1} 张轮播`);
        dot.addEventListener('click', () => { go(i); start(); });
        dotsWrap.appendChild(dot);
      });
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'hero-control';
      control.setAttribute('aria-label', paused ? '播放轮播' : '暂停轮播');
      control.textContent = paused ? '▶' : 'Ⅱ';
      control.addEventListener('click', () => {
        paused = !paused;
        control.textContent = paused ? '▶' : 'Ⅱ';
        control.setAttribute('aria-label', paused ? '播放轮播' : '暂停轮播');
        start();
      });
      dotsWrap.appendChild(control);
    }
    swiper.tabIndex = 0;
    swiper.setAttribute('role', 'region');
    swiper.setAttribute('aria-label', '精选产品轮播');
    swiper.addEventListener('mouseenter', stop);
    swiper.addEventListener('mouseleave', start);
    swiper.addEventListener('focusin', stop);
    swiper.addEventListener('focusout', start);
    swiper.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); start(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); start(); }
    });
    go(0);
    start();
  }

  async function loadHeroes() {
    const swiper = $('[data-cms-heroes]');
    if (!swiper) return;
    try {
      const heroes = await fetchJSON('/api/heroes');
      if (heroes.length) {
        swiper.innerHTML = `${heroes.map((hero, index) => {
          const heading = `${text(hero.title || '')}${hero.highlight ? `<br><span class="green">${text(hero.highlight)}</span>` : ''}`;
          return `<div class="hero-slide" ${index ? 'hidden' : ''}>
            <img class="hero-img" src="${text(hero.image || '')}" alt="${text(hero.subtitle || hero.title || '曜印精选')}">
            <div class="hero-overlay">
              ${hero.tag ? `<span class="hero-tag">${text(hero.tag)}</span>` : ''}
              <h1>${heading}</h1>
              ${hero.subtitle ? `<p class="hero-sub">${text(hero.subtitle)}</p>` : ''}
              ${hero.lead ? `<p class="hero-lead">${text(hero.lead)}</p>` : ''}
              <div class="hero-actions">
                ${hero.link && hero.link_text ? `<a href="${text(hero.link)}" class="btn btn-light btn-lg">${text(hero.link_text)}</a>` : ''}
                ${hero.link2 && hero.link2_text ? `<a href="${text(hero.link2)}" class="btn btn-outline btn-lg" style="color:#fff;border-color:#fff">${text(hero.link2_text)}</a>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}<div class="hero-pagination"></div>`;
      }
    } catch {
      // 使用 HTML 中保留的默认轮播，确保接口暂不可用时首页仍可访问。
    }
    initHero(swiper);
  }
  loadHeroes();

  // 产品列表与动态分类筛选
  async function loadProducts() {
    const target = $('[data-products]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/products');
      if (!list.length) return renderState(target, 'empty', '暂时没有发布产品。');
      target.innerHTML = list.map(product => `
        <article class="product-card reveal" data-type="${text(product.cat_slug || '')}">
          <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="product-visual-link" aria-label="查看 ${text(product.name)}">
            <div class="product-visual">
              ${product.tag ? `<span class="product-tag ${product.tag === '热销' || product.tag === '性价比' ? 'alt' : ''}">${text(product.tag)}</span>` : ''}
              ${product.card_image || product.hero_image ? `<img src="${text(product.card_image || product.hero_image)}" alt="${text(product.name)}" loading="lazy">` : '<div class="image-fallback">曜印<br>3D</div>'}
            </div>
          </a>
          <div class="product-body">
            <h3><a href="product.html?slug=${encodeURIComponent(product.slug)}">${text(product.name)}</a></h3>
            <div class="slogan">${text(product.subtitle || '')}</div>
            <p>${text((product.description || '').slice(0, 80))}</p>
            ${product.price ? `<div class="product-price">${text(product.price)}</div>` : ''}
            <div class="product-actions">
              <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="btn btn-outline btn-sm">了解更多</a>
              <a href="contact.html?product=${encodeURIComponent(product.name)}" class="btn btn-dark btn-sm">立即咨询</a>
            </div>
          </div>
        </article>`).join('');
      $$('.reveal', target).forEach(element => observer.observe(element));
      setupProductFilters(list);
    } catch (error) {
      renderState(target, 'error', '产品数据加载失败，请稍后重试。', loadProducts);
    }
  }

  async function setupProductFilters(products) {
    const filterBar = $('.filter-bar');
    if (!filterBar) return;
    try {
      const categories = await fetchJSON('/api/categories');
      filterBar.innerHTML = `<button type="button" class="active" data-filter="all">全部产品</button>${categories.map(category => `<button type="button" data-filter="${text(category.slug)}">${text(category.name)}</button>`).join('')}`;
      filterBar.onclick = event => {
        const button = event.target.closest('button[data-filter]');
        if (!button) return;
        $$('button', filterBar).forEach(item => item.classList.toggle('active', item === button));
        const type = button.dataset.filter;
        $$('[data-type]').forEach(card => { card.hidden = type !== 'all' && card.dataset.type !== type; });
      };
    } catch {
      // 分类接口不可用时保留产品列表，不阻断浏览。
    }
  }
  loadProducts();

  async function loadNews() {
    const featured = $('[data-news-featured]');
    const listTarget = $('[data-news-list]');
    if (!featured && !listTarget) return;
    if (featured) renderState(featured, 'loading');
    try {
      const news = await fetchJSON('/api/news?limit=5');
      if (!news.length) {
        if (featured) renderState(featured, 'empty', '暂时没有新闻。');
        if (listTarget) listTarget.innerHTML = '';
        return;
      }
      if (featured) {
        const item = news[0];
        const cover = item.cover || '/img/quick/printer.jpg';
        featured.innerHTML = `<div class="cover" style="background-image:url('${text(cover)}')"></div><div class="tag">${text(item.tag || '品牌新闻')}</div><h3>${text(item.title)}</h3><p>${text(item.summary || '')}</p><a href="news.html?slug=${encodeURIComponent(item.slug)}" class="btn btn-light btn-sm">了解更多</a>`;
      }
      if (listTarget) listTarget.innerHTML = news.slice(1).map(item => `<a href="news.html?slug=${encodeURIComponent(item.slug)}" class="news-item"><div class="thumb" style="background-image:url('${text(item.cover || '/img/scenes/diy.jpg')}')"></div><div><h4>${text(item.title)}</h4><div class="date">${text((item.published_at || '').slice(0, 10))}</div></div></a>`).join('');
    } catch (error) {
      if (featured) renderState(featured, 'error', '新闻加载失败，请稍后重试。', loadNews);
    }
  }
  loadNews();

  async function loadReviews() {
    const target = $('[data-reviews]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/reviews');
      target.className = 'review-grid';
      if (!list.length) return renderState(target, 'empty', '暂时没有媒体评测。');
      target.innerHTML = list.map(item => `<a class="review-card" href="${text(item.url || 'news.html')}" ${item.url ? 'target="_blank" rel="noopener"' : ''} style="background-image:url('${text(item.cover || '/img/hero/h2d.jpg')}')"><div class="source">${text(item.source)}</div><h4>${text(item.title)}</h4><p>${text(item.excerpt || '')}</p><span class="more">阅读全文 →</span></a>`).join('');
    } catch (error) { renderState(target, 'error', '媒体评价加载失败。', loadReviews); }
  }
  loadReviews();

  async function loadVideos() {
    const target = $('[data-videos]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/videos');
      if (!list.length) return renderState(target, 'empty', '暂时没有视频。');
      target.innerHTML = list.map(item => `<a href="${text(item.url || 'explore.html')}" class="video-card" ${item.url && item.url !== '#' ? 'target="_blank" rel="noopener"' : ''}><div class="video-thumb">${item.cover ? `<img src="${text(item.cover)}" alt="${text(item.title)}" loading="lazy">` : ''}</div><div class="video-body">${text(item.title)}</div></a>`).join('');
    } catch (error) { renderState(target, 'error', '视频加载失败。', loadVideos); }
  }
  loadVideos();

  async function loadScenes() {
    const target = $('[data-scenes]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/scenes');
      if (!list.length) return renderState(target, 'empty', '暂时没有场景内容。');
      target.innerHTML = list.map(item => `<a href="${text(item.link || 'explore.html')}" class="scene-card"><div class="bg" style="background-image:url('${text(item.cover || '/img/scenes/diy.jpg')}')"></div><div class="content"><div class="icon">${text(item.icon || '✦')}</div><h3>${text(item.title)}</h3><p>${text(item.desc || '')}</p></div></a>`).join('');
    } catch (error) { renderState(target, 'error', '场景加载失败。', loadScenes); }
  }
  loadScenes();

  async function loadAcademy() {
    const target = $('[data-academy]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/academy');
      if (!list.length) return renderState(target, 'empty', '暂时没有入门资源。');
      target.innerHTML = list.map(item => `<a href="${text(item.link || 'academy.html')}" class="scene-card"><div class="bg" style="background-image:url('${text(item.cover || '/img/cards/academy.jpg')}')"></div><div class="content"><div class="icon">${text(item.icon || '📘')}</div><h3>${text(item.title)}</h3><p>${text(item.desc || '')}</p></div></a>`).join('');
    } catch (error) { renderState(target, 'error', '入门资源加载失败。', loadAcademy); }
  }
  loadAcademy();

  async function loadDownloads() {
    const target = $('[data-downloads]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON('/api/downloads');
      if (!list.length) return renderState(target, 'empty', '暂时没有可下载内容。');
      target.innerHTML = list.map(item => `<article class="media-card"><div class="source">${text(item.platform || '全平台')} · ${text(item.version || '')}</div><h4>${text(item.name)}</h4><p>大小：${text(item.size || '在线服务')}</p><a href="${text(item.url && item.url !== '#' ? item.url : 'contact.html?subject=software')}" ${item.url && item.url !== '#' ? 'target="_blank" rel="noopener"' : ''}>获取下载 →</a></article>`).join('');
    } catch (error) { renderState(target, 'error', '下载资源加载失败。', loadDownloads); }
  }
  loadDownloads();

  // 联系表单：从产品/套装链接中预填
  const form = $('#contactForm');
  if (form) {
    const query = new URLSearchParams(location.search);
    const message = $('[name="message"]', form);
    if (query.get('product') && message && !message.value) message.value = `我想咨询 ${query.get('product')} 的选型和报价。`;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const tip = $('#formTip');
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const result = await fetchJSON('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!result.ok) throw new Error('提交失败');
        if (tip) { tip.style.display = 'block'; tip.className = 'form-tip'; tip.textContent = '✓ 提交成功，我们将在 1 个工作日内联系您。'; }
        form.reset();
      } catch (error) {
        if (tip) { tip.style.display = 'block'; tip.className = 'form-tip error'; tip.textContent = '提交失败，请稍后再试。'; }
      }
    });
  }

  const subForm = $('#subForm');
  if (subForm) {
    subForm.addEventListener('submit', async event => {
      event.preventDefault();
      const tip = $('#subTip');
      try {
        const result = await fetchJSON('/api/subs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('[name="email"]', subForm).value }) });
        if (!result.ok) throw new Error('订阅失败');
        if (tip) { tip.style.display = 'block'; tip.className = 'form-tip'; tip.textContent = result.dup ? '✓ 该邮箱已订阅。' : '✓ 订阅成功，感谢关注！'; }
        subForm.reset();
      } catch (error) {
        if (tip) { tip.style.display = 'block'; tip.className = 'form-tip error'; tip.textContent = '订阅失败，请检查邮箱后重试。'; }
      }
    });
  }
  // 高亮当前导航
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.startsWith('http')) return;
    const target = href.replace(/^.*\//, '');
    if (path.endsWith(target)) a.classList.add('active');
  });
})();
