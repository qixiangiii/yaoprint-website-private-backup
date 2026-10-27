// 前台只读接口与公开表单提交。所有写入口都带限流 + 长度裁剪 + 字段级校验。
const crypto = require('crypto');

const { db, stmt, getSetting, publicSettings, PUBLIC_SETTING_KEYS } = require('../lib/store');
const { notifyWeCom } = require('../lib/notify');
const { submitLimiter, subsLimiter, pageviewLimiter } = require('../lib/limiters');
const {
  parseJSON, safeLink, httpsOnly, capStrings, limitText, isPhone, isEmail, clampInt
} = require('../lib/validate');
const { PRODUCT_PUBLIC_SELECT, parseProduct } = require('../lib/catalog');

const TEACHING_NEWS_TAGS = ['行业动态', '课堂方法', '学生教学', '软件选型'];
const NEWS_ORDER_SQL = `CASE WHEN tag='行业动态' THEN 0 ELSE 1 END, datetime(published_at) DESC, id DESC`;
const CRAWLER_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|headless|pingdom|monitor/i;

function publicCompetition(row) {
  return {
    ...row,
    official_url: httpsOnly(row.official_url),
    registration_url: httpsOnly(row.registration_url),
    notice_url: httpsOnly(row.notice_url)
  };
}

function parseContent(item) {
  item.meta = parseJSON(item.meta_json, {});
  delete item.meta_json;
  return item;
}

function courseCatalogIsPublic() {
  return getSetting('course_catalog_visibility') === 'public';
}

