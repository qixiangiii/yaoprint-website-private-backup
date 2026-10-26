// 起元星启教育前台 — 导航、内容与动态状态
(async function () {
  document.documentElement.classList.add('js');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
  const text = (value = '') => escapeHTML(value);

  // 课程目录未公开时用于隐藏课程入口。
  let courseCatalogPublic = false;

  // 全站导航已在各页面 HTML 里静态写为同一套：模型社区 / 课程中心 / 教学文章 /
  // 知识中心 / 设备对比 / 学校合作 / 师资教研 / 作品成果 / 关于我们。
  // 这里只做兜底：老页面若残留旧 CTA 文案、或页面缺少高亮，按路径补齐，不再重写结构。
  function normalizeEducationNavigation() {
    const cta = $('.nav-cta .btn');
    if (cta) {
      if (cta.getAttribute('href') !== '/trial.html') cta.setAttribute('href', '/trial.html');
      if (cta.textContent.trim() !== '预约试听') cta.textContent = '预约试听';
    }
    const links = $('#navLinks');
    if (!links || links.querySelector('a.active') || links.querySelector('.nav-ecosystem.active')) return;
    const path = location.pathname;
    const tail = value => path.endsWith(value);
    const rules = [
      ['/explore/ecosystem.html', () => tail('/explore/ecosystem.html')],
      ['/courses/index.html', () => path.includes('/courses/') || tail('/course.html')],
      ['/news.html', () => tail('/news.html')],
      ['/knowledge.html', () => ['/knowledge.html', '/learning.html', '/materials.html', '/printer-types.html', '/support.html', '/software.html'].some(tail)
        || path.startsWith('/support/') || path.startsWith('/downloads/')],
      ['/printers.html', () => ['/printers.html', '/products.html', '/product.html', '/compare.html'].some(tail)
        || path.startsWith('/products/') || path.startsWith('/filament')],
      ['/solutions/school.html', () => path.startsWith('/solutions/')],
      ['/teachers.html', () => tail('/teachers.html')],
      ['/works.html', () => ['/works.html', '/competition.html'].some(tail) || path.startsWith('/explore/')],
      ['/about.html', () => ['/about.html', '/contact.html'].some(tail) || path.startsWith('/about/') || path.startsWith('/partners/')]
    ];
    const hit = rules.find(([, test]) => test());
    if (!hit) return;
    const link = links.querySelector(`a[href="${hit[0]}"]`);
    if (link) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  }
  // 课程未定稿时先按隐藏状态渲染，避免公开入口闪现。
  normalizeEducationNavigation();

  // 旧页面仍可能保留按学段编写的静态片段。教育品牌前台统一按学习基础
  // 表达，且只处理文本节点，不改动链接、接口参数或后台数据字段。
  function normalizeEducationCopy() {
    const path = location.pathname;
    const isEducation = document.body.classList.contains('education-page')
      || Boolean(document.querySelector('[data-education-view], .hero--education'))
      || /(^|\/)(courses|course|competition|learning|knowledge|materials|printer-types|software|works|news|trial|teachers|products|about|contact)\.html/.test(path)
      || path === '/' || path === '/index.html';
    if (!isEducation) return;
    const replacements = [
      [/初高中 3D 建模与打印培训/g, '3D 建模与打印学习平台'],
      [/初高中 3D 建模、3D 打印、科创项目与学校合作/g, '面向学生与学校的 3D 建模、3D 打印、科创项目服务'],
      [/初高中三维创作教育/g, '学生三维创作教育'],
      [/初一至高三/g, '零基础至有基础'], [/高一至高三/g, '有基础至项目'], [/初一至初三/g, '零基础入门'],
      [/初中 \/ 高中/g, '基础至项目'], [/初中\/高中/g, '基础至项目'], [/初高中/g, '学生与学校'],
      [/高中生/g, '学习者'], [/初中生/g, '学习者'], [/高中进阶班/g, '项目进阶'], [/初中基础班/g, '基础入门'],
      [/高中知识点/g, '项目知识点'], [/初中知识点/g, '基础知识点'], [/初中怎么教/g, '基础怎么教'], [/高中怎么教/g, '项目怎么教'],
      [/初中项目阶梯/g, '基础项目阶梯'], [/高中工程路径/g, '项目工程路径'], [/适合年级/g, '适合基础'],
      [/初中常规课/g, '基础常规课'], [/高中项目/g, '项目实践'], [/高中工程设计/g, '项目工程设计'],
      [/初中基础/g, '基础入门'], [/高中进阶/g, '项目进阶'],
      [/Junior High/g, '基础入门'], [/Senior High/g, '项目进阶'],
      [/7–9 年级/g, '简单入门'], [/10–12 年级/g, '普通进阶'],
      [/7-9 年级/g, '简单入门'], [/10-12 年级/g, '普通进阶'],
      [/初中/g, '简单入门'], [/高中/g, '普通进阶']
    ];
    const apply = node => {
      if (node.nodeType === Node.TEXT_NODE) {
        let value = node.nodeValue;
        replacements.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); });
        if (value !== node.nodeValue) node.nodeValue = value;
      } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) {
        node.childNodes.forEach(apply);
      }
    };
    apply(document.body);
    if (document.title) document.title = document.title.replace(/初高中 3D 建模与打印培训/g, '3D 建模与打印学习平台');
  }
  normalizeEducationCopy();
  function redirectHiddenCourseLinks() {
    if (courseCatalogPublic) return;
    $$('a[href]:not([data-course-link-hidden])').forEach(link => {
      let path = '';
      try { path = new URL(link.href, location.href).pathname; } catch { return; }
      if (!path.startsWith('/courses/') && path !== '/course.html') return;
      // 顶部导航是统一后的固定入口，不参与课程入口隐藏。
      if (link.closest('#navLinks')) return;
      const listItem = link.closest('li');
      if (listItem && listItem.querySelectorAll('a').length === 1) {
        listItem.remove();
        return;
      }
      link.href = '/trial.html?subject=' + encodeURIComponent('课程方案咨询');
      link.dataset.courseLinkHidden = 'true';
      if (/课程中心|课程体系|查看课纲|查看项目课程|查看校本课纲/.test(link.textContent)) {
        link.textContent = '课程方案咨询';
      }
    });
  }

  new MutationObserver(() => {
    normalizeEducationCopy();
    redirectHiddenCourseLinks();
  }).observe(document.body, { childList: true, subtree: true });

  function setupEducationNavGroups() {
    const groups = $$('[data-nav-group]');
    if (!groups.length) return;
    const closeAll = except => groups.forEach(group => {
      if (group === except) return;
      const button = $('.education-nav-trigger', group);
      const panel = $('.education-nav-panel', group);
      if (button && panel) { button.setAttribute('aria-expanded', 'false'); panel.hidden = true; }
    });
    groups.forEach(group => {
      const button = $('.education-nav-trigger', group);
      const panel = $('.education-nav-panel', group);
      if (!button || !panel) return;
      const setOpen = open => { button.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
      button.addEventListener('click', event => { event.stopPropagation(); const open = panel.hidden; closeAll(group); setOpen(open); });
      group.addEventListener('mouseenter', () => { if (matchMedia('(min-width: 1025px)').matches) { closeAll(group); setOpen(true); } });
      group.addEventListener('mouseleave', () => { if (matchMedia('(min-width: 1025px)').matches) setOpen(false); });
      group.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); button.focus(); } });
    });
    document.addEventListener('click', event => { if (!event.target.closest('[data-nav-group]')) closeAll(); });
  }
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

  async function applyCourseCatalogVisibility() {
    try {
      const settings = await fetchJSON('/api/settings');
      courseCatalogPublic = settings.course_catalog_visibility === 'public';
    } catch {
      courseCatalogPublic = false;
    }
    normalizeEducationNavigation(courseCatalogPublic);
    setupEducationNavGroups();
    redirectHiddenCourseLinks();
  }
  applyCourseCatalogVisibility();

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
    const scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    scrim.hidden = true;
    scrim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scrim);
    const setOpen = open => {
      navLinks.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
      scrim.hidden = !open;
      document.body.classList.toggle('nav-open', open);
    };
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    scrim.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && navLinks.classList.contains('open')) setOpen(false); });
    navLinks.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024 && navLinks.classList.contains('open')) setOpen(false); });
  }

  async function setupPlatformMenu() {
    const menu = $('[data-platform-menu]');
    const button = $('.nav-ecosystem', menu || document);
    const dropdown = $('[data-platform-dropdown]', menu || document);
    if (!menu || !button || !dropdown) return;
    const panel = $('#platformMenu', menu);
    const isDesktop = () => window.matchMedia('(min-width: 1025px)').matches;
    let hideTimer = null;
    const setOpen = open => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    };
    setOpen(false);
    button.addEventListener('click', event => {
      event.preventDefault();
      setOpen(panel.hidden);
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', event => { if (!menu.contains(event.target)) setOpen(false); });
    menu.addEventListener('mouseenter', () => { if (isDesktop()) setOpen(true); });
    menu.addEventListener('mouseleave', () => {
      if (!isDesktop()) return;
      hideTimer = setTimeout(() => setOpen(false), 140);
    });
    try {
      const platforms = (await fetchJSON('/api/ecosystem-platforms')).filter(platform => (platform.platform_type || 'model') !== 'ai');
      dropdown.innerHTML = platforms.length ? platforms.map(platform => `<a class="platform-dropdown-item" href="${text(platform.url)}" target="_blank" rel="noopener noreferrer external" referrerpolicy="strict-origin-when-cross-origin"><span class="platform-mark">${platform.cover ? `<img src="${text(platform.cover)}" alt="">` : ''}</span><span class="platform-dropdown-copy"><b>${text(platform.name)}</b><span>${text(platform.description || '第三方官方模型生态')}</span></span><span class="platform-external" aria-hidden="true">↗</span></a>`).join('') : '<p class="platform-dropdown-empty">相关平台信息暂未发布</p>';
    } catch {
      dropdown.innerHTML = '<p class="platform-dropdown-empty">生态平台加载失败，请稍后重试</p>';
    }
  }
  setupPlatformMenu();

  // 滚动入场
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  // 网格子项错落入场：同组卡片依次浮现，避免整块同时淡入
  const staggerGroups = [
    '.pathway-grid', '.video-grid', '.works-preview-grid', '.quick-grid',
    '.feature-grid', '.course-grid', '.product-grid', '.ecosystem-grid',
    '.scene-grid', '.rule-grid', '.project-proof-grid', '.media-grid'
  ];
  staggerGroups.forEach(selector => $$(selector).forEach(group => {
    [...group.children].forEach((child, index) => {
      if (child.classList.contains('reveal')) return;
      child.classList.add('reveal');
      if (index) child.style.setProperty('--reveal-delay', Math.min(index, 5) * 60 + 'ms');
    });
  }));
  $$('.reveal').forEach(element => observer.observe(element));

  // 全站可替换信息：只更新标记过 data-setting / data-social 的节点，避免影响内页独立文案。
  async function applySettings() {
    try {
      const settings = await fetchJSON('/api/settings');
      $$('[data-setting]').forEach(element => {
        const value = settings[element.dataset.setting];
        // 后台留空的项保留页面默认文案，避免把备案号、版权等信息清成空白
        if (value !== undefined && value !== '') element.textContent = value;
      });
      $$('[data-social]').forEach(element => {
        const value = settings[`social_${element.dataset.social}`];
        if (value && value !== '#') element.href = value;
        else element.hidden = true;
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

    // 各条轮播文案行数不同，锁定已出现的最大高度，避免切换时下方内容跳动。
    let lockedHeight = 0;
    const go = next => {
      if (!slides.length) return;
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.hidden = !active;
        slide.setAttribute('aria-hidden', String(!active));
      });
      const activeSlide = slides[index];
      if (activeSlide) {
        lockedHeight = Math.max(lockedHeight, activeSlide.offsetHeight);
        if (lockedHeight) swiper.style.minHeight = `${lockedHeight}px`;
      }
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
      // 9px 的 Ⅱ 字符在圆钮里几乎看不见，改用矢量图标保证任何缩放下都清晰
      const playIcon = '<svg viewBox="0 0 8 10" aria-hidden="true"><path d="M0 0l8 5-8 5z" fill="currentColor"/></svg>';
      const pauseIcon = '<svg viewBox="0 0 8 10" aria-hidden="true"><rect x="0" y="0" width="2.6" height="10" rx=".6" fill="currentColor"/><rect x="5.4" y="0" width="2.6" height="10" rx=".6" fill="currentColor"/></svg>';
      control.setAttribute('aria-label', paused ? '播放轮播' : '暂停轮播');
      control.innerHTML = paused ? playIcon : pauseIcon;
      control.addEventListener('click', () => {
        paused = !paused;
        control.innerHTML = paused ? playIcon : pauseIcon;
        control.setAttribute('aria-label', paused ? '播放轮播' : '暂停轮播');
        start();
      });
      dotsWrap.appendChild(control);
    }
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        swiper.style.minHeight = '';
        lockedHeight = 0;
        const activeSlide = slides[index];
        if (activeSlide) {
          lockedHeight = activeSlide.offsetHeight;
          swiper.style.minHeight = `${lockedHeight}px`;
        }
      }, 180);
    });
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
    if (swiper.dataset.staticHero === 'true') {
      initHero(swiper);
      return;
    }
    try {
      const heroes = await fetchJSON('/api/heroes');
      if (heroes.length) {
        swiper.innerHTML = `${heroes.map((hero, index) => {
          const heading = `${text(hero.title || '')}${hero.highlight ? `<br><span class="green">${text(hero.highlight)}</span>` : ''}`;
          const image = hero.image || '/img/scenes/education.jpg';
          return `<div class="hero-slide" ${index ? 'hidden' : ''}>
            <div class="hero-media"><img class="hero-img" src="${text(image)}" alt="${text(hero.subtitle || hero.title || '起元星启课程')}"></div>
            <div class="hero-overlay">
              ${hero.tag ? `<span class="hero-tag">${text(hero.tag)}</span>` : ''}
              <h1>${heading}</h1>
              ${hero.subtitle ? `<p class="hero-sub">${text(hero.subtitle)}</p>` : ''}
              ${hero.lead ? `<p class="hero-lead">${text(hero.lead)}</p>` : ''}
              <div class="hero-actions">
                ${hero.link && hero.link_text ? `<a href="${text(hero.link)}" class="btn btn-light btn-lg">${text(hero.link_text)}</a>` : ''}
                ${hero.link2 && hero.link2_text ? `<a href="${text(hero.link2)}" class="btn hero-secondary btn-lg">${text(hero.link2_text)}</a>` : ''}
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
              ${product.card_image || product.hero_image ? `<img src="${text(product.card_image || product.hero_image)}" alt="${text(product.name)}" loading="lazy">` : '<div class="image-fallback">起元星启<br>设备参考</div>'}
            </div>
          </a>
          <div class="product-body">
            <h3><a href="product.html?slug=${encodeURIComponent(product.slug)}">${text(product.name)}</a></h3>
            <div class="slogan">${text(product.subtitle || '')}</div>
            <p>${text((product.description || '').slice(0, 80))}</p>
            ${product.price ? `<div class="product-price">${text(product.price)}</div>` : ''}
            <div class="product-actions">
              <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="btn btn-outline btn-sm">查看教学参考</a>
              <a href="trial.html?subject=${encodeURIComponent(product.name)}" class="btn btn-dark btn-sm">课程设备咨询</a>
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
      const news = await fetchJSON('/api/news?limit=8');
      if (!news.length) {
        if (featured) renderState(featured, 'empty', '暂时没有文章。');
        if (listTarget) listTarget.innerHTML = '';
        return;
      }
      if (featured) {
        const item = news[0];
        const cover = item.cover || '/img/quick/printer.jpg';
        featured.href = `news.html?slug=${encodeURIComponent(item.slug)}`;
        featured.innerHTML = `<div class="cover" style="background-image:url('${text(cover)}')"></div><div class="news-featured-content"><div class="tag">${text(item.tag || '文章')}</div><h3>${text(item.title)}</h3><p>${text(item.summary || '')}</p><span class="btn btn-light btn-sm">阅读全文</span></div>`;
      }
      if (listTarget) listTarget.innerHTML = news.slice(1).map(item => `<a href="news.html?slug=${encodeURIComponent(item.slug)}" class="news-item"><div class="thumb" style="background-image:url('${text(item.cover || '/img/scenes/diy.jpg')}')"></div><div><h4>${text(item.title)}</h4><div class="date">${text((item.published_at || '').slice(0, 10))}</div></div></a>`).join('');
    } catch (error) {
      if (featured) renderState(featured, 'error', '文章加载失败，请稍后重试。', loadNews);
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
      target.innerHTML = list.map(item => {
        const hasUrl = item.url && item.url !== '#';
        return `<a href="${text(hasUrl ? item.url : '/explore/creators.html')}" class="video-card" ${hasUrl ? 'target="_blank" rel="noopener"' : ''}><div class="video-thumb">${item.cover ? `<img src="${text(item.cover)}" alt="${text(item.title)}" loading="lazy">` : ''}</div><div class="video-body"><span class="video-source">${text(item.source || '创作者内容')}</span><strong>${text(item.title)}</strong><span class="video-link">${hasUrl ? '打开视频网页 ↗' : '进入创作者内容 ↗'}</span></div></a>`;
      }).join('');
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
      target.className = 'download-grid';
      target.innerHTML = list.map(item => `<article class="download-card"><div class="download-mark">↓</div><div class="download-copy"><div class="source">${text(item.platform || '全平台')}</div><h4>${text(item.name)}</h4><p>版本 ${text(item.version || '待发布')} · ${text(item.size || '在线资料')}</p></div><a class="btn btn-outline btn-sm" href="${text(item.url && item.url !== '#' ? item.url : '/downloads/index.html')}" ${item.url && item.url !== '#' ? 'target="_blank" rel="noopener"' : ''}>查看资料</a></article>`).join('');
    } catch (error) { renderState(target, 'error', '下载资源加载失败。', loadDownloads); }
  }
  loadDownloads();

  async function loadEcosystemPlatforms() {
    const targets = $$('[data-ecosystem-platforms]');
    if (!targets.length) return;
    const typeLabel = type => type === 'ai' ? 'AI 建模平台' : '第三方模型平台';
    const emptyCopy = () => '相关平台信息暂未发布。';
    const noteCopy = type => type === 'ai'
      ? 'AI 建模平台的商标、生成内容与服务归其权利人所有；本站只提供官方跳转，不镜像生成器或模型文件，也不宣称官方合作。生成网格仍须检查封闭、壁厚、尺寸与切片。'
      : '第三方平台的商标、内容与服务归其各自权利人所有；本站仅提供跳转与课程选型参考，不镜像模型文件或图片。';
    const renderCards = (list, type) => list.map(platform => `<article class="ecosystem-card">${platform.cover ? `<img class="ecosystem-card-cover" src="${text(platform.cover)}" alt="${text(platform.name)} 官网首页">` : ''}<div class="ecosystem-card-body"><div><span class="badge gray">${text(typeLabel(platform.platform_type || type || 'model'))}</span><h3>${text(platform.name)}</h3><p>${text(platform.description)}</p><small>${text(platform.brand_owner || '外部生态入口')}</small></div><a class="btn btn-dark btn-sm" href="${text(platform.url)}" target="_blank" rel="noopener noreferrer external" referrerpolicy="strict-origin-when-cross-origin">${text(platform.link_label || '访问官方平台')} ↗</a></div></article>`).join('');
    try {
      const platforms = await fetchJSON('/api/ecosystem-platforms');
      targets.forEach(target => {
        const filter = target.getAttribute('data-ecosystem-platforms') || 'model';
        const list = platforms.filter(platform => {
          const type = platform.platform_type || 'model';
          if (filter === 'ai') return type === 'ai';
          if (filter === 'all') return true;
          return type !== 'ai';
        });
        if (!list.length) return renderState(target, 'empty', emptyCopy(filter));
        target.innerHTML = renderCards(list, filter) + `<p class="ecosystem-note">${noteCopy(filter)}</p>`;
      });
    } catch {
      targets.forEach(target => renderState(target, 'error', '生态平台加载失败，请稍后重试。', loadEcosystemPlatforms));
    }
  }
  loadEcosystemPlatforms();

  async function loadCourses() {
    const target = $('[data-courses]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const courses = await fetchJSON('/api/courses');
      if (!courses.length) return renderState(target, 'empty', '课程信息正在完善中。');
      const card = course => `<article class="course-card"><div class="course-card-meta"><span>${text(course.category)}</span><span>${text(course.grade_min)}–${text(course.grade_max)} 年级</span></div><h3>${text(course.title)}</h3><p class="course-subtitle">${text(course.subtitle)}</p><p>${text(course.description)}</p><div class="course-card-footer"><span>${course.total_sessions ? `${text(course.total_sessions)} 课次` : '定制课次'}${course.total_hours ? ` · ${text(course.total_hours)} 课时` : ''}</span><a class="btn btn-outline btn-sm" href="course.html?slug=${encodeURIComponent(course.slug)}">查看课纲</a></div></article>`;
      const group = (title, lead, list) => list.length ? `<section class="course-group"><div class="course-group-head"><h3>${text(title)}</h3><p>${text(lead)}</p></div><div class="course-grid">${list.map(card).join('')}</div></section>` : '';
      const starter = courses.filter(course => course.category === '基础入门');
      const regular = courses.filter(course => course.category === '普通进阶');
      const project = courses.filter(course => course.category === '项目进阶' || course.category === '项目实践');
      const other = courses.filter(course => !['基础入门', '普通进阶', '项目进阶', '项目实践'].includes(course.category));
      target.innerHTML = [
        group('简单入门', '先出件、积木建模、生活物件与基础教具。', starter),
        group('普通进阶', '尺寸、切片、结构、装配和学科模型。', regular),
        group('项目实践', '需求拆解、参数化、功能测试、作品集与科创答辩。', project),
        group('假期与学校', '按基础、课时和设备条件定制学习方案。', other)
      ].join('') || courses.map(card).join('');
    } catch { renderState(target, 'error', '课程加载失败，请稍后重试。', loadCourses); }
  }
  loadCourses();

  async function loadEducationCases() {
    const target = $('[data-education-cases]');
    if (!target) return;
    renderState(target, 'loading');
    try {
      const cases = await fetchJSON('/api/education-cases');
      if (!cases.length) return renderState(target, 'empty', '教学案例信息暂未发布。');
      target.innerHTML = cases.map(item => `<article class="content-card"><div class="content-card-body"><span class="badge">${text(item.case_kind || '教学案例')}</span><h3>${text(item.title)}</h3><p>${text(item.solution || item.challenge || '')}</p><div class="hero-actions">${(item.outcomes || []).map(outcome => `<span class="badge gray">${text(outcome)}</span>`).join('')}</div></div></article>`).join('');
    } catch { renderState(target, 'error', '教学案例加载失败，请稍后重试。', loadEducationCases); }
  }
  loadEducationCases();

  // 试听预约表单由 education.js 异步渲染，直接绑定会拿不到元素，改用 document 委托。
  document.addEventListener('submit', async event => {
    const trialForm = event.target.closest ? event.target.closest('#trialForm') : null;
    if (!trialForm) return;
    event.preventDefault(); const tip = $('#trialTip');
    try { const data = Object.fromEntries(new FormData(trialForm).entries()); data.privacy_consent = trialForm.querySelector('[name="privacy_consent"]').checked; data.privacy_version = '2026.09'; const result = await fetchJSON('/api/enrollment-inquiries', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); if (!result.ok) throw new Error(); trialForm.reset(); tip.textContent='✓ 已收到预约信息，课程顾问将联系监护人确认试听安排。'; tip.className='form-tip'; tip.style.display='block'; } catch (error) { tip.textContent='提交失败，请检查监护人姓名、电话及隐私同意项。'; tip.className='form-tip error'; tip.style.display='block'; }
  });

  // 联系表单：从产品/套装链接中预填
  const form = $('#contactForm');
  if (form) {
    const query = new URLSearchParams(location.search);
    const message = $('[name="message"]', form);
    const topic = query.get('subject') || query.get('product');
    if (topic && message && !message.value) message.value = `我想咨询：${topic}。`;
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
  const contentDetailPath = {
    material: 'filament/material.html', case: 'solutions/case.html', tutorial: 'support/article.html',
    faq: 'support/article.html', model: 'explore/project.html', project: 'explore/project.html',
    service: 'support/article.html', channel: 'content.html', policy: 'content.html'
  };
  const contentHref = item => `/${contentDetailPath[item.type] || 'content.html'}?type=${encodeURIComponent(item.type)}&slug=${encodeURIComponent(item.slug)}`;

  async function loadContentList() {
    const target = $('[data-content-list]');
    if (!target) return;
    const type = target.dataset.contentList;
    renderState(target, 'loading');
    try {
      const list = await fetchJSON(`/api/content?type=${encodeURIComponent(type)}`);
      if (!list.length) return renderState(target, 'empty', '暂时没有已发布内容。');
      target.innerHTML = list.map(item => `<article class="content-card reveal"><a class="content-cover" href="${contentHref(item)}">${item.cover ? `<img src="${text(item.cover)}" alt="${text(item.title)}" loading="lazy">` : '<div class="image-fallback">起元星启<br>内容中心</div>'}</a><div class="content-card-body">${item.tag ? `<span class="badge">${text(item.tag)}</span>` : ''}<h3><a href="${contentHref(item)}">${text(item.title)}</a></h3><p>${text(item.summary || '')}</p><a class="btn-link" href="${contentHref(item)}">查看详情</a></div></article>`).join('');
      $$('.reveal', target).forEach(element => observer.observe(element));
    } catch { renderState(target, 'error', '内容加载失败，请稍后重试。', loadContentList); }
  }
  loadContentList();

  // 内容详情页对外展示的补充信息：只认白名单字段，键名统一中文。
  // 内部配置字段（cta / source_url / video_url 等）不展示。
  const metaLabels = {
    nozzle: '喷嘴温度', bed: '热床温度', strength: '韧性', compatible: '兼容设备',
    industry: '适用行业', result: '项目成效', products: '应用设备',
    product: '适用范围', read_time: '阅读时长', level: '难度', duration: '耗时',
    author: '作者', material: '建议材料',
    version: '版本', effective_date: '生效日期',
    response: '响应时效'
  };
  const metaListMarkup = meta => {
    const rows = Object.entries(meta || {})
      .filter(([key, value]) => metaLabels[key] && value !== '' && value != null)
      .map(([key, value]) => `<div><dt>${metaLabels[key]}</dt><dd>${text(value)}</dd></div>`);
    return rows.length ? `<dl class="meta-list">${rows.join('')}</dl>` : '';
  };
  // cta 是站内路由配置，只接受相对路径，避免被写成 javascript: 或外站地址
  const ctaHref = (meta, title) => {
    const fallback = `/contact.html?subject=${encodeURIComponent(title)}`;
    const raw = meta && typeof meta.cta === 'string' ? meta.cta.trim() : '';
    if (!raw) return fallback;
    const clean = raw.replace(/^\/+/, '');
    return /^[a-z0-9][a-z0-9\-_/]*(\.html)?(\?[a-z0-9=&%\-_]+)?$/i.test(clean) ? `/${clean}` : fallback;
  };

  async function loadContentDetail() {
    const target = $('[data-content-detail]');
    if (!target) return;
    const params = new URLSearchParams(location.search), type = params.get('type'), slug = params.get('slug');
    if (!type || !slug) return renderState(target, 'empty', '请选择需要查看的内容。');
    renderState(target, 'loading');
    try {
      const item = await fetchJSON(`/api/content/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`);
      document.title = `${item.title} — 起元星启`;
      target.innerHTML = `<article class="content-detail">${item.cover ? `<img class="content-detail-cover" src="${text(item.cover)}" alt="${text(item.title)}">` : ''}<div class="content-detail-copy">${item.tag ? `<span class="badge">${text(item.tag)}</span>` : ''}<h1>${text(item.title)}</h1><p class="content-detail-summary">${text(item.summary || '')}</p><div class="content-detail-body">${text(item.body || '').split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('')}</div>${metaListMarkup(item.meta)}<a class="btn btn-primary" href="${ctaHref(item.meta, item.title)}">咨询相关方案</a></div></article>`;
    } catch { renderState(target, 'error', '该内容不存在或尚未发布。'); }
  }
  loadContentDetail();

  const ticketForm = $('#ticketForm');
  if (ticketForm) ticketForm.addEventListener('submit', async event => {
    event.preventDefault(); const tip = $('#ticketTip');
    try { const result = await fetchJSON('/api/tickets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(new FormData(ticketForm).entries())) }); if (!result.ok) throw new Error(); ticketForm.reset(); tip.textContent='✓ 工单已提交，技术团队将在 1 个工作日内联系您。'; tip.className='form-tip'; tip.style.display='block'; }
    catch { tip.textContent='提交失败，请检查联系方式后重试。'; tip.className='form-tip error'; tip.style.display='block'; }
  });

  /* ---- 点击涟漪（v12 动效层） ----
     滚动入场沿用站内既有的 .reveal 机制（见上方 IntersectionObserver），
     这里只补一层按下反馈，并在下方为网格子项补错落的入场延迟。 */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) document.addEventListener('pointerdown', event => {
    const host = event.target.closest('.btn');
    if (!host || host.disabled || host.dataset.noRipple === 'true') return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.1;
    const ripple = document.createElement('span');
    ripple.className = 'yq-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    host.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  /* ---- 首页创作实验室（v14 内容型视觉） ---- */
  const lab = document.querySelector('.innovation-lab');
  if (lab) {
    const labItems = [
      {
        step: 'STEP 01', label: 'MODEL', title: '把需求画进三维空间',
        description: '先定义尺寸、用途和约束，再把草图变成可编辑的 3D 模型。',
        image: '/img/education/gen-cad-modeling.jpg', alt: '学生正在电脑上完成三维建模设计', metric: '100% 可检查'
      },
      {
        step: 'STEP 02', label: 'PRINT', title: '让数字模型开始真实成型',
        description: '理解切片参数、材料选择和打印过程，看到作品一层层长出来。',
        image: '/img/education/hero-creative-lab.jpg', alt: '学生正在创客教室里观察3D打印作品', metric: '过程可视化'
      },
      {
        step: 'STEP 03', label: 'TEST', title: '用真实测试发现问题',
        description: '记录承重、配合、强度和失败位置，让每一次判断都有依据。',
        image: '/media/bridge-structure.jpg', alt: '学生正在给3D打印桥梁模型做承重测试', metric: '数据可追溯'
      },
      {
        step: 'STEP 04', label: 'ITERATE', title: '修改后再做出更好的版本',
        description: '根据测试结果调整结构，完成更稳定、更好用的实体作品。',
        image: '/media/phone-stand.jpg', alt: '3D打印手机支架成品和设计草图', metric: '版本可比较'
      }
    ];
    const tabs = $$('.lab-tab', lab);
    const frame = $('.lab-frame', lab);
    const image = $('[data-lab-image]', lab);
    const nodes = {
      title: $('[data-lab-title]', lab), description: $('[data-lab-description]', lab),
      step: $('[data-lab-step]', lab), label: $('[data-lab-label]', lab), metric: $('[data-lab-metric]', lab)
    };
    labItems.forEach(item => { const preload = new Image(); preload.src = item.image; });
    const setLabItem = index => {
      const item = labItems[index];
      if (!item || !frame || !image) return;
      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      frame.classList.add('is-switching');
      setTimeout(() => {
        image.src = item.image;
        image.alt = item.alt;
        Object.entries(nodes).forEach(([key, node]) => { if (node) node.textContent = item[key]; });
        frame.classList.remove('is-switching');
      }, reducedMotion ? 0 : 150);
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setLabItem(index));
      tab.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const next = (index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length;
        tabs[next].focus();
        setLabItem(next);
      });
    });
  }

})();
