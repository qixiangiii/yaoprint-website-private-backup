// 起元星启 — 作品展厅、模型库、主题合集与行业案例的渲染层
// 数据来自 showcase-data.js（window.SHOWCASE）；无数据时退化为静态说明，不整页报错。
(async function () {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const view = root.dataset.showcase;
  const data = window.SHOWCASE || { works: [], process: [], scoring: [], collections: [], cases: [] };
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const query = new URLSearchParams(location.search);
  const api = async url => { const r = await fetch(url); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || '请求失败'); return d; };
  const hero = (kicker, title, lead) => `<section class="page-hero"><div class="container"><span class="kicker">${kicker}</span><h1>${title}</h1><p>${lead}</p></div></section>`;
  const stats = items => `<section class="stats-band"><div class="container">${items.map(([value, unit, label]) => `<div class="stat"><b>${esc(value)}${unit ? `<i>${esc(unit)}</i>` : ''}</b><span>${esc(label)}</span></div>`).join('')}</div></section>`;
  const sectionHead = (kicker, title, lead) => `<div class="section-head"><span class="kicker">${esc(kicker)}</span><h2>${esc(title)}</h2>${lead ? `<p>${esc(lead)}</p>` : ''}</div>`;
  const list = values => `<ul class="model-detail-list">${values.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`;
  const badges = values => `<div class="hero-actions">${values.map(v => `<span class="badge gray">${esc(v)}</span>`).join('')}</div>`;
  const table = (head, rows) => `<div class="compare-table-wrap"><table class="compare-table"><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const link = (href, label, cls = 'btn btn-outline btn-sm') => `<a class="${cls}" href="${href}">${esc(label)}</a>`;
  const skillCount = [...new Set(data.works.flatMap(w => w.skills))].length;
  const testCount = data.works.reduce((sum, w) => sum + w.tests.length, 0);

  /* ---------- 作品展厅 ---------- */
  const workCard = w => `<article class="model-card" data-type="${esc(w.type)}"><a href="/works.html?model=${encodeURIComponent(w.slug)}" aria-label="查看${esc(w.title)}作品档案"><img src="${esc(w.image)}" alt="${esc(w.alt)}" loading="lazy"></a><div class="model-card-body"><span class="badge">${esc(w.tag)}</span><h3><a href="/works.html?model=${encodeURIComponent(w.slug)}">${esc(w.title)}</a></h3><p>${esc(w.copy)}</p><small>${esc(w.meta)}</small><div class="model-card-footer"><span>建模 ${esc(w.modelTime)} · 打印 ${esc(w.printTime)} · ${esc(w.weight)}</span>${link(`/works.html?model=${encodeURIComponent(w.slug)}`, '查看档案')}</div></div></article>`;

  const renderWorks = async () => {
    const types = ['全部', ...new Set(data.works.map(w => w.type))];
    root.innerHTML = [
      hero('STUDENT WORKS', '作品展厅：从小件到项目', '六件可复现的课堂模型、四份过程档案和一套公开的评价量表。每件作品都写明约束、参数、失败位置与测试记录，看的是一个作品怎样被做出来，而不是只看最后一张照片。'),
      stats([[String(data.works.length + data.process.length), '', '个作品与过程档案'], [String(testCount), '项', '可复现的测试记录'], [String(skillCount), '个', '技能标签'], ['5', '维', '作品评价量表']]),
      `<section class="section"><div class="container"><div class="model-library-head"><div><span class="kicker">Starter model library</span><h2>适合课堂练习的模型</h2></div><p>下列模型用于教学设计与选题参考，参数是教学起点，不是打印成功承诺。正式出件前请按自己的设备、耗材与场地条件复测。</p></div><div class="filter-bar" data-filter>${types.map((t, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div><div class="model-grid" data-grid>${data.works.map(workCard).join('')}</div><p class="curriculum-note">数字模型已做可打印检查，实体效果需在课堂中验证。作品分类、课时与难度按起元星启教学设计标注；不宣称对应任何评奖结果。</p></div></section>`,
      `<section class="section soft"><div class="container">${sectionHead('Process evidence', '过程档案：比成品更能说明问题', '四份档案对应打印链路上的四个关键检查点。我们不建议把失败件丢掉——它是答辩时最有说服力的材料。')}<div class="feature-grid">${data.process.map(p => `<article class="detail-panel"><span class="badge">${esc(p.kicker)}</span><h3>${esc(p.title)}</h3><p>${esc(p.look)}</p><p><b>为什么记：</b>${esc(p.why)}</p>${list(p.record)}<p class="image-source-note">${esc(p.note)}</p></article>`).join('')}</div></div></section>`,
      `<section class="section"><div class="container">${sectionHead('Assessment', '评价量表：五个维度都看证据', '课堂评价不只看成品外观。每一项都要求对应的证据材料，学生自己写标准，教师只审核标准是否可测。')}${table(['维度', '权重', '看什么证据', '不合格的样子'], data.scoring.map(s => [s.dim, s.weight, s.evidence, s.bad]))}</div></section>`,
      `<section class="section soft"><div class="container">${sectionHead('Published cases', '教学案例与项目成果', '公开内容已按授权或匿名范围处理；学生姓名、学校信息与作品文件不在公开范围内。')}<div class="content-grid" data-cases><div class="empty-panel">案例加载中…</div></div></div></section>`,
      `<section class="cta-band"><div class="container"><h2>把你自己的作品放进这个展厅</h2><p>课堂作品、社团项目或自主创作都可以提交。审核通过后按你的授权范围公开展示。</p><div class="hero-actions hero-actions--center"><a class="btn btn-light btn-lg" href="/explore/submit.html">提交作品</a><a class="btn btn-lg" href="/trial.html">预约试听</a></div></div></section>`
    ].join('');

    const grid = $('[data-grid]');
    $$('[data-filter] button').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-filter] button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      $$('[data-type]', grid).forEach(card => { card.hidden = !(type === '全部' || card.dataset.type === type); });
    }));

    try {
      const rows = await api('/api/education-cases');
      $('[data-cases]').innerHTML = rows.length ? rows.map(c => `<article class="content-card work-card">${c.cover ? `<img class="work-card-cover" src="${esc(c.cover)}" alt="${esc(c.title)}" loading="lazy">` : '<div class="work-card-cover work-placeholder">项目成果</div>'}<div class="content-card-body"><div style="align-self:flex-start"><span class="badge">${esc(c.case_kind || '教学案例')}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.challenge || '')}</p><p>${esc(c.solution || '')}</p>${badges(c.outcomes || [])}<small class="image-source-note">${esc([c.grade_band, c.duration_text].filter(Boolean).join(' · '))}　公开内容已按授权或匿名范围处理。</small></div></article>`).join('') : '<div class="empty-panel">案例资料正在整理中。</div>';
    } catch (e) { $('[data-cases]').innerHTML = '<div class="empty-panel">案例加载失败，请稍后刷新。</div>'; }
  };

  /* ---------- 作品档案详情 ---------- */
  const renderWorkDetail = w => {
    root.innerHTML = [
      `<section class="section course-page"><div class="container"><div class="course-hero-detail"><div class="course-hero-copy"><span class="kicker">${esc(w.type)}作品档案 · ${esc(w.level)}</span><h1>${esc(w.title)}</h1><p class="course-hero-subtitle">${esc(w.copy)}</p><div class="course-facts"><div><span>适合基础</span><b>${esc(w.level)}</b></div><div><span>预计建模</span><b>${esc(w.modelTime)}</b></div><div><span>预计打印</span><b>${esc(w.printTime)}</b></div><div><span>单件重量</span><b>${esc(w.weight)}</b></div></div><p class="image-source-note">尺寸 ${esc(w.dims)} · 材料 ${esc(w.material)} · ${esc(String(w.hours))} 课时 · 技能 ${esc(w.skills.join('、'))}</p><p class="model-status">数字模型已检查 · 实体打印效果待课堂验证</p><div class="hero-actions"><a class="btn btn-primary" href="/trial.html?model=${encodeURIComponent(w.slug)}">预约课堂，把它做出来</a>${link('/works.html', '返回作品展厅', 'btn btn-outline')}</div></div><img class="course-detail-cover" src="${esc(w.image)}" alt="${esc(w.alt)}"></div><div class="model-detail-sections"><section><h3>项目背景</h3><p>${esc(w.background)}</p></section><section><h3>学习目标</h3><p>${esc(w.goal)}</p></section><section><h3>任务约束</h3>${list(w.constraints)}</section><section><h3>建模关键步骤</h3>${list(w.steps)}</section><section><h3>容易失败的位置</h3>${list(w.failures)}</section><section><h3>可以迁移到哪里</h3>${list(w.transfer)}</section></div></div></section>`,
      `<section class="section soft"><div class="container">${sectionHead('Print settings', '推荐打印参数', '同一模型换设备、换耗材都需要重测。下表是课堂默认起点，不是唯一正确答案。')}${table(['参数', '取值', '为什么这样设'], w.settingsRows)}<div class="mt-3"><span class="badge">技能标签</span> ${w.skills.map(s => `<span class="badge gray">${esc(s)}</span>`).join(' ')}</div></div></section>`,
      `<section class="section"><div class="container">${sectionHead('Iteration log', '改版记录：每次只改一个变量', '两轮改版，每一轮都要写清问题、改动和证据。没有证据的改版只能算尝试。')}<div class="portfolio-timeline">${w.iterations.map(it => `<article><b>${esc(it.round)}</b><p><b>问题：</b>${esc(it.issue)}</p><p><b>改动：</b>${esc(it.change)}</p><p><b>证据：</b>${esc(it.evidence)}</p></article>`).join('')}</div></div></section>`,
      `<section class="section soft"><div class="container">${sectionHead('Test record', '测试记录', '测试项由学生自己提出，教师只检查方法是否可重复、指标是否可测。')}${table(['测试项', '方法', '目标', '实测'], w.tests.map(t => [t.item, t.method, t.target, t.actual]))}</div></section>`,
      `<section class="section"><div class="container">${sectionHead('Defense', '答辩三问', '每次作品答辩固定追问三个问题：为什么这样做、数据说明什么、下一步改哪里。')}<div class="portfolio-timeline">${w.defend.map((d, i) => `<article><b>Q${i + 1} · ${esc(d.q)}</b><p>${esc(d.a)}</p></article>`).join('')}</div></div></section>`,
      `<section class="section soft"><div class="container"><div class="course-guidance"><h2>继续学习与相关阅读</h2><div class="course-guidance-list"><div><b>对应课程</b><p><a class="btn-link" href="/course.html?slug=${encodeURIComponent(w.course.slug)}">${esc(w.course.title)} →</a></p></div>${w.articles.map(a => `<div><b>延伸阅读</b><p><a class="btn-link" href="/news.html?slug=${encodeURIComponent(a.slug)}">${esc(a.title)} →</a></p></div>`).join('')}</div><p class="competition-disclaimer">文件与许可：本页为起元星启原创教学模型，暂不提供可直接生产的模型文件。课堂导出格式通常为 STL/3MF，具体文件会在完成实体验证并确认授权后发布。</p></div></div></section>`
    ].join('');
  };

  /* ---------- 模型与项目库 ---------- */
  const renderModels = () => {
    const rows = [
      ...data.works.map(w => [w.title, `${w.type}模型`, w.level, w.modelTime, w.printTime, w.skills.slice(0, 2).join('、')]),
      ...data.process.map(p => [p.title, '过程档案', '通用', '—', '—', '过程记录'])
    ];
    root.innerHTML = [
      hero('MODEL & PROJECT LIBRARY', '模型与项目库', '按类型、难度和打印时长检索可练习的模型，也把“过程档案”单独列出来——它是模型能不能复现的关键。本库为教学目录，不提供模型文件下载。'),
      stats([[String(rows.length), '条', '可检索条目'], [String(data.works.length), '个', '完整作品档案'], ['4', '类', '过程检查点'], ['3', '类', '课堂常用材料']]),
      `<section class="section"><div class="container"><div class="model-library-head"><div><span class="kicker">Directory</span><h2>全部条目</h2></div><p>点开任一作品可查看约束、参数、失败位置、改版记录与测试数据。点击上方筛选按钮按类型查看。</p></div><div class="filter-bar" data-filter>${['全部', '文创', '功能', '教具', '结构', '机器人'].map((t, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div><div data-table>${table(['名称', '类型', '难度', '预计建模', '预计打印', '核心技能'], rows)}</div></div></section>`,
      `<section class="section soft"><div class="container">${sectionHead('Materials', '课堂常用三种材料怎么选', '同一结构换材料，参数和强度都会变。先定使用场景，再定材料。')}${table(['材料', '适合做什么', '注意什么', '课堂建议'], [['PLA', '薄板件、教具、外观件', '耐温约 55 ℃，脆性较大', '默认材料，出件快、气味小'], ['PETG', '卡扣、连接件、需要韧性的件', '易拉丝，首层附着难', '第 2 学期再引入，需降速'], ['TPU', '缓冲、握把、柔性连接', '回抽难，速度必须很慢', '仅做小件演示，不建议全班排产']])}<p class="curriculum-note">材料参数随品牌、颜色与批次变化。上表为课堂经验区间，正式排产前请先打测试片。</p></div></section>`,
      `<section class="cta-band"><div class="container"><h2>想直接看完整档案？</h2><p>作品展厅里有每件模型的约束、参数、改版与测试记录，也有四份过程档案。</p><div class="hero-actions hero-actions--center"><a class="btn btn-light btn-lg" href="/works.html">进入作品展厅</a><a class="btn btn-lg" href="/explore/collections.html">看主题合集</a></div></div></section>`
    ].join('');

    const target = $('[data-table]');
    const allRows = rows;
    $$('[data-filter] button').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-filter] button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      const filtered = type === '全部' ? allRows : allRows.filter(r => r[1].startsWith(type));
      target.innerHTML = filtered.length
        ? table(['名称', '类型', '难度', '预计建模', '预计打印', '核心技能'], filtered)
        : '<div class="empty-panel">该类型下暂无条目。</div>';
    }));
  };

  /* ---------- 主题合集 ---------- */
  const renderCollections = () => {
    root.innerHTML = [
      hero('CURATED COLLECTIONS', '主题合集：按一条线索组一批作品', '单件模型解决一个点，合集解决的是一条线。每个合集都给出适用学段、课时区间与作品清单，方便直接排课。'),
      stats([[String(data.collections.length), '个', '主题合集'], [String(data.works.length), '个', '可直接调用的作品'], ['5', '类', '常见排课周期'], ['3', '档', '难度覆盖']]),
      ...data.collections.map((c, i) => `<section class="section${i % 2 ? ' soft' : ''}"><div class="container"><div class="model-library-head"><div><span class="kicker">Collection ${String(i + 1).padStart(2, '0')}</span><h2>${esc(c.title)}</h2><p>${esc(c.intro)}</p></div><div><p><b>适用：</b>${esc(c.forWho)}</p><p><b>难度：</b>${esc(c.level)}</p><p><b>周期：</b>${esc(c.duration)}</p><div class="hero-actions">${c.items.map(item => `<span class="badge gray">${esc(item)}</span>`).join('')}</div></div></div><p class="curriculum-note">清单中的作品档案可在作品展厅查看完整参数。合集本身不构成课时承诺，实际排课按班级基础与设备条件调整。</p></div></section>`),
      `<section class="cta-band"><div class="container"><h2>需要按学校课时重排？</h2><p>给出学段、周课时与设备台数，我们可以把一个合集拆成学期课表。</p><div class="hero-actions hero-actions--center"><a class="btn btn-light btn-lg" href="/solutions/school.html">学校合作方案</a><a class="btn btn-lg" href="/contact.html">联系课程顾问</a></div></div></section>`
    ].join('');
  };

  /* ---------- 行业案例 ---------- */
  const caseCard = c => `<article class="content-card"><a class="content-cover" href="/solutions/case.html?slug=${encodeURIComponent(c.slug)}"><img src="${esc(c.cover)}" alt="${esc(c.title)}" loading="lazy"></a><div class="content-card-body"><div style="align-self:flex-start"><span class="badge">${esc(c.industry)}</span></div><h3><a href="/solutions/case.html?slug=${encodeURIComponent(c.slug)}">${esc(c.title)}</a></h3><p>${esc(c.challenge)}</p><small class="image-source-note">${esc(c.scale)}</small><div class="model-card-footer"><span>${c.metrics.map(m => `${esc(m.label)} ${esc(m.value)}`).join(' · ')}</span>${link(`/solutions/case.html?slug=${encodeURIComponent(c.slug)}`, '查看案例')}</div></div></article>`;

  const renderCases = () => {
    const slug = query.get('slug');
    const item = slug ? data.cases.find(c => c.slug === slug) : null;
    if (slug && !item) {
      root.innerHTML = `${hero('CASE FILE', '案例不存在', '这个案例可能已调整或链接有误。')}<section class="section"><div class="container"><div class="empty-panel"><p>没有找到对应案例。</p><a class="btn btn-primary" href="/solutions/case.html">返回案例库</a></div></div></section>`;
      return;
    }
    if (item) {
      root.innerHTML = [
        `<section class="section course-page"><div class="container"><div class="course-hero-detail"><div class="course-hero-copy"><span class="kicker">${esc(item.industry)}</span><h1>${esc(item.title)}</h1><p class="course-hero-description">${esc(item.challenge)}</p><div class="course-facts"><div><span>场景</span><b>${esc(item.scale)}</b></div><div><span>案例类型</span><b>${esc(item.industry.split(' · ')[0])}</b></div></div><div class="hero-actions"><a class="btn btn-primary" href="/contact.html">聊聊类似需求</a>${link('/solutions/case.html', '返回案例库', 'btn btn-outline')}</div></div><img class="course-detail-cover" src="${esc(item.cover)}" alt="${esc(item.title)}"></div></div></section>`,
        `<section class="section soft"><div class="container">${sectionHead('Constraints', '先看约束，再谈方案', '没有约束的方案无法复用。这一节写的是当时必须满足的条件。')}<div class="model-detail-sections">${item.constraints.map((c, i) => `<section><h3>约束 ${String(i + 1).padStart(2, '0')}</h3><p>${esc(c)}</p></section>`).join('')}</div></div></section>`,
        `<section class="section"><div class="container">${sectionHead('Approach', '具体做了哪几步', '每一步都可以被下一所学校或下一个产线照着做，不依赖特定设备品牌。')}<div class="portfolio-timeline">${item.approach.map((a, i) => `<article><b>Step ${String(i + 1).padStart(2, '0')}</b><p>${esc(a)}</p></article>`).join('')}</div></div></section>`,
        `<section class="section soft"><div class="container">${sectionHead('Numbers', '记录口径下的数字', '以下为教学与打样记录的统计口径，不是客户承诺或商业宣传数据。')}${table(['指标', '数值', '口径说明'], item.metrics.map(m => [m.label, m.value, m.note]))}<div class="note-panel mt-3"><b>风险提示：</b>${esc(item.risks)}</div></div></section>`,
        `<section class="section"><div class="container">${sectionHead('Transfer', '这套做法还能用在哪', '案例的价值不在复刻结果，而在可迁移的做法。')}<div class="detail-panel"><p>${esc(item.transfer)}</p><div class="hero-actions">${link('/works.html', '看对应作品档案', 'btn btn-primary')}${link('/solutions/school.html', '学校合作方案')}${link('/contact.html', '提交需求')}</div></div><p class="competition-disclaimer">案例说明：本页为方法与过程示例，已隐去客户名称与可识别信息，不包含获奖、认证或商业效果承诺。涉及医疗、工业等专业场景时，最终产品与服务须由具备相应资质的机构完成。</p></div></section>`
      ].join('');
      return;
    }
    root.innerHTML = [
      hero('CASE FILES', '行业案例：看约束，也看数字', '六个场景，覆盖教育、工业、医疗辅具、文创与竞赛。每个案例都写清当时的约束、具体做法、记录口径下的数字和可迁移部分。'),
      stats([[String(data.cases.length), '个', '场景案例'], ['5', '个', '覆盖行业'], ['18', '项', '记录指标'], ['0', '处', '客户名称披露']]),
      `<section class="section"><div class="container">${sectionHead('Browse', '按场景浏览', '点开任一案例可看约束、步骤、数字与风险提示。')}<div class="feature-grid">${data.cases.map(caseCard).join('')}</div><p class="curriculum-note">所有案例均隐去客户名称与可识别信息；数字为教学与打样记录口径，不构成效果承诺。涉及医疗、工业等专业场景时，最终交付须由具备资质的机构完成。</p></div></section>`,
      `<section class="cta-band"><div class="container"><h2>你的场景不在上面？</h2><p>把约束条件写给我们：批量、精度、交期、使用环境。有约束才谈得上方案。</p><div class="hero-actions hero-actions--center"><a class="btn btn-light btn-lg" href="/contact.html">提交场景需求</a><a class="btn btn-lg" href="/solutions.html">看解决方案</a></div></div></section>`
    ].join('');
  };

  if (view === 'works') {
    const slug = query.get('model');
    if (slug) {
      const item = data.works.find(w => w.slug === slug);
      if (item) { renderWorkDetail(item); return; }
      root.innerHTML = `${hero('MODEL FILE', '没有找到这个模型档案', '链接可能已调整。作品展厅里列出了全部可用档案。')}<section class="section"><div class="container"><div class="empty-panel"><p>该模型档案不存在或已更名。</p><a class="btn btn-primary" href="/works.html">返回作品展厅</a></div></div></section>`;
      return;
    }
    await renderWorks();
    return;
  }
  if (view === 'models') { renderModels(); return; }
  if (view === 'collections') { renderCollections(); return; }
  if (view === 'cases') { renderCases(); return; }
})();