module.exports = function registerPublicRoutes(app) {
  // ---------- 设备参考 ----------
  app.get('/api/products', (req, res) => {
    const rows = stmt(`SELECT ${PRODUCT_PUBLIC_SELECT}, c.slug AS cat_slug, c.name AS cat_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status IN ('published','soon') ORDER BY p.sort, p.id`).all().map(parseProduct);
    res.json(rows);
  });

  app.get('/api/products/:slug', (req, res) => {
    // 与列表接口保持一致：草稿/下架产品不能通过猜 slug 直接读到
    const product = stmt(`SELECT p.*, c.slug AS cat_slug, c.name AS cat_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status IN ('published','soon')`).get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'not found' });
    res.json(parseProduct(product));
  });

  // ---------- 教学文章 ----------
  app.get('/api/news', (req, res) => {
    const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 });
    const tag = String(req.query.tag || '').trim();
    const tags = TEACHING_NEWS_TAGS.includes(tag) ? [tag] : TEACHING_NEWS_TAGS;
    const placeholders = tags.map(() => '?').join(',');
    res.json(stmt(`SELECT * FROM news WHERE status='published' AND tag IN (${placeholders}) ORDER BY ${NEWS_ORDER_SQL} LIMIT ?`).all(...tags, limit));
  });

  app.get('/api/news/:slug', (req, res) => {
    const placeholders = TEACHING_NEWS_TAGS.map(() => '?').join(',');
    const item = stmt(`SELECT * FROM news WHERE slug = ? AND status='published' AND tag IN (${placeholders})`).get(req.params.slug, ...TEACHING_NEWS_TAGS);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  });

  // ---------- 站点设置（只返回白名单字段） ----------
  app.get('/api/settings', (req, res) => res.json(publicSettings(PUBLIC_SETTING_KEYS)));

  // ---------- 访问统计 ----------
  app.post('/api/pageview', pageviewLimiter, (req, res) => {
    try {
      const pathName = String((req.body && req.body.path) || '/').trim().slice(0, 255) || '/';
      // 仅统计站内路径，拒绝外链与协议注入
      if (!pathName.startsWith('/') || /^\/\//.test(pathName)) return res.status(204).end();
      const ua = String(req.get('user-agent') || '');
      const referrer = String(req.get('referer') || '').trim().slice(0, 500);
      // 用 IP + UA 哈希作为匿名访客标识，不存原始 IP
      const visitor = crypto.createHash('sha256')
        .update(String(req.ip || '') + '|' + ua)
        .digest('hex').slice(0, 24);
      stmt('INSERT INTO page_views (path, referrer, visitor, is_crawler) VALUES (?,?,?,?)')
        .run(pathName, referrer, visitor, CRAWLER_UA.test(ua) ? 1 : 0);
    } catch { /* 统计失败不影响主流程 */ }
    res.status(204).end();
  });

  // ---------- 生态平台 / 竞赛 ----------
  app.get('/api/ecosystem-platforms', (req, res) => {
    res.json(stmt("SELECT * FROM ecosystem_platforms WHERE status='published' ORDER BY sort,id").all()
      .map(item => ({ ...item, url: safeLink(item.url) }))
      .filter(item => item.url));
  });

  app.get('/api/competitions', (req, res) => {
    const rows = stmt("SELECT * FROM competitions WHERE visibility='published' ORDER BY sort,id").all();
    res.json(rows.map(publicCompetition).filter(row => row.official_url));
  });

  app.get('/api/competitions/:slug', (req, res) => {
    const row = stmt("SELECT * FROM competitions WHERE slug=? AND visibility='published'").get(req.params.slug);
    if (!row) return res.status(404).json({ error: '竞赛入口不存在或尚未发布' });
    res.json(publicCompetition(row));
  });

  // ---------- 课程 / 师资 / 校区 / 教学案例 ----------
  app.get('/api/courses', (req, res) => {
    if (!courseCatalogIsPublic()) return res.json([]);
    const category = String(req.query.category || '').trim();
    const rows = category
      ? stmt("SELECT * FROM courses WHERE status='published' AND category=? ORDER BY sort,id").all(category)
      : stmt("SELECT * FROM courses WHERE status='published' ORDER BY sort,id").all();
    res.json(rows.map(course => ({
      ...course,
      syllabus: parseJSON(course.syllabus_json, []),
      outcomes: parseJSON(course.outcomes_json, []),
      gallery: parseJSON(course.gallery_json, [])
    })));
  });

  app.get('/api/courses/:slug', (req, res) => {
    if (!courseCatalogIsPublic()) return res.status(404).json({ error: '课程方案正在完善，暂未公开' });
    const course = stmt("SELECT * FROM courses WHERE slug=? AND status='published'").get(req.params.slug);
    if (!course) return res.status(404).json({ error: '课程不存在或尚未发布' });
    course.syllabus = parseJSON(course.syllabus_json, []);
    course.outcomes = parseJSON(course.outcomes_json, []);
    course.gallery = parseJSON(course.gallery_json, []);
    // 只返回已开放报名的班期；草稿班期属于后台未定稿内容，不应出现在前台
    course.sessions = stmt("SELECT * FROM course_sessions WHERE course_id=? AND status='open' ORDER BY sort,id").all(course.id);
    res.json(course);
  });

  app.get('/api/teachers', (req, res) => {
    res.json(stmt("SELECT * FROM teachers WHERE status='published' ORDER BY sort,id").all()
      .map(teacher => ({ ...teacher, specialties: parseJSON(teacher.specialties_json, []), grade_bands: parseJSON(teacher.grade_bands_json, []) })));
  });

  app.get('/api/campuses', (req, res) => {
    res.json(stmt("SELECT * FROM campuses WHERE status='published' ORDER BY sort,id").all()
      .map(campus => ({ ...campus, facilities: parseJSON(campus.facilities_json, []) })));
  });

  app.get('/api/education-cases', (req, res) => {
    res.json(stmt("SELECT * FROM education_cases WHERE status='published' AND visibility='public' ORDER BY sort,id").all()
      .map(item => ({ ...item, outcomes: parseJSON(item.outcomes_json, []), gallery: parseJSON(item.gallery_json, []) })));
  });

  // ---------- 首页轮播 ----------
  app.get('/api/heroes', (req, res) => {
    res.json(stmt("SELECT * FROM heroes WHERE status='published' ORDER BY sort, id").all());
  });

  // ---------- 试听预约 ----------
  app.post('/api/enrollment-inquiries', submitLimiter, capStrings(4000), (req, res) => {
    const { lead_type, parent_name, parent_phone, parent_wechat, student_grade, course_id, campus_id, preferred_time, experience_level, message, privacy_consent, privacy_version } = req.body || {};
    if (!parent_name || !parent_phone) return res.status(400).json({ error: '请填写监护人姓名和联系电话' });
    if (!isPhone(parent_phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    if (!privacy_consent) return res.status(400).json({ error: '请阅读并同意隐私说明后提交' });
    // 外键先查存在性：直接拿 Number() 落库，课程/校区被删或 id 伪造时会抛 FOREIGN KEY，
    // 用户看到的是 500「服务器内部错误」，实际是「课程已下架」。与后台同类写入保持一致返回 400。
    const courseId = Number(course_id) || null;
    const campusId = Number(campus_id) || null;
    const courseRow = courseId ? stmt('SELECT id, title FROM courses WHERE id=?').get(courseId) : null;
    if (courseId && !courseRow) return res.status(400).json({ error: '所选课程不存在或已下架，请刷新页面后重试' });
    const campusRow = campusId ? stmt('SELECT id, name FROM campuses WHERE id=?').get(campusId) : null;
    if (campusId && !campusRow) return res.status(400).json({ error: '所选校区不存在，请刷新页面后重试' });
    const result = stmt(`INSERT INTO enrollment_inquiries (lead_type,parent_name,parent_phone,parent_wechat,student_grade,course_id,campus_id,preferred_time,experience_level,message,privacy_consent,privacy_version,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'))`)
      .run(limitText(lead_type || 'trial', 20), limitText(parent_name, 40), limitText(parent_phone, 20), limitText(parent_wechat, 40), limitText(student_grade, 20), courseId, campusId, limitText(preferred_time, 40), limitText(experience_level, 40), limitText(message, 1000), 1, limitText(privacy_version || '2026.09', 20));
    const leadTypeLabel = { trial: '体验课预约', school: '学校合作咨询', competition: '竞赛咨询' }[String(lead_type || 'trial')] || '预约咨询';
    notifyWeCom(`【起元星启】新的${leadTypeLabel}`, [
      ['监护人', parent_name], ['电话', parent_phone], ['微信号', parent_wechat],
      ['学生年级', student_grade], ['意向课程', courseRow?.title], ['校区', campusRow?.name],
      ['期望时间', preferred_time], ['已有基础', experience_level], ['留言', message]
    ]);
    res.json({ ok: true, id: result.lastInsertRowid });
  });

  // ---------- 通用咨询 ----------
  app.post('/api/leads', submitLimiter, capStrings(4000), (req, res) => {
    const { name, company, phone, email, scene, message, source } = req.body || {};
    if (!name && !phone && !email) return res.status(400).json({ error: '请填写联系信息' });
    if (phone && !isPhone(phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    if (email && !isEmail(email)) return res.status(400).json({ error: '请填写有效的邮箱' });
    stmt('INSERT INTO leads (name, company, phone, email, scene, message, source) VALUES (?,?,?,?,?,?,?)')
      .run(limitText(name, 40), limitText(company, 80), limitText(phone, 20), limitText(email, 120), limitText(scene, 60), limitText(message, 1000), limitText(source || 'website', 40));
    notifyWeCom('【起元星启】新的通用咨询', [
      ['姓名', name], ['公司/单位', company], ['电话', phone], ['邮箱', email],
      ['场景', scene], ['留言', message], ['来源', source]
    ]);
    res.json({ ok: true });
  });

  // ---------- 服务网点 / 伙伴 ----------
  app.get('/api/partners', (req, res) => {
    const city = String(req.query.city || '').trim();
    const type = String(req.query.type || '').trim();
    const clauses = ["status='active'"];
    const values = [];
    if (city) { clauses.push('(city LIKE ? OR province LIKE ?)'); values.push(`%${city}%`, `%${city}%`); }
    if (type) { clauses.push('service_type LIKE ?'); values.push(`%${type}%`); }
    res.json(stmt(`SELECT * FROM partners WHERE ${clauses.join(' AND ')} ORDER BY sort,id`).all(...values));
  });

  app.post('/api/partner-applications', submitLimiter, capStrings(4000), (req, res) => {
    const { company, contact_name, phone, email, application_type, city, description } = req.body || {};
    if (!company || !contact_name || (!phone && !email)) return res.status(400).json({ error: '请填写企业、联系人及联系方式' });
    if (phone && !isPhone(phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    if (email && !isEmail(email)) return res.status(400).json({ error: '请填写有效的邮箱' });
    stmt('INSERT INTO partner_applications (company,contact_name,phone,email,application_type,city,description) VALUES (?,?,?,?,?,?,?)')
      .run(limitText(company, 80), limitText(contact_name, 40), limitText(phone, 20), limitText(email, 120), limitText(application_type, 40), limitText(city, 40), limitText(description, 1000));
    res.json({ ok: true });
  });

  // ---------- 邮件订阅 ----------
  app.post('/api/subs', subsLimiter, capStrings(254), (req, res) => {
    const email = String((req.body && req.body.email) || '').trim();
    if (!isEmail(email)) return res.status(400).json({ error: '请输入有效邮箱' });
    try {
      stmt('INSERT INTO subs (email) VALUES (?)').run(email);
    } catch (error) {
      // 只有唯一约束才代表“已订阅”；其他数据库异常必须如实报错，
      // 否则写入失败也会被前端显示成“✓ 该邮箱已订阅”。
      if (error && (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(error.message || ''))) {
        return res.json({ ok: true, dup: true });
      }
      console.error('[subs]', error && error.message);
      return res.status(500).json({ error: '订阅失败，请稍后重试' });
    }
    res.json({ ok: true });
  });

  // ---------- 内容中心 ----------
  app.get('/api/content', (req, res) => {
    const type = String(req.query.type || '').trim();
    const tag = String(req.query.tag || '').trim();
    // 负数会被 SQLite 解释为“不限制条数”，必须先收敛到 1..100
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 100 });
    const clauses = ["status='published'"];
    const values = [];
    if (type) { clauses.push('type=?'); values.push(type); }
    if (tag) { clauses.push('tag=?'); values.push(tag); }
    values.push(limit);
    res.json(stmt(`SELECT * FROM content_items WHERE ${clauses.join(' AND ')} ORDER BY sort, id DESC LIMIT ?`).all(...values).map(parseContent));
  });

  app.get('/api/content/:type/:slug', (req, res) => {
    const item = stmt("SELECT * FROM content_items WHERE type=? AND slug=? AND status='published'").get(req.params.type, req.params.slug);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(parseContent(item));
  });

  // ---------- 服务工单（可匿名，登录后自动归属账户） ----------
  app.post('/api/tickets', submitLimiter, capStrings(4000), (req, res) => {
    const { name, phone, email, product, serial_no, subject, description, source, order_no } = req.body || {};
    const customer = req.session && req.session.customer;
    const resolvedName = String(name || customer?.name || '').trim();
    const resolvedPhone = String(phone || customer?.phone || '').trim();
    const resolvedEmail = String(email || customer?.email || '').trim();
    if (!resolvedName || (!resolvedPhone && !resolvedEmail)) return res.status(400).json({ error: '请填写姓名及至少一种联系方式' });
    if (resolvedPhone && !isPhone(resolvedPhone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    if (resolvedEmail && !isEmail(resolvedEmail)) return res.status(400).json({ error: '请填写有效的邮箱' });
    let deviceId = null;
    if (customer && serial_no) {
      deviceId = stmt('SELECT d.id FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE d.serial_no=? AND b.customer_id=?')
        .get(String(serial_no).trim(), customer.id)?.id || null;
    }
    stmt('INSERT INTO service_tickets (name,phone,email,product,serial_no,subject,description,source,customer_id,device_id,order_no) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(limitText(resolvedName, 40), limitText(resolvedPhone, 20), limitText(resolvedEmail, 120), limitText(product, 120), limitText(serial_no, 60), limitText(subject, 120), limitText(description, 1000), limitText(source || 'support-ticket', 40), customer?.id || null, deviceId, limitText(order_no, 40));
    res.json({ ok: true });
  });
};
