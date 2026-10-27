// 起元星启 — 课程、试听、学校合作与教育案例
(async function () {
  const root = document.querySelector('[data-education-view]');
  if (!root) return;
  const view = root.dataset.educationView;
  const $ = (s, p = document) => p.querySelector(s);
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const api = async (url, options = {}) => { const r = await fetch(url, options); const d = await r.json().catch(()=>({})); if (!r.ok) throw new Error(d.error || '请求失败'); return d; };
  const page = (eyebrow, title, lead, body) => `<section class="page-hero"><div class="container"><span class="kicker">${eyebrow}</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section"><div class="container">${body}</div></section>`;
  const query = new URLSearchParams(location.search);
  const syllabusItem = (s, i) => {
    const meta = [s.hours ? `${s.hours} 课时` : '', s.skill || '', s.software || ''].filter(Boolean);
    return `<li><span class="syllabus-index">${String(s.session || i + 1).padStart(2,'0')}</span><div>${s.stage ? `<span class="syllabus-stage">${esc(s.stage)}</span>` : ''}<b>${esc(s.title)}</b><span>${esc(s.project || '课程项目')}</span>${s.print ? `<span class="syllabus-print">打印任务：${esc(s.print)}</span>` : ''}${meta.length ? `<span class="syllabus-meta">${meta.map(esc).join(' · ')}</span>` : ''}</div></li>`;
  };
  const courseCard = c => `<article class="course-card course-card--media">${c.cover ? `<img class="course-card-cover" src="${esc(c.cover)}" alt="${esc(c.title)}课程过程示意" loading="lazy">` : '<div class="course-card-cover course-card-placeholder">课程过程示意</div>'}<div class="course-card-content"><div class="course-card-meta"><span>${esc(c.category)}</span><span>${esc(c.level || '按基础安排')}</span></div><h3>${esc(c.title)}</h3><p class="course-subtitle">${esc(c.subtitle)}</p><p>${esc(c.description)}</p><div class="course-card-footer"><span>${c.total_sessions ? `${esc(c.total_sessions)} 课次` : '定制课次'}${c.total_hours ? ` · ${esc(c.total_hours)} 课时` : ''}</span><a class="btn btn-outline btn-sm" href="/course.html?slug=${encodeURIComponent(c.slug)}">查看课纲</a></div></div></article>`;
  const courseGroup = (title, lead, list) => list.length ? `<section class="course-group"><div class="course-group-head"><div><h2>${esc(title)}</h2><p>${esc(lead)}</p></div></div><div class="course-grid">${list.map(courseCard).join('')}</div></section>` : '';
  if (view === 'courses') {
    root.innerHTML = page('COURSE CENTER','课程中心','按学习基础和项目目标选择入口：从简单入门开始，逐步走向普通进阶、项目实践、作品集与竞赛方向。','<div class="course-filter" data-course-filter></div><div class="learning-route" data-course-path></div><div data-courses></div><p class="curriculum-note">课纲为起元星启原创教学设计。第三方品牌、软件与模型平台的商标归其权利人所有；本站不镜像其课包或模型文件，也不宣称官方合作。</p>');
    try {
      const courses = await api('/api/courses');
      if (!courses.length) {
        root.innerHTML = page(
          'COURSE UPDATE',
          '课程信息暂未公开',
          '课程体系正在持续更新，具体课次、项目任务、设备安排与学习成果以正式发布内容为准。',
          '<div class="course-unpublished"><div><span class="kicker">CURRENT STATUS</span><h2>先了解学习方式，再决定从哪里开始</h2><p>建模、打印、作品与项目成长路径仍可正常浏览。需要体验课、学校合作或项目方向建议，可以先提交需求，由课程顾问按现阶段可提供的内容回复。</p><div class="hero-actions"><a class="btn btn-primary" href="/trial.html">预约体验与咨询</a><a class="btn btn-outline" href="/learning.html">查看学习中心</a><a class="btn btn-outline" href="/works.html">浏览作品方向</a></div></div><img src="/img/education/course-school-space.webp" alt="3D建模与打印教学空间和设备" loading="eager"></div><p class="curriculum-note">课程名称、课次、价格、班期和具体项目以正式发布内容为准。当前页面不构成招生或结果承诺。</p>'
        );
        return;
      }
      const category = query.get('category');
      const aliases = {'初中基础班':'简单入门','高中进阶班':'项目进阶'};
      const normalizedCategory = aliases[category] || category || '';
      const filters = [['全部课程',''],['简单入门','基础入门'],['普通进阶','普通进阶'],['项目实践','项目进阶'],['假期主题','寒暑假营'],['学校合作','学校合作']];
      $('[data-course-filter]').innerHTML = filters.map(([label, value]) => `<a href="${value ? `/courses/index.html?category=${encodeURIComponent(value)}` : '/courses/index.html'}" class="${(!value && !normalizedCategory) || normalizedCategory === value ? 'active' : ''}">${label}</a>`).join('');
      $('[data-course-path]').innerHTML = `<div class="learning-route-intro"><span class="kicker">LEARNING ROUTE</span><h2>按基础进入，按作品升级</h2><p>同一套方法可以从小件开始，也可以直接进入结构、测试和项目表达。课程顾问会根据已有经验调整任务深度。</p></div><ol class="learning-route-steps"><li><span>01</span><b>简单入门</b><small>安全、基础体、首层和第一件小作品</small></li><li><span>02</span><b>普通进阶</b><small>尺寸、切片、结构与学科模型</small></li><li><span>03</span><b>项目实践</b><small>参数化、公差、原型和测试证据</small></li><li><span>04</span><b>作品与竞赛</b><small>作品集、展板、答辩和官方规则核对</small></li></ol>`;
      const filtered = normalizedCategory ? courses.filter(c => c.category === normalizedCategory) : courses;
      if (category) {
        $('[data-courses]').innerHTML = filtered.length ? `<div class="course-grid">${filtered.map(courseCard).join('')}</div>` : '<div class="empty-panel">暂无匹配课程，欢迎预约课程咨询。</div>';
      } else {
        $('[data-courses]').innerHTML = [
          courseGroup('简单入门', '第一次接触建模、设备和小件，从可见成果开始。', courses.filter(c => c.category === '基础入门')),
          courseGroup('普通进阶', '把概念做成结构，练尺寸、切片、装配和学科表达。', courses.filter(c => c.category === '普通进阶')),
          courseGroup('项目进阶与实践', '需求拆解、参数化、功能测试、作品集与竞赛方向。', courses.filter(c => c.category === '项目进阶' || c.category === '项目实践')),
          courseGroup('假期与学校', '假期主题营和学校合作方案按基础、课时与设备条件定制。', courses.filter(c => c.category === '寒暑假营' || c.category === '学校合作'))
        ].join('') || '<div class="empty-panel">暂无匹配课程，欢迎预约课程咨询。</div>';
      }
    } catch (e) { $('[data-courses]').innerHTML = `<div class="empty-panel">${esc(e.message)}</div>`; } return;
  }
  if (view === 'course') {
    // 详情页必须带 slug；未指定课程时回课程列表，避免渲染出空课程
    const slug = query.get('slug');
    if (!slug) { location.replace('/courses/index.html'); return; }
    root.innerHTML = '<section class="section course-page"><div class="container"><div class="course-detail" data-course-detail></div></div></section>';
    try {
      const c = await api(`/api/courses/${encodeURIComponent(slug || '')}`);
      const gallery = (c.gallery || []).filter(image => image && image !== c.cover);
      const modeLabel = c.delivery_mode === 'offline' ? '线下授课' : c.delivery_mode === 'hybrid' ? '校本 / 混合交付' : c.delivery_mode;
      const facts = [['适合基础', c.level || '按基础安排'],['课程课次', c.total_sessions ? `${c.total_sessions} 次课` : '定制安排'],['课程时长', c.total_hours ? `${c.total_hours} 课时` : '按校定制'],['授课形式', modeLabel]];
      const audience = c.target_audience ? `<p class="course-audience">适合：${esc(c.target_audience)}</p>` : '';
      $('[data-course-detail]').innerHTML = `<div class="course-hero-detail"><div class="course-hero-copy"><span class="kicker">${esc(c.category)}${c.level ? ` · ${esc(c.level)}` : ''}</span><h1>${esc(c.title)}</h1><p class="course-hero-subtitle">${esc(c.subtitle)}</p><p class="course-hero-description">${esc(c.description)}</p>${audience}<div class="course-facts">${facts.map(([label,value])=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div><a class="btn btn-primary btn-lg" href="/trial.html?course=${encodeURIComponent(c.id)}">预约试听或课程咨询</a></div>${c.cover ? `<img class="course-detail-cover" src="${esc(c.cover)}" alt="${esc(c.title)}">` : '<div class="course-detail-cover course-card-placeholder">课程过程示意</div>'}</div><section><h2>课程大纲</h2><p class="course-syllabus-lead">每课对应一个可检查的项目成果。建模软件按班级选用积木式或参数化工具，课堂只跳转公开模型平台获取灵感，不镜像第三方课包。</p><ol class="syllabus-list">${(c.syllabus || []).map(syllabusItem).join('') || '<li>具体课纲将由课程顾问按班期说明。</li>'}</ol></section><section><h2>学习成果</h2><div class="hero-actions">${(c.outcomes || []).map(x => `<span class="badge gray">${esc(x)}</span>`).join('')}</div></section><section class="course-guidance"><h2>课程学习说明</h2><div class="course-guidance-list"><div><b>学习评价</b><p>任务完成、过程记录、测试证据与三分钟表达，不只评估成品外观。</p></div><div><b>安全要求</b><p>热端、平台与运动部件由教师值守；材料、工具和通风按课堂清单管理。</p></div><div><b>继续学习</b><p>基础建模 → 参数化与结构 → 项目与作品集；每一步都以一个可复现作品为证据。</p></div></div><p class="competition-disclaimer">结果说明：课程提供能力训练、项目整理和竞赛方向指导。参赛资格、证书类型、奖项及升学认可以当年主办方、学校和招生政策为准；不承诺报名即获证、参赛即获奖或直接获得升学资格。</p></section>${gallery.length ? `<section><h2>课程过程示意</h2><div class="education-gallery ${gallery.length === 1 ? 'education-gallery--single' : ''}">${gallery.map((image,i)=>`<img src="${esc(image)}" alt="${esc(c.title)}课程过程 ${i+1}" loading="lazy">`).join('')}</div><p class="image-source-note">过渡场景图仅用于课程视觉说明，不代表本站真实课堂或合作学校；正式课堂图片将在取得授权后替换。</p></section>` : ''}<p class="curriculum-note">本课纲为起元星启原创。第三方商标归其权利人所有；本站提供跳转与课程选型参考，不镜像模型文件，也不宣称与拓竹、创想三维、智小白等品牌存在官方课程合作。</p>`;
    } catch(e) { $('[data-course-detail]').innerHTML=`<div class="course-unpublished"><div><span class="kicker">COURSE UPDATE</span><h1>课程方案暂未公开</h1><p>${esc(e.message)}</p><div class="hero-actions"><a class="btn btn-primary" href="/trial.html">预约体验与咨询</a><a class="btn btn-outline" href="/learning.html">查看学习中心</a></div></div><img src="/img/education/course-school-space.webp" alt="3D建模与打印教学空间和设备"></div>`; } return;
  }
  if (view === 'trial') {
    let courses = []; try { courses = await api('/api/courses'); } catch {}
    root.innerHTML = page('BOOK A TRIAL','预约试听','留下监护人联系信息与学生年级，课程顾问将确认合适的课程方向和试听时间。',`<div class="trial-layout"><div><h2>先了解，再选择</h2><p class="mt-2" style="color:var(--text-secondary)">我们会根据学生年级、建模基础与兴趣方向推荐合适课程。本表单仅收集安排咨询所需信息。</p><div class="trial-points"><article><b>01</b><div><h3>课程沟通</h3><p>了解学生年级、兴趣与已有基础。</p></div></article><article><b>02</b><div><h3>预约试听</h3><p>确认适合的课程方向与时间安排。</p></div></article><article><b>03</b><div><h3>项目学习</h3><p>通过建模、打印与展示完成学习成果。</p></div></article></div></div><form class="form-wrap" id="trialForm"><div class="form-row"><div><label for="parentName">监护人姓名 *</label><input id="parentName" name="parent_name" required></div><div><label for="parentPhone">联系电话 *</label><input id="parentPhone" name="parent_phone" type="tel" required></div></div><div class="form-row"><div><label for="studentGrade">学生年级</label><select id="studentGrade" name="student_grade"><option value="">请选择</option><option>初一</option><option>初二</option><option>初三</option><option>高一</option><option>高二</option><option>高三</option></select></div><div><label for="trialCourse">意向课程</label><select id="trialCourse" name="course_id"><option value="">请课程顾问推荐</option>${courses.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div></div><div class="form-row"><div><label for="preferredTime">方便联系的时间</label><input id="preferredTime" name="preferred_time" placeholder="如周末下午"></div><div><label for="experienceLevel">建模基础</label><select id="experienceLevel" name="experience_level"><option value="">未接触过</option><option>有基础建模经验</option><option>有 3D 打印经验</option></select></div></div><div class="form-row single"><div><label for="trialMessage">补充说明</label><textarea id="trialMessage" name="message" placeholder="可填写感兴趣的主题、学校课程需求等"></textarea></div></div><label class="form-note"><input name="privacy_consent" type="checkbox" required> 我已阅读并同意本站隐私说明，仅用于安排课程咨询与试听。</label><div class="mt-2"><button class="btn btn-primary btn-lg" type="submit">提交试听预约</button></div><div id="trialTip" class="form-tip"></div></form></div>`);
    const courseId = query.get('course'); if (courseId) $('#trialCourse').value = courseId; return;
  }
  if (view === 'school') {
    root.innerHTML = page('SCHOOL PROGRAM','学校创客课程合作','把三维建模与打印落成可执行的校本课或社团：学期课纲、课堂任务单、教师带练、空间安全与学生成果展。可对接课后服务、社团或正式校本课时，不绑定特定品牌设备。',`<div class="school-space-feature"><div class="school-space-copy"><span class="kicker">SPACE & EQUIPMENT</span><h2>先把空间和设备安排好</h2><p>设备不是课程的背景板。我们会先看班级人数、操作动线、通风和教师值守，再决定打印机、材料和作品展示如何进入课堂。</p><ul><li>看得见喷头和平台，教师能及时暂停</li><li>PLA 课堂材料分区存放，耗材按课发放</li><li>作品、失败件和项目记录都有归档位置</li></ul></div><figure class="school-space-media"><img src="/img/education/school-maker-lab.jpg" alt="设备整齐、动线清楚的学校3D打印创客教室" loading="lazy"><figcaption>教学空间示意图，正式合作前按学校现场条件配置。</figcaption></figure></div><div class="course-grid"><article class="course-card"><div class="course-card-meta"><span>01 课纲</span></div><h3>学期课纲共创</h3><p class="course-subtitle">简单入门 / 项目挑战可按学期拆分。</p><p>明确学段目标、课时、评价量表和一课一成果节奏，形成学校能直接排课的课纲草案。</p></article><article class="course-card"><div class="course-card-meta"><span>02 课堂</span></div><h3>课堂任务单</h3><p class="course-subtitle">从安全出件到生活物件、学科教具。</p><p>提供 6–12 课时任务包：姓名牌、收纳、支架、浮雕、简单机构，以及几何、地形、生物等学科模型。</p></article><article class="course-card"><div class="course-card-meta"><span>03 社团</span></div><h3>创客社团工坊</h3><p class="course-subtitle">用校园真实议题完成项目闭环。</p><p>选题、原型、测试、展示按学期推进，对接校园科创节或期末作品展，而不是单次体验课。</p></article><article class="course-card"><div class="course-card-meta"><span>04 师资</span></div><h3>教师培训</h3><p class="course-subtitle">安全、切片、巡视与作品评价。</p><p>让任课教师能独立组织一节安全的出件课，并看懂学生模型是否可打印、是否需要改尺寸。</p></article><article class="course-card"><div class="course-card-meta"><span>05 空间</span></div><h3>创客空间建议</h3><p class="course-subtitle">设备服务于课程，而不是反过来。</p><p>按班级人数、动线、通风、耗材与值守给出配置建议，强调 PLA 课堂材料与高温部件管理。</p></article><article class="course-card"><div class="course-card-meta"><span>06 成果</span></div><h3>作品展与评价</h3><p class="course-subtitle">公开、授权与归档一并设计。</p><p>建立过程评价 + 作品答辩，校园展前完成学生与学校授权或匿名处理。</p></article></div><div class="mt-4 text-center"><a class="btn btn-outline btn-lg" href="/course.html?slug=school-maker-program">查看校本课纲</a> <a class="btn btn-primary btn-lg" href="/trial.html?type=school">学校合作咨询</a></div><p class="curriculum-note">合作方案为起元星启原创交付框架。第三方设备与模型平台仅作课堂参考与跳转，不代表官方课程合作。</p>`); return;
  }
  if (view === 'teachers') { root.innerHTML = page('TEACHING TEAM','师资与教研','课程团队的公开介绍与教研方向，按学科与教学场景整理。','<div class="content-grid" data-teachers></div>'); try { const rows = await api('/api/teachers'); $('[data-teachers]').innerHTML = rows.length ? rows.map(t=>`<article class="teacher-card">${t.avatar ? `<img class="teacher-avatar" src="${esc(t.avatar)}" alt="${esc(t.name)}">` : '<div class="teacher-avatar teacher-placeholder">课程团队</div>'}<div class="teacher-copy"><span class="badge">${esc(t.role || '课程团队')}</span><h3>${esc(t.name)}</h3><p>${esc(t.bio || '负责课程教学与项目指导。')}</p></div></article>`).join('') : '<div class="empty-panel">师资信息将在完成公开授权后展示。</div>'; } catch(e) { $('[data-teachers]').innerHTML = '<div class="empty-panel">师资信息加载失败。</div>'; } return; }
})();
