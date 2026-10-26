// 后台接口：登录、内容管理、业务数据、站点设置与统计看板。
// 除 login/logout/me 外，全部经由 requireAdmin 守卫。
const path = require('path');
const bcrypt = require('bcryptjs');

const { db, stmt, allSettings, invalidateSettings } = require('../lib/store');
const { DUMMY_HASH, requireAdmin, loginSession } = require('../lib/auth');
const { loginLimiter } = require('../lib/limiters');
const { parseJSON, safeLink, httpsOnly, limitText, clampInt } = require('../lib/validate');
const { PRODUCT_ADMIN_SELECT, parseProduct } = require('../lib/catalog');
const { uploadImage } = require('../lib/upload');
const { registerCrud } = require('../lib/crud');

function parseContent(item) {
  item.meta = parseJSON(item.meta_json, {});
  delete item.meta_json;
  return item;
}

module.exports = function registerAdminRoutes(app) {
  // ---------- 管理员会话 ----------
  app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};
    const user = stmt('SELECT * FROM users WHERE username = ?').get(String(username || ''));
    // 账号不存在时也执行一次比较，避免用响应时间枚举管理员账号
    const ok = bcrypt.compareSync(String(password || ''), user?.password_hash || DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: '账号或密码错误' });
    loginSession(req, res, {
      key: 'user',
      value: { id: user.id, username: user.username, name: user.name, role: user.role },
      error: '登录失败，请重试'
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get('/api/admin/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    res.json(req.session.user);
  });

  app.post('/api/admin/password', requireAdmin, (req, res) => {
    const { current, next } = req.body || {};
    if (!next || String(next).length < 8) return res.status(400).json({ error: '新密码至少 8 位' });
    const user = stmt('SELECT * FROM users WHERE id=?').get(req.session.user.id);
    if (!user || !bcrypt.compareSync(current || '', user.password_hash)) {
      return res.status(400).json({ error: '当前密码不正确' });
    }
    stmt('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(next), 10), user.id);
    res.json({ ok: true });
  });

  // ---------- 内容中心 ----------
  app.get('/api/admin/content', requireAdmin, (req, res) => {
    const type = String(req.query.type || '').trim();
    const rows = type
      ? stmt('SELECT * FROM content_items WHERE type=? ORDER BY type, sort, id DESC').all(type)
      : stmt('SELECT * FROM content_items ORDER BY type, sort, id DESC').all();
    res.json(rows.map(parseContent));
  });

  app.get('/api/admin/content/:id', requireAdmin, (req, res) => {
    const item = stmt('SELECT * FROM content_items WHERE id=?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(parseContent(item));
  });

  app.post('/api/admin/content', requireAdmin, (req, res) => {
    const { type, slug, title, summary, body, cover, tag, meta, status, sort, published_at } = req.body || {};
    if (!type || !slug || !title) return res.status(400).json({ error: '类型、slug 与标题必填' });
    try {
      const result = stmt(`INSERT INTO content_items (type,slug,title,summary,body,cover,tag,meta_json,status,sort,published_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,COALESCE(NULLIF(?,''),datetime('now','localtime')))`)
        .run(type, slug, title, summary || '', body || '', cover || '', tag || '', JSON.stringify(meta || {}), status || 'published', Number(sort) || 0, published_at || '');
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put('/api/admin/content/:id', requireAdmin, (req, res) => {
    const { type, slug, title, summary, body, cover, tag, meta, status, sort, published_at } = req.body || {};
    if (!type || !slug || !title) return res.status(400).json({ error: '类型、slug 与标题必填' });
    try {
      const result = stmt('UPDATE content_items SET type=?,slug=?,title=?,summary=?,body=?,cover=?,tag=?,meta_json=?,status=?,sort=?,published_at=COALESCE(NULLIF(?,\'\'),published_at),updated_at=datetime(\'now\',\'localtime\') WHERE id=?')
        .run(type, slug, title, summary || '', body || '', cover || '', tag || '', JSON.stringify(meta || {}), status || 'published', Number(sort) || 0, published_at || '', req.params.id);
      if (!result.changes) return res.status(404).json({ error: '内容不存在' });
      res.json({ ok: true });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.delete('/api/admin/content/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM content_items WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '内容不存在' });
    res.json({ ok: true });
  });

  // ---------- 服务工单 ----------
  app.get('/api/admin/tickets', requireAdmin, (req, res) => {
    res.json(stmt('SELECT * FROM service_tickets ORDER BY id DESC LIMIT 200').all());
  });

  app.put('/api/admin/tickets/:id', requireAdmin, (req, res) => {
    const status = String((req.body || {}).status || 'new');
    const result = stmt('UPDATE service_tickets SET status=? WHERE id=?').run(status, req.params.id);
    if (!result.changes) return res.status(404).json({ error: '工单不存在' });
    res.json({ ok: true });
  });

  app.delete('/api/admin/tickets/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM service_tickets WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '工单不存在' });
    res.json({ ok: true });
  });

  // ---------- 试听预约 ----------
  app.get('/api/admin/enrollment-inquiries', requireAdmin, (req, res) => {
    res.json(stmt('SELECT e.*,c.title AS course_title,p.name AS campus_name FROM enrollment_inquiries e LEFT JOIN courses c ON c.id=e.course_id LEFT JOIN campuses p ON p.id=e.campus_id ORDER BY e.id DESC').all());
  });

  app.put('/api/admin/enrollment-inquiries/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    stmt('UPDATE enrollment_inquiries SET status=?,follow_up_note=? WHERE id=?')
      .run(String(body.status || 'new'), String(body.follow_up_note || ''), req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/enrollment-inquiries/:id', requireAdmin, (req, res) => {
    stmt('DELETE FROM enrollment_inquiries WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---------- 客户 / 商品 / 订单 ----------
  app.get('/api/admin/customers', requireAdmin, (req, res) => {
    res.json(stmt('SELECT id,email,name,phone,status,created_at FROM customers ORDER BY id DESC').all());
  });

  app.put('/api/admin/customers/:id', requireAdmin, (req, res) => {
    stmt('UPDATE customers SET status=? WHERE id=?').run(String((req.body || {}).status || 'active'), req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/skus', requireAdmin, (req, res) => {
    res.json(stmt('SELECT s.*,p.name AS product_name FROM catalog_skus s LEFT JOIN products p ON p.id=s.product_id ORDER BY s.sort,s.id DESC').all());
  });

  app.post('/api/admin/skus', requireAdmin, (req, res) => {
    const body = req.body || {};
    if (!body.slug || !body.name) return res.status(400).json({ error: 'slug 与名称必填' });
    try {
      const result = stmt('INSERT INTO catalog_skus (product_id,slug,name,variant,price,cover,status,sort) VALUES (?,?,?,?,?,?,?,?)')
        .run(body.product_id || null, body.slug, body.name, body.variant || '', body.price || '', body.cover || '', body.status || 'published', Number(body.sort) || 0);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put('/api/admin/skus/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    stmt('UPDATE catalog_skus SET product_id=?,slug=?,name=?,variant=?,price=?,cover=?,status=?,sort=? WHERE id=?')
      .run(body.product_id || null, body.slug, body.name, body.variant || '', body.price || '', body.cover || '', body.status || 'published', Number(body.sort) || 0, req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/skus/:id', requireAdmin, (req, res) => {
    stmt('DELETE FROM catalog_skus WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    res.json(stmt('SELECT o.*,c.email,c.name FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC').all());
  });

  app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
    stmt('UPDATE orders SET status=? WHERE id=?').run(String((req.body || {}).status || 'pending_review'), req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/after-sales', requireAdmin, (req, res) => {
    res.json(stmt('SELECT a.*,o.order_no,c.email,c.name FROM after_sales a JOIN orders o ON o.id=a.order_id JOIN customers c ON c.id=a.customer_id ORDER BY a.id DESC').all());
  });

  app.put('/api/admin/after-sales/:id', requireAdmin, (req, res) => {
    stmt('UPDATE after_sales SET status=? WHERE id=?').run(String((req.body || {}).status || 'new'), req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/devices', requireAdmin, (req, res) => {
    res.json(stmt('SELECT d.*,c.email,c.name FROM devices d LEFT JOIN device_bindings b ON b.device_id=d.id LEFT JOIN customers c ON c.id=b.customer_id ORDER BY d.id DESC').all());
  });

  app.get('/api/admin/submissions', requireAdmin, (req, res) => {
    res.json(stmt('SELECT s.*,c.email,c.name FROM creator_submissions s JOIN customers c ON c.id=s.customer_id ORDER BY s.id DESC').all());
  });

  app.put('/api/admin/submissions/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    stmt('UPDATE creator_submissions SET status=?,admin_note=? WHERE id=?')
      .run(String(body.status || 'pending'), String(body.admin_note || ''), req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/partner-applications', requireAdmin, (req, res) => {
    res.json(stmt('SELECT * FROM partner_applications ORDER BY id DESC').all());
  });

  app.put('/api/admin/partner-applications/:id', requireAdmin, (req, res) => {
    stmt('UPDATE partner_applications SET status=? WHERE id=?').run(String((req.body || {}).status || 'new'), req.params.id);
    res.json({ ok: true });
  });

  // ---------- 统计 ----------
  // 原先 22 条独立 COUNT：每次看板刷新要编译并执行 22 次查询。
  // 合并为单条语句后只有一次 prepare + 一次扫描，指标项仍逐项对应。
  const statsSql = `SELECT
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM news) AS news,
    (SELECT COUNT(*) FROM leads) AS leads,
    (SELECT COUNT(*) FROM subs) AS subs,
    (SELECT COUNT(*) FROM leads WHERE status='new') AS pendingLeads,
    (SELECT COUNT(*) FROM categories) AS categories,
    (SELECT COUNT(*) FROM scenes) AS scenes,
    (SELECT COUNT(*) FROM academy) AS academy,
    (SELECT COUNT(*) FROM videos) AS videos,
    (SELECT COUNT(*) FROM reviews) AS reviews,
    (SELECT COUNT(*) FROM downloads) AS downloads,
    (SELECT COUNT(*) FROM heroes) AS heroes,
    (SELECT COUNT(*) FROM content_items) AS content,
    (SELECT COUNT(*) FROM service_tickets) AS tickets,
    (SELECT COUNT(*) FROM customers) AS customers,
    (SELECT COUNT(*) FROM orders) AS orders,
    (SELECT COUNT(*) FROM after_sales) AS afterSales,
    (SELECT COUNT(*) FROM devices) AS devices,
    (SELECT COUNT(*) FROM creator_submissions WHERE status='pending') AS submissions,
    (SELECT COUNT(*) FROM partner_applications WHERE status='new') AS partnerApplications,
    (SELECT COUNT(*) FROM enrollment_inquiries WHERE status='new') AS enrollmentInquiries,
    (SELECT COUNT(*) FROM courses) AS courses`;

  app.get('/api/admin/stats', requireAdmin, (req, res) => res.json(stmt(statsSql).get()));

  app.get('/api/admin/leads', requireAdmin, (req, res) => {
    res.json(stmt('SELECT * FROM leads ORDER BY id DESC LIMIT 200').all());
  });

  app.put('/api/admin/leads/:id', requireAdmin, (req, res) => {
    const { status } = req.body || {};
    const result = stmt('UPDATE leads SET status=? WHERE id=?').run(status || 'new', req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });

  app.delete('/api/admin/leads/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM leads WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });

  app.get('/api/admin/subs', requireAdmin, (req, res) => {
    res.json(stmt('SELECT * FROM subs ORDER BY id DESC').all());
  });

  app.delete('/api/admin/subs/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM subs WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });

  // ---------- 设备产品 ----------
  app.get('/api/admin/products', requireAdmin, (req, res) => {
    res.json(stmt(`SELECT ${PRODUCT_ADMIN_SELECT}, c.name AS cat_name FROM products p
      LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.sort, p.id DESC`).all());
  });

  app.get('/api/admin/products/:id', requireAdmin, (req, res) => {
    const product = stmt('SELECT * FROM products WHERE id=?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'not found' });
    res.json(parseProduct(product));
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, features, relationship, official_url, source_label, relationship_disclaimer, spec_source, spec_verified_at, featured_home, status, sort } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: 'slug 与名称必填' });
    try {
      const result = stmt(`INSERT INTO products (slug,name,subtitle,category_id,tag,price,description,spec_json,image_svg,hero_image,card_image,gallery_json,colors_json,kits_json,feature_json,relationship,official_url,source_label,relationship_disclaimer,spec_source,spec_verified_at,featured_home,status,sort)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, name, subtitle || '', category_id || null, tag || '', price || '', description || '',
          JSON.stringify(spec || {}), image_svg || '', hero_image || '', card_image || '', JSON.stringify(gallery || []),
          JSON.stringify(colors || []), JSON.stringify(kits || []), JSON.stringify(features || []), relationship || 'training_reference',
          safeLink(official_url), source_label || '', relationship_disclaimer || '', spec_source || '', spec_verified_at || '',
          featured_home ? 1 : 0, status || 'published', sort || 0);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, features, relationship, official_url, source_label, relationship_disclaimer, spec_source, spec_verified_at, featured_home, status, sort } = req.body || {};
    const result = stmt(`UPDATE products SET slug=?, name=?, subtitle=?, category_id=?, tag=?, price=?, description=?, spec_json=?, image_svg=?, hero_image=?, card_image=?, gallery_json=?, colors_json=?, kits_json=?, feature_json=?, relationship=?, official_url=?, source_label=?, relationship_disclaimer=?, spec_source=?, spec_verified_at=?, featured_home=?, status=?, sort=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(slug, name, subtitle || '', category_id || null, tag || '', price || '', description || '',
        JSON.stringify(spec || {}), image_svg || '', hero_image || '', card_image || '', JSON.stringify(gallery || []),
        JSON.stringify(colors || []), JSON.stringify(kits || []), JSON.stringify(features || []), relationship || 'training_reference',
        safeLink(official_url), source_label || '', relationship_disclaimer || '', spec_source || '', spec_verified_at || '',
        featured_home ? 1 : 0, status || 'published', sort || 0, req.params.id);
    if (!result.changes) return res.status(404).json({ error: '产品不存在' });
    res.json({ ok: true });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM products WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '产品不存在' });
    res.json({ ok: true });
  });

  // ---------- 教学文章 ----------
  app.get('/api/admin/news', requireAdmin, (req, res) => {
    res.json(stmt('SELECT * FROM news ORDER BY sort, id DESC').all());
  });

  app.post('/api/admin/news', requireAdmin, (req, res) => {
    const { slug, title, summary, body, cover, tag, status, sort } = req.body || {};
    if (!slug || !title) return res.status(400).json({ error: 'slug 与标题必填' });
    try {
      const result = stmt('INSERT INTO news (slug,title,summary,body,cover,tag,status,sort) VALUES (?,?,?,?,?,?,?,?)')
        .run(slug, title, summary || '', body || '', cover || '', tag || '', status || 'published', sort || 0);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
    const { slug, title, summary, body, cover, tag, status, sort } = req.body || {};
    const result = stmt('UPDATE news SET slug=?, title=?, summary=?, body=?, cover=?, tag=?, status=?, sort=? WHERE id=?')
      .run(slug, title, summary || '', body || '', cover || '', tag || '', status || 'published', sort || 0, req.params.id);
    if (!result.changes) return res.status(404).json({ error: '文章不存在' });
    res.json({ ok: true });
  });

  app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
    const result = stmt('DELETE FROM news WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '文章不存在' });
    res.json({ ok: true });
  });

  // ---------- 站点设置 ----------
  app.get('/api/admin/settings', requireAdmin, (req, res) => res.json(allSettings()));

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body || {};
    const upsert = db.prepare(`INSERT INTO settings (key,value) VALUES (?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
    const save = db.transaction(entries => {
      for (const [key, value] of entries) upsert.run(key, String(value ?? ''));
    });
    save(Object.entries(body));
    invalidateSettings(); // 写入后立即失效，下一次读取即拿到新值
    res.json({ ok: true });
  });

  // ---------- 图片上传 ----------
  app.post('/api/admin/upload', requireAdmin, uploadImage, (req, res) => {
    res.json({ ok: true, url: '/uploads/' + req.file.filename });
  });

  // ---------- 访问统计看板 ----------
  app.get('/api/admin/pageviews/summary', requireAdmin, (req, res) => {
    const days = clampInt(req.query.days, { min: 1, max: 90, fallback: 7 });
    const since = `-${days} days`;
    const topPages = stmt(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
      FROM page_views WHERE is_crawler=0 AND datetime(created_at) >= datetime('now','localtime', ?)
      GROUP BY path ORDER BY views DESC LIMIT 20`).all(since);
    const daily = stmt(`SELECT substr(created_at,1,10) AS day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
      FROM page_views WHERE is_crawler=0 AND datetime(created_at) >= datetime('now','localtime', ?)
      GROUP BY day ORDER BY day ASC`).all(since);
    const total = stmt("SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM page_views WHERE is_crawler=0").get();
    // 转化漏斗：试听预约 + 通用咨询 + 伙伴申请 + 工单 最近 N 天
    const conversions = stmt(`SELECT
      (SELECT COUNT(*) FROM enrollment_inquiries WHERE datetime(created_at) >= datetime('now','localtime', ?)) AS enrollments,
      (SELECT COUNT(*) FROM leads WHERE datetime(created_at) >= datetime('now','localtime', ?)) AS leads,
      (SELECT COUNT(*) FROM partner_applications WHERE datetime(created_at) >= datetime('now','localtime', ?)) AS partners,
      (SELECT COUNT(*) FROM service_tickets WHERE datetime(created_at) >= datetime('now','localtime', ?)) AS tickets`).get(since, since, since, since);
    res.json({ days, total, daily, topPages, conversions });
  });

  // ---------- 通用内容表 ----------
  // 必须在所有显式路由注册之后调用，避免 /api/:table 抢占专门实现的接口
  registerCrud(app, 'ecosystem_platforms', ['slug', 'name', 'platform_type', 'brand_owner', 'description', 'url', 'cover', 'relationship', 'disclaimer', 'link_label', 'last_verified_at', 'status', 'sort'], {
    required: ['slug', 'name', 'url'],
    publicWhere: "status='published'",
    publicOrder: 'sort,id',
    validate: body => safeLink(body.url) ? null : '生态平台链接仅支持 HTTPS 官方链接或站内路径'
  });
  registerCrud(app, 'competitions', ['slug', 'title', 'category', 'organizer', 'fit', 'region', 'group_text', 'competition_status', 'official_url', 'registration_url', 'notice_url', 'source_label', 'cover', 'image_type', 'image_alt', 'image_source', 'screenshot_taken_at', 'verified_at', 'visibility', 'sort'], {
    required: ['slug', 'title', 'official_url'],
    publicWhere: "visibility='published'",
    publicOrder: 'sort,id',
    validate: body => {
      if (!httpsOnly(body.official_url)) return '官网链接必须是 HTTPS 地址';
      if (body.registration_url && !httpsOnly(body.registration_url)) return '报名链接必须是 HTTPS 地址';
      if (body.notice_url && !httpsOnly(body.notice_url)) return '官方通知链接必须是 HTTPS 地址';
      return null;
    }
  });
  registerCrud(app, 'courses', ['code', 'slug', 'title', 'subtitle', 'category', 'grade_min', 'grade_max', 'target_audience', 'level', 'delivery_mode', 'total_sessions', 'total_hours', 'price_text', 'description', 'syllabus_json', 'outcomes_json', 'cover', 'gallery_json', 'status', 'sort', 'seo_title', 'seo_description'], { required: ['code', 'slug', 'title'], publicWhere: "status='published'", publicOrder: 'sort,id' });
  registerCrud(app, 'teachers', ['slug', 'name', 'role', 'avatar', 'bio', 'specialties_json', 'grade_bands_json', 'status', 'sort'], { required: ['slug', 'name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
  registerCrud(app, 'campuses', ['name', 'city', 'district', 'address', 'transport', 'opening_hours', 'phone', 'cover', 'facilities_json', 'status', 'sort'], { required: ['name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
  registerCrud(app, 'course_sessions', ['course_id', 'campus_id', 'teacher_id', 'title', 'start_date', 'end_date', 'schedule_text', 'registration_deadline', 'capacity', 'trial_available', 'status', 'sort'], { required: ['course_id', 'title'], publicWhere: "status='open'", publicOrder: 'sort,id' });
  registerCrud(app, 'education_cases', ['slug', 'title', 'case_kind', 'grade_band', 'student_count', 'duration_text', 'challenge', 'solution', 'outcomes_json', 'cover', 'gallery_json', 'visibility', 'status', 'sort'], { required: ['slug', 'title'], publicWhere: "status='published' AND visibility='public'", publicOrder: 'sort,id' });
  registerCrud(app, 'categories', ['slug', 'name', 'sort'], { required: ['slug', 'name'] });
  registerCrud(app, 'reviews', ['source', 'title', 'excerpt', 'url', 'cover', 'logo', 'sort'], { required: ['source', 'title'] });
  registerCrud(app, 'videos', ['title', 'source', 'url', 'cover', 'sort'], { required: ['title'] });
  registerCrud(app, 'scenes', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
  registerCrud(app, 'academy', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
  registerCrud(app, 'downloads', ['name', 'platform', 'size', 'version', 'url', 'sort'], { required: ['name'] });
  registerCrud(app, 'printers', ['slug', 'name', 'brand', 'category', 'tagline', 'image', 'price_text', 'price_num', 'build_volume', 'build_volume_l', 'max_speed', 'max_accel', 'nozzle_temp', 'bed_temp', 'min_layer', 'filament_diameter', 'materials', 'bed_type', 'leveling', 'connectivity', 'screen', 'camera', 'multi_color', 'noise', 'weight', 'slicer', 'highlights_json', 'specs_json', 'official_url', 'source_label', 'verified_at', 'relationship', 'featured', 'sort', 'status'], { required: ['slug', 'name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
  registerCrud(app, 'heroes', ['title', 'highlight', 'subtitle', 'lead', 'tag', 'image', 'link', 'link_text', 'link2', 'link2_text', 'sort', 'status'], { required: ['title'], publicWhere: "status='published'", publicOrder: 'sort, id' });
  registerCrud(app, 'partners', ['name', 'province', 'city', 'service_type', 'phone', 'address', 'status', 'sort'], { required: ['name'] });
};
