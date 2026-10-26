// 起元星启 — 课程、设备参考与教育运营 API
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (IS_PROD ? '' : 'qiyuan-xingqi-development-secret-change-me');
if (IS_PROD && !SESSION_SECRET) throw new Error('生产环境必须配置 SESSION_SECRET');

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + safeExt);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error('仅支持 jpg / png / webp / gif 图片，且不超过 5MB'));
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: '未登录' });
}

function requireCustomer(req, res, next) {
  if (req.session && req.session.customer) return next();
  return res.status(401).json({ error: '请先登录起元星启账户' });
}

// ============ 企业微信机器人通知 ============
// Webhook 优先级：环境变量 WECOM_WEBHOOK_URL > 后台「站点设置 → 通知设置」
function notifyWeCom(title, fields) {
  const webhook = String(process.env.WECOM_WEBHOOK_URL || '').trim()
    || String(db.prepare('SELECT value FROM settings WHERE key=?').get('wecom_webhook_url')?.value || '').trim();
  if (!webhook) return;
  const lines = fields.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `**${k}：**${String(v).trim()}`);
  const content = `### ${title}\n${lines.join('\n')}\n> 提交时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`;
  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content } })
  }).then(r => r.json()).then(j => {
    if (j.errcode) console.error('[wecom notify]', j.errcode, j.errmsg);
  }).catch(e => console.error('[wecom notify]', e.message));
}

function customerPublic(customer) {
  return { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, status: customer.status, created_at: customer.created_at };
}

function orderNumber() {
  return `YQ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function parseProduct(product) {
  product.spec = parseJSON(product.spec_json, {});
  product.gallery = parseJSON(product.gallery_json, []);
  product.colors = parseJSON(product.colors_json, []);
  product.kits = parseJSON(product.kits_json, []);
  product.features = parseJSON(product.feature_json, []);
  delete product.spec_json;
  delete product.gallery_json;
  delete product.colors_json;
  delete product.kits_json;
  delete product.feature_json;
  return product;
}

function safeLink(value = '') {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { return new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
}

function isExternal(url = '') { return /^https:\/\//i.test(url); }

function crud(table, fields, options = {}) {
  const required = options.required || [];
  const validate = options.validate || (() => null);
  const publicOrder = options.publicOrder || 'sort, id';
  const publicWhere = options.publicWhere || '';
  const adminOrder = options.adminOrder || 'sort, id DESC';

  app.get(`/api/${table}`, (req, res) => {
    const limit = Number(req.query.limit) || 0;
    const sql = `SELECT * FROM ${table}${publicWhere ? ' WHERE ' + publicWhere : ''} ORDER BY ${publicOrder}${limit ? ' LIMIT ?' : ''}`;
    res.json(limit ? db.prepare(sql).all(limit) : db.prepare(sql).all());
  });

  app.get(`/api/admin/${table}`, requireAdmin, (req, res) => {
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${adminOrder}`).all());
  });

  app.get(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  app.post(`/api/admin/${table}`, requireAdmin, (req, res) => {
    const body = req.body || {};
    for (const key of required) {
      if (!String(body[key] || '').trim()) return res.status(400).json({ error: `${key} 必填` });
    }
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const cols = fields.join(',');
    const placeholders = fields.map(() => '?').join(',');
    const values = fields.map(f => body[f] == null ? '' : body[f]);
    try {
      const r = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...values);
      res.json({ ok: true, id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.put(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const body = req.body || {};
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const sets = fields.map(f => `${f}=?`).join(',');
    const values = fields.map(f => body[f] == null ? '' : body[f]);
    db.prepare(`UPDATE ${table} SET ${sets} WHERE id=?`).run(...values, req.params.id);
    res.json({ ok: true });
  });

  app.delete(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    res.json({ ok: true });
  });
}

// ============ 前台 API ============
app.get('/api/products', (req, res) => {
  const rows = db.prepare(`SELECT p.id, p.slug, p.name, p.subtitle, p.tag, p.price, p.description, p.image_svg, p.hero_image, p.card_image, p.spec_json, p.gallery_json, p.colors_json, p.kits_json, p.feature_json, p.relationship, p.official_url, p.source_label, p.relationship_disclaimer, p.spec_source, p.spec_verified_at, p.featured_home, p.status, p.sort, c.slug AS cat_slug, c.name AS cat_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status IN ('published','soon') ORDER BY p.sort, p.id`).all().map(parseProduct);
  res.json(rows);
});

app.get('/api/products/:slug', (req, res) => {
  const p = db.prepare(`SELECT p.*, c.slug AS cat_slug, c.name AS cat_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ?`).get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(parseProduct(p));
});

	const TEACHING_NEWS_TAGS = ['行业动态', '课堂方法', '学生教学', '软件选型'];
	const teachingNewsPlaceholders = TEACHING_NEWS_TAGS.map(() => '?').join(',');
	const newsOrderSql = `CASE WHEN tag='行业动态' THEN 0 ELSE 1 END, datetime(published_at) DESC, id DESC`;

	app.get('/api/news', (req, res) => {
	  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
	  const tag = String(req.query.tag || '').trim();
	  const tags = TEACHING_NEWS_TAGS.includes(tag) ? [tag] : TEACHING_NEWS_TAGS;
	  const placeholders = tags.map(() => '?').join(',');
	  res.json(db.prepare(`SELECT * FROM news WHERE status='published' AND tag IN (${placeholders}) ORDER BY ${newsOrderSql} LIMIT ?`).all(...tags, limit));
	});

	app.get('/api/news/:slug', (req, res) => {
	  const n = db.prepare(`SELECT * FROM news WHERE slug = ? AND status='published' AND tag IN (${teachingNewsPlaceholders})`).get(req.params.slug, ...TEACHING_NEWS_TAGS);
	  if (!n) return res.status(404).json({ error: 'not found' });
	  res.json(n);
	});

app.get('/api/settings', (req, res) => {
  const obj = {};
  db.prepare('SELECT * FROM settings').all().forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

app.get('/api/ecosystem-platforms', (req, res) => {
  res.json(db.prepare("SELECT * FROM ecosystem_platforms WHERE status='published' ORDER BY sort,id").all().map(item => ({ ...item, url: safeLink(item.url) })).filter(item => item.url));
});

function competitionLink(value = '') {
  const url = String(value || '').trim();
  if (!url) return '';
  try { return new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
}

function publicCompetition(row) {
  return {
    ...row,
    official_url: competitionLink(row.official_url),
    registration_url: competitionLink(row.registration_url),
    notice_url: competitionLink(row.notice_url)
  };
}

app.get('/api/competitions', (req, res) => {
  const rows = db.prepare("SELECT * FROM competitions WHERE visibility='published' ORDER BY sort,id").all();
  res.json(rows.map(publicCompetition).filter(row => row.official_url));
});

app.get('/api/competitions/:slug', (req, res) => {
  const row = db.prepare("SELECT * FROM competitions WHERE slug=? AND visibility='published'").get(req.params.slug);
  if (!row) return res.status(404).json({ error: '竞赛入口不存在或尚未发布' });
  res.json(publicCompetition(row));
});

function courseCatalogIsPublic() {
  return db.prepare("SELECT value FROM settings WHERE key='course_catalog_visibility'").get()?.value === 'public';
}

app.get('/api/courses', (req, res) => {
  if (!courseCatalogIsPublic()) return res.json([]);
  const category = String(req.query.category || '').trim();
  const rows = db.prepare(`SELECT * FROM courses WHERE status='published'${category ? ' AND category=?' : ''} ORDER BY sort,id`).all(...(category ? [category] : []));
  res.json(rows.map(course => ({ ...course, syllabus: parseJSON(course.syllabus_json, []), outcomes: parseJSON(course.outcomes_json, []), gallery: parseJSON(course.gallery_json, []) })));
});

app.get('/api/courses/:slug', (req, res) => {
  if (!courseCatalogIsPublic()) return res.status(404).json({ error: '课程方案正在完善，暂未公开' });
  const course = db.prepare("SELECT * FROM courses WHERE slug=? AND status='published'").get(req.params.slug);
  if (!course) return res.status(404).json({ error: '课程不存在或尚未发布' });
  course.syllabus = parseJSON(course.syllabus_json, []);
  course.outcomes = parseJSON(course.outcomes_json, []);
  course.gallery = parseJSON(course.gallery_json, []);
  course.sessions = db.prepare("SELECT * FROM course_sessions WHERE course_id=? AND status IN ('open','draft') ORDER BY sort,id").all(course.id);
  res.json(course);
});

app.get('/api/teachers', (req, res) => res.json(db.prepare("SELECT * FROM teachers WHERE status='published' ORDER BY sort,id").all().map(t => ({ ...t, specialties: parseJSON(t.specialties_json, []), grade_bands: parseJSON(t.grade_bands_json, []) }))));
app.get('/api/campuses', (req, res) => res.json(db.prepare("SELECT * FROM campuses WHERE status='published' ORDER BY sort,id").all().map(c => ({ ...c, facilities: parseJSON(c.facilities_json, []) }))));
app.get('/api/education-cases', (req, res) => res.json(db.prepare("SELECT * FROM education_cases WHERE status='published' AND visibility='public' ORDER BY sort,id").all().map(c => ({ ...c, outcomes: parseJSON(c.outcomes_json, []), gallery: parseJSON(c.gallery_json, []) }))));

app.post('/api/enrollment-inquiries', (req, res) => {
  const { lead_type, parent_name, parent_phone, parent_wechat, student_grade, course_id, campus_id, preferred_time, experience_level, message, privacy_consent, privacy_version } = req.body || {};
  if (!parent_name || !parent_phone) return res.status(400).json({ error: '请填写监护人姓名和联系电话' });
  if (!privacy_consent) return res.status(400).json({ error: '请阅读并同意隐私说明后提交' });
  const result = db.prepare(`INSERT INTO enrollment_inquiries (lead_type,parent_name,parent_phone,parent_wechat,student_grade,course_id,campus_id,preferred_time,experience_level,message,privacy_consent,privacy_version,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'))`)
    .run(String(lead_type || 'trial'), String(parent_name).trim(), String(parent_phone).trim(), String(parent_wechat || '').trim(), String(student_grade || '').trim(), Number(course_id) || null, Number(campus_id) || null, String(preferred_time || '').trim(), String(experience_level || '').trim(), String(message || '').trim(), 1, String(privacy_version || '2026.09').trim());
  const leadTypeLabel = { trial: '体验课预约', school: '学校合作咨询', competition: '竞赛咨询' }[String(lead_type || 'trial')] || '预约咨询';
  const courseRow = Number(course_id) ? db.prepare('SELECT title FROM courses WHERE id=?').get(Number(course_id)) : null;
  const campusRow = Number(campus_id) ? db.prepare('SELECT name FROM campuses WHERE id=?').get(Number(campus_id)) : null;
  notifyWeCom(`【起元星启】新的${leadTypeLabel}`, [
    ['监护人', parent_name], ['电话', parent_phone], ['微信号', parent_wechat],
    ['学生年级', student_grade], ['意向课程', courseRow?.title], ['校区', campusRow?.name],
    ['期望时间', preferred_time], ['已有基础', experience_level], ['留言', message]
  ]);
  res.json({ ok: true, id: result.lastInsertRowid });
});

app.get('/api/heroes', (req, res) => {
  res.json(db.prepare("SELECT * FROM heroes WHERE status='published' ORDER BY sort, id").all());
});

app.post('/api/leads', (req, res) => {
  const { name, company, phone, email, scene, message, source } = req.body || {};
  if (!name && !phone && !email) return res.status(400).json({ error: '请填写联系信息' });
  db.prepare('INSERT INTO leads (name, company, phone, email, scene, message, source) VALUES (?,?,?,?,?,?,?)')
    .run(name || '', company || '', phone || '', email || '', scene || '', message || '', source || 'website');
  notifyWeCom('【起元星启】新的通用咨询', [
    ['姓名', name], ['公司/单位', company], ['电话', phone], ['邮箱', email],
    ['场景', scene], ['留言', message], ['来源', source]
  ]);
  res.json({ ok: true });
});

// ============ 消费者账户与报价订单 API ============
app.post('/api/account/register', (req, res) => {
  const { email, password, name, phone } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ error: '请输入有效邮箱' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  try {
    const result = db.prepare('INSERT INTO customers (email,password_hash,name,phone) VALUES (?,?,?,?)').run(String(email).trim().toLowerCase(), bcrypt.hashSync(String(password), 10), String(name || '').trim(), String(phone || '').trim());
    const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(result.lastInsertRowid);
    req.session.customer = customerPublic(customer);
    res.json({ ok: true, customer: req.session.customer });
  } catch { res.status(400).json({ error: '该邮箱已注册，请直接登录' }); }
});

app.post('/api/account/login', (req, res) => {
  const { email, password } = req.body || {};
  const customer = db.prepare('SELECT * FROM customers WHERE email=?').get(String(email || '').trim().toLowerCase());
  if (!customer || customer.status !== 'active' || !bcrypt.compareSync(String(password || ''), customer.password_hash)) return res.status(401).json({ error: '邮箱或密码错误' });
  req.session.customer = customerPublic(customer);
  res.json({ ok: true, customer: req.session.customer });
});

app.post('/api/account/logout', (req, res) => { delete req.session.customer; res.json({ ok: true }); });
app.get('/api/account/me', (req, res) => { if (!req.session.customer) return res.status(401).json({ error: '未登录' }); res.json(req.session.customer); });

app.put('/api/account/profile', requireCustomer, (req, res) => {
  const { name, phone } = req.body || {};
  db.prepare('UPDATE customers SET name=?,phone=? WHERE id=?').run(String(name || '').trim(), String(phone || '').trim(), req.session.customer.id);
  const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(req.session.customer.id);
  req.session.customer = customerPublic(customer); res.json({ ok: true, customer: req.session.customer });
});

app.get('/api/account/addresses', requireCustomer, (req, res) => res.json(db.prepare('SELECT * FROM customer_addresses WHERE customer_id=? ORDER BY is_default DESC,id DESC').all(req.session.customer.id)));
app.post('/api/account/addresses', requireCustomer, (req, res) => {
  const { recipient, phone, province, city, district, detail, is_default } = req.body || {};
  if (!recipient || !detail) return res.status(400).json({ error: '收件人和详细地址必填' });
  const customerId = req.session.customer.id;
  if (is_default) db.prepare('UPDATE customer_addresses SET is_default=0 WHERE customer_id=?').run(customerId);
  const result = db.prepare('INSERT INTO customer_addresses (customer_id,recipient,phone,province,city,district,detail,is_default) VALUES (?,?,?,?,?,?,?,?)').run(customerId, recipient, phone || '', province || '', city || '', district || '', detail, is_default ? 1 : 0);
  res.json({ ok: true, id: result.lastInsertRowid });
});
app.delete('/api/account/addresses/:id', requireCustomer, (req, res) => { db.prepare('DELETE FROM customer_addresses WHERE id=? AND customer_id=?').run(req.params.id, req.session.customer.id); res.json({ ok: true }); });

app.get('/api/shop/skus', (req, res) => res.json(db.prepare("SELECT s.*,p.slug AS product_slug FROM catalog_skus s LEFT JOIN products p ON p.id=s.product_id WHERE s.status='published' ORDER BY s.sort,id").all()));
app.get('/api/cart', requireCustomer, (req, res) => {
  const cart = db.prepare('SELECT * FROM carts WHERE customer_id=?').get(req.session.customer.id);
  if (!cart) return res.json([]);
  res.json(db.prepare('SELECT i.id,i.quantity,s.id AS sku_id,s.slug,s.name,s.variant,s.price,s.cover FROM cart_items i JOIN catalog_skus s ON s.id=i.sku_id WHERE i.cart_id=? ORDER BY i.id DESC').all(cart.id));
});
app.post('/api/cart/items', requireCustomer, (req, res) => {
  const skuId = Number((req.body || {}).sku_id), quantity = Math.max(1, Math.min(99, Number((req.body || {}).quantity) || 1));
  const sku = db.prepare("SELECT id FROM catalog_skus WHERE id=? AND status='published'").get(skuId);
  if (!sku) return res.status(404).json({ error: '选购项目不存在' });
  const customerId = req.session.customer.id;
  db.prepare('INSERT OR IGNORE INTO carts (customer_id) VALUES (?)').run(customerId);
  const cart = db.prepare('SELECT * FROM carts WHERE customer_id=?').get(customerId);
  db.prepare('INSERT INTO cart_items (cart_id,sku_id,quantity) VALUES (?,?,?) ON CONFLICT(cart_id,sku_id) DO UPDATE SET quantity=quantity+excluded.quantity').run(cart.id, skuId, quantity);
  db.prepare("UPDATE carts SET updated_at=datetime('now','localtime') WHERE id=?").run(cart.id);
  res.json({ ok: true });
});
app.put('/api/cart/items/:id', requireCustomer, (req, res) => { const q=Math.max(1,Math.min(99,Number((req.body||{}).quantity)||1)); db.prepare('UPDATE cart_items SET quantity=? WHERE id=? AND cart_id IN (SELECT id FROM carts WHERE customer_id=?)').run(q,req.params.id,req.session.customer.id); res.json({ok:true}); });
app.delete('/api/cart/items/:id', requireCustomer, (req,res)=>{db.prepare('DELETE FROM cart_items WHERE id=? AND cart_id IN (SELECT id FROM carts WHERE customer_id=?)').run(req.params.id,req.session.customer.id);res.json({ok:true});});

app.post('/api/orders', requireCustomer, (req, res) => {
  const customerId=req.session.customer.id, { address_id, note }=req.body||{};
  const cart=db.prepare('SELECT * FROM carts WHERE customer_id=?').get(customerId);
  const items=cart?db.prepare('SELECT i.quantity,s.id AS sku_id,s.name,s.variant,s.price FROM cart_items i JOIN catalog_skus s ON s.id=i.sku_id WHERE i.cart_id=?').all(cart.id):[];
  if (!items.length) return res.status(400).json({error:'购物袋为空'});
  if (address_id && !db.prepare('SELECT id FROM customer_addresses WHERE id=? AND customer_id=?').get(address_id,customerId)) return res.status(400).json({error:'地址不属于当前账户'});
  const no=orderNumber(), total=items.map(x=>`${x.name} × ${x.quantity}`).join('；');
  const tx=db.transaction(()=>{const r=db.prepare('INSERT INTO orders (order_no,customer_id,address_id,note,total_text) VALUES (?,?,?,?,?)').run(no,customerId,address_id||null,String(note||''),total);items.forEach(x=>db.prepare('INSERT INTO order_items (order_id,sku_id,name,variant,price,quantity) VALUES (?,?,?,?,?,?)').run(r.lastInsertRowid,x.sku_id,x.name,x.variant,x.price,x.quantity));db.prepare('DELETE FROM cart_items WHERE cart_id=?').run(cart.id);}); tx();
  res.json({ok:true,order_no:no});
});
app.get('/api/orders',requireCustomer,(req,res)=>res.json(db.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id)));
app.get('/api/orders/:no',requireCustomer,(req,res)=>{const o=db.prepare('SELECT * FROM orders WHERE order_no=? AND customer_id=?').get(req.params.no,req.session.customer.id);if(!o)return res.status(404).json({error:'订单不存在'});o.items=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);res.json(o);});
app.post('/api/after-sales',requireCustomer,(req,res)=>{const {order_no,type,reason}=req.body||{};const o=db.prepare('SELECT id FROM orders WHERE order_no=? AND customer_id=?').get(order_no,req.session.customer.id);if(!o)return res.status(404).json({error:'订单不存在'});db.prepare('INSERT INTO after_sales (order_id,customer_id,type,reason) VALUES (?,?,?,?)').run(o.id,req.session.customer.id,String(type||'repair'),String(reason||''));res.json({ok:true});});

app.post('/api/devices/register', requireCustomer, (req,res)=>{const {serial_no,product_name,purchase_date,channel}=req.body||{};if(!serial_no||!product_name)return res.status(400).json({error:'序列号和设备型号必填'});let device=db.prepare('SELECT * FROM devices WHERE serial_no=?').get(String(serial_no).trim());if(device&&db.prepare('SELECT id FROM device_bindings WHERE device_id=?').get(device.id))return res.status(400).json({error:'该设备已绑定其他账户'});if(!device){const r=db.prepare("INSERT INTO devices (serial_no,product_name,purchase_date,channel,warranty_until) VALUES (?,?,?,?,date('now','+365 days'))").run(String(serial_no).trim(),String(product_name).trim(),String(purchase_date||''),String(channel||''));device=db.prepare('SELECT * FROM devices WHERE id=?').get(r.lastInsertRowid);}db.prepare('INSERT OR IGNORE INTO device_bindings (device_id,customer_id) VALUES (?,?)').run(device.id,req.session.customer.id);res.json({ok:true,device});});
app.get('/api/devices',requireCustomer,(req,res)=>res.json(db.prepare('SELECT d.* FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE b.customer_id=? ORDER BY b.id DESC').all(req.session.customer.id)));
app.get('/api/devices/:sn',requireCustomer,(req,res)=>{const d=db.prepare('SELECT d.* FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE d.serial_no=? AND b.customer_id=?').get(req.params.sn,req.session.customer.id);if(!d)return res.status(404).json({error:'设备不存在'});d.tickets=db.prepare('SELECT * FROM service_tickets WHERE device_id=? AND customer_id=? ORDER BY id DESC').all(d.id,req.session.customer.id);res.json(d);});

app.post('/api/submissions',requireCustomer,(req,res)=>{const {title,description,license}=req.body||{};if(!title)return res.status(400).json({error:'作品标题必填'});const r=db.prepare('INSERT INTO creator_submissions (customer_id,title,description,license) VALUES (?,?,?,?)').run(req.session.customer.id,title,String(description||''),String(license||''));res.json({ok:true,id:r.lastInsertRowid});});
app.get('/api/submissions',requireCustomer,(req,res)=>res.json(db.prepare('SELECT * FROM creator_submissions WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id)));
app.get('/api/partners', (req,res)=>{const city=String(req.query.city||'').trim();const type=String(req.query.type||'').trim();const clauses=["status='active'"],values=[];if(city){clauses.push('(city LIKE ? OR province LIKE ?)');values.push(`%${city}%`,`%${city}%`)}if(type){clauses.push('service_type LIKE ?');values.push(`%${type}%`)}res.json(db.prepare(`SELECT * FROM partners WHERE ${clauses.join(' AND ')} ORDER BY sort,id`).all(...values));});
app.post('/api/partner-applications',(req,res)=>{const {company,contact_name,phone,email,application_type,city,description}=req.body||{};if(!company||!contact_name||(!phone&&!email))return res.status(400).json({error:'请填写企业、联系人及联系方式'});db.prepare('INSERT INTO partner_applications (company,contact_name,phone,email,application_type,city,description) VALUES (?,?,?,?,?,?,?)').run(company,contact_name,phone||'',email||'',application_type||'',city||'',description||'');res.json({ok:true});});

app.post('/api/subs', (req, res) => {
  const email = (req.body && req.body.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: '请输入有效邮箱' });
  try {
    db.prepare('INSERT INTO subs (email) VALUES (?)').run(email);
  } catch {
    return res.json({ ok: true, dup: true });
  }
  res.json({ ok: true });
});

function parseContent(item) {
  item.meta = parseJSON(item.meta_json, {});
  delete item.meta_json;
  return item;
}

app.get('/api/content', (req, res) => {
  const type = String(req.query.type || '').trim();
  const tag = String(req.query.tag || '').trim();
  const limit = Math.min(Number(req.query.limit) || 100, 100);
  const clauses = ["status='published'"];
  const values = [];
  if (type) { clauses.push('type=?'); values.push(type); }
  if (tag) { clauses.push('tag=?'); values.push(tag); }
  values.push(limit);
  res.json(db.prepare(`SELECT * FROM content_items WHERE ${clauses.join(' AND ')} ORDER BY sort, id DESC LIMIT ?`).all(...values).map(parseContent));
});

app.get('/api/content/:type/:slug', (req, res) => {
  const item = db.prepare("SELECT * FROM content_items WHERE type=? AND slug=? AND status='published'").get(req.params.type, req.params.slug);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(parseContent(item));
});

app.get('/api/tickets/mine', requireCustomer, (req, res) => {
  res.json(db.prepare('SELECT * FROM service_tickets WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id));
});

app.post('/api/tickets', (req, res) => {
  const { name, phone, email, product, serial_no, subject, description, source, order_no } = req.body || {};
  const customer = req.session && req.session.customer;
  const resolvedName = String(name || customer?.name || '').trim();
  const resolvedPhone = String(phone || customer?.phone || '').trim();
  const resolvedEmail = String(email || customer?.email || '').trim();
  if (!resolvedName || (!resolvedPhone && !resolvedEmail)) return res.status(400).json({ error: '请填写姓名及至少一种联系方式' });
  let deviceId = null;
  if (customer && serial_no) deviceId = db.prepare('SELECT d.id FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE d.serial_no=? AND b.customer_id=?').get(String(serial_no).trim(), customer.id)?.id || null;
  db.prepare('INSERT INTO service_tickets (name,phone,email,product,serial_no,subject,description,source,customer_id,device_id,order_no) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(resolvedName, resolvedPhone, resolvedEmail, String(product || '').trim(), String(serial_no || '').trim(), String(subject || '').trim(), String(description || '').trim(), String(source || 'support-ticket').trim(), customer?.id || null, deviceId, String(order_no || '').trim());
  res.json({ ok: true });
});

crud('ecosystem_platforms', ['slug','name','platform_type','brand_owner','description','url','cover','relationship','disclaimer','link_label','last_verified_at','status','sort'], { required: ['slug','name','url'], publicWhere: "status='published'", publicOrder: 'sort,id', validate: body => safeLink(body.url) ? null : '生态平台链接仅支持 HTTPS 官方链接或站内路径' });
crud('competitions', ['slug','title','category','organizer','fit','region','group_text','competition_status','official_url','registration_url','notice_url','source_label','cover','image_type','image_alt','image_source','screenshot_taken_at','verified_at','visibility','sort'], {
  required: ['slug', 'title', 'official_url'],
  publicWhere: "visibility='published'",
  publicOrder: 'sort,id',
  validate: body => {
    if (!competitionLink(body.official_url)) return '官网链接必须是 HTTPS 地址';
    if (body.registration_url && !competitionLink(body.registration_url)) return '报名链接必须是 HTTPS 地址';
    if (body.notice_url && !competitionLink(body.notice_url)) return '官方通知链接必须是 HTTPS 地址';
    return null;
  }
});
crud('courses', ['code','slug','title','subtitle','category','grade_min','grade_max','target_audience','level','delivery_mode','total_sessions','total_hours','price_text','description','syllabus_json','outcomes_json','cover','gallery_json','status','sort','seo_title','seo_description'], { required: ['code','slug','title'], publicWhere: "status='published'", publicOrder: 'sort,id' });
crud('teachers', ['slug','name','role','avatar','bio','specialties_json','grade_bands_json','status','sort'], { required: ['slug','name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
crud('campuses', ['name','city','district','address','transport','opening_hours','phone','cover','facilities_json','status','sort'], { required: ['name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
crud('course_sessions', ['course_id','campus_id','teacher_id','title','start_date','end_date','schedule_text','registration_deadline','capacity','trial_available','status','sort'], { required: ['course_id','title'], publicWhere: "status='open'", publicOrder: 'sort,id' });
crud('education_cases', ['slug','title','case_kind','grade_band','student_count','duration_text','challenge','solution','outcomes_json','cover','gallery_json','visibility','status','sort'], { required: ['slug','title'], publicWhere: "status='published' AND visibility='public'", publicOrder: 'sort,id' });
crud('categories', ['slug', 'name', 'sort'], { required: ['slug', 'name'] });
crud('reviews', ['source', 'title', 'excerpt', 'url', 'cover', 'logo', 'sort'], { required: ['source', 'title'] });
crud('videos', ['title', 'source', 'url', 'cover', 'sort'], { required: ['title'] });
crud('scenes', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
crud('academy', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
crud('downloads', ['name', 'platform', 'size', 'version', 'url', 'sort'], { required: ['name'] });
crud('printers', ['slug','name','brand','category','tagline','image','price_text','price_num','build_volume','build_volume_l','max_speed','max_accel','nozzle_temp','bed_temp','min_layer','filament_diameter','materials','bed_type','leveling','connectivity','screen','camera','multi_color','noise','weight','slicer','highlights_json','specs_json','official_url','source_label','verified_at','relationship','featured','sort','status'], { required: ['slug','name'], publicWhere: "status='published'", publicOrder: 'sort,id' });
crud('heroes', ['title', 'highlight', 'subtitle', 'lead', 'tag', 'image', 'link', 'link_text', 'link2', 'link2_text', 'sort', 'status'], {
  required: ['title'],
  publicWhere: "status='published'",
  publicOrder: 'sort, id'
});

// ============ 后台 API ============
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u || !bcrypt.compareSync(password || '', u.password_hash))
    return res.status(401).json({ error: '账号或密码错误' });
  req.session.user = { id: u.id, username: u.username, name: u.name, role: u.role };
  res.json({ ok: true, user: req.session.user });
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
  if (!next || String(next).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.session.user.id);
  if (!u || !bcrypt.compareSync(current || '', u.password_hash))
    return res.status(400).json({ error: '当前密码不正确' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(next), 10), u.id);
  res.json({ ok: true });
});

app.get('/api/admin/content', requireAdmin, (req, res) => {
  const type = String(req.query.type || '').trim();
  const sql = `SELECT * FROM content_items${type ? ' WHERE type=?' : ''} ORDER BY type, sort, id DESC`;
  res.json((type ? db.prepare(sql).all(type) : db.prepare(sql).all()).map(parseContent));
});

app.get('/api/admin/content/:id', requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM content_items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(parseContent(item));
});

app.post('/api/admin/content', requireAdmin, (req, res) => {
  const { type, slug, title, summary, body, cover, tag, meta, status, sort, published_at } = req.body || {};
  if (!type || !slug || !title) return res.status(400).json({ error: '类型、slug 与标题必填' });
  try {
    const result = db.prepare(`INSERT INTO content_items (type,slug,title,summary,body,cover,tag,meta_json,status,sort,published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,COALESCE(NULLIF(?,''),datetime('now','localtime')))`)
      .run(type, slug, title, summary || '', body || '', cover || '', tag || '', JSON.stringify(meta || {}), status || 'published', Number(sort) || 0, published_at || '');
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.put('/api/admin/content/:id', requireAdmin, (req, res) => {
  const { type, slug, title, summary, body, cover, tag, meta, status, sort, published_at } = req.body || {};
  if (!type || !slug || !title) return res.status(400).json({ error: '类型、slug 与标题必填' });
  try {
    db.prepare(`UPDATE content_items SET type=?,slug=?,title=?,summary=?,body=?,cover=?,tag=?,meta_json=?,status=?,sort=?,published_at=COALESCE(NULLIF(?,''),published_at),updated_at=datetime('now','localtime') WHERE id=?`)
      .run(type, slug, title, summary || '', body || '', cover || '', tag || '', JSON.stringify(meta || {}), status || 'published', Number(sort) || 0, published_at || '', req.params.id);
    res.json({ ok: true });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/admin/content/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM content_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/tickets', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM service_tickets ORDER BY id DESC LIMIT 200').all());
});

app.put('/api/admin/tickets/:id', requireAdmin, (req, res) => {
  const status = String((req.body || {}).status || 'new');
  db.prepare('UPDATE service_tickets SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/tickets/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM service_tickets WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/enrollment-inquiries', requireAdmin, (req,res) => res.json(db.prepare(`SELECT e.*,c.title AS course_title,p.name AS campus_name FROM enrollment_inquiries e LEFT JOIN courses c ON c.id=e.course_id LEFT JOIN campuses p ON p.id=e.campus_id ORDER BY e.id DESC`).all()));
app.put('/api/admin/enrollment-inquiries/:id', requireAdmin, (req,res) => { const body=req.body||{}; db.prepare('UPDATE enrollment_inquiries SET status=?,follow_up_note=? WHERE id=?').run(String(body.status||'new'),String(body.follow_up_note||''),req.params.id); res.json({ok:true}); });
app.delete('/api/admin/enrollment-inquiries/:id', requireAdmin, (req,res) => { db.prepare('DELETE FROM enrollment_inquiries WHERE id=?').run(req.params.id); res.json({ok:true}); });

app.get('/api/admin/customers', requireAdmin, (req,res) => res.json(db.prepare('SELECT id,email,name,phone,status,created_at FROM customers ORDER BY id DESC').all()));
app.put('/api/admin/customers/:id', requireAdmin, (req,res) => { db.prepare('UPDATE customers SET status=? WHERE id=?').run(String((req.body||{}).status||'active'),req.params.id);res.json({ok:true}); });
app.get('/api/admin/skus', requireAdmin, (req,res) => res.json(db.prepare('SELECT s.*,p.name AS product_name FROM catalog_skus s LEFT JOIN products p ON p.id=s.product_id ORDER BY s.sort,s.id DESC').all()));
app.post('/api/admin/skus', requireAdmin, (req,res) => { const b=req.body||{};if(!b.slug||!b.name)return res.status(400).json({error:'slug 与名称必填'});try{const r=db.prepare('INSERT INTO catalog_skus (product_id,slug,name,variant,price,cover,status,sort) VALUES (?,?,?,?,?,?,?,?)').run(b.product_id||null,b.slug,b.name,b.variant||'',b.price||'',b.cover||'',b.status||'published',Number(b.sort)||0);res.json({ok:true,id:r.lastInsertRowid});}catch(e){res.status(400).json({error:e.message});} });
app.put('/api/admin/skus/:id', requireAdmin, (req,res) => {const b=req.body||{};db.prepare('UPDATE catalog_skus SET product_id=?,slug=?,name=?,variant=?,price=?,cover=?,status=?,sort=? WHERE id=?').run(b.product_id||null,b.slug,b.name,b.variant||'',b.price||'',b.cover||'',b.status||'published',Number(b.sort)||0,req.params.id);res.json({ok:true});});
app.delete('/api/admin/skus/:id', requireAdmin, (req,res)=>{db.prepare('DELETE FROM catalog_skus WHERE id=?').run(req.params.id);res.json({ok:true});});
app.get('/api/admin/orders', requireAdmin, (req,res)=>res.json(db.prepare('SELECT o.*,c.email,c.name FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC').all()));
app.put('/api/admin/orders/:id', requireAdmin, (req,res)=>{db.prepare('UPDATE orders SET status=? WHERE id=?').run(String((req.body||{}).status||'pending_review'),req.params.id);res.json({ok:true});});
app.get('/api/admin/after-sales', requireAdmin, (req,res)=>res.json(db.prepare('SELECT a.*,o.order_no,c.email,c.name FROM after_sales a JOIN orders o ON o.id=a.order_id JOIN customers c ON c.id=a.customer_id ORDER BY a.id DESC').all()));
app.put('/api/admin/after-sales/:id', requireAdmin, (req,res)=>{db.prepare('UPDATE after_sales SET status=? WHERE id=?').run(String((req.body||{}).status||'new'),req.params.id);res.json({ok:true});});
app.get('/api/admin/devices', requireAdmin, (req,res)=>res.json(db.prepare('SELECT d.*,c.email,c.name FROM devices d LEFT JOIN device_bindings b ON b.device_id=d.id LEFT JOIN customers c ON c.id=b.customer_id ORDER BY d.id DESC').all()));
app.get('/api/admin/submissions', requireAdmin, (req,res)=>res.json(db.prepare('SELECT s.*,c.email,c.name FROM creator_submissions s JOIN customers c ON c.id=s.customer_id ORDER BY s.id DESC').all()));
app.put('/api/admin/submissions/:id', requireAdmin, (req,res)=>{const b=req.body||{};db.prepare('UPDATE creator_submissions SET status=?,admin_note=? WHERE id=?').run(String(b.status||'pending'),String(b.admin_note||''),req.params.id);res.json({ok:true});});
crud('partners', ['name','province','city','service_type','phone','address','status','sort'], {required:['name']});
app.get('/api/admin/partner-applications', requireAdmin, (req,res)=>res.json(db.prepare('SELECT * FROM partner_applications ORDER BY id DESC').all()));
app.put('/api/admin/partner-applications/:id', requireAdmin, (req,res)=>{db.prepare('UPDATE partner_applications SET status=? WHERE id=?').run(String((req.body||{}).status||'new'),req.params.id);res.json({ok:true});});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({
    products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
    news: db.prepare('SELECT COUNT(*) c FROM news').get().c,
    leads: db.prepare('SELECT COUNT(*) c FROM leads').get().c,
    subs: db.prepare('SELECT COUNT(*) c FROM subs').get().c,
    pendingLeads: db.prepare("SELECT COUNT(*) c FROM leads WHERE status='new'").get().c,
    categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    scenes: db.prepare('SELECT COUNT(*) c FROM scenes').get().c,
    academy: db.prepare('SELECT COUNT(*) c FROM academy').get().c,
    videos: db.prepare('SELECT COUNT(*) c FROM videos').get().c,
    reviews: db.prepare('SELECT COUNT(*) c FROM reviews').get().c,
    downloads: db.prepare('SELECT COUNT(*) c FROM downloads').get().c,
    heroes: db.prepare('SELECT COUNT(*) c FROM heroes').get().c,
    content: db.prepare('SELECT COUNT(*) c FROM content_items').get().c,
    tickets: db.prepare('SELECT COUNT(*) c FROM service_tickets').get().c,
    customers: db.prepare('SELECT COUNT(*) c FROM customers').get().c,
    orders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
    afterSales: db.prepare('SELECT COUNT(*) c FROM after_sales').get().c,
    devices: db.prepare('SELECT COUNT(*) c FROM devices').get().c,
    submissions: db.prepare("SELECT COUNT(*) c FROM creator_submissions WHERE status='pending'").get().c,
    partnerApplications: db.prepare("SELECT COUNT(*) c FROM partner_applications WHERE status='new'").get().c,
    enrollmentInquiries: db.prepare("SELECT COUNT(*) c FROM enrollment_inquiries WHERE status='new'").get().c,
    courses: db.prepare('SELECT COUNT(*) c FROM courses').get().c,
  });
});

app.get('/api/admin/leads', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 200').all());
});

app.put('/api/admin/leads/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  db.prepare('UPDATE leads SET status=? WHERE id=?').run(status || 'new', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/leads/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/subs', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM subs ORDER BY id DESC').all());
});

app.delete('/api/admin/subs/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM subs WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json(db.prepare(`SELECT p.id, p.slug, p.name, p.subtitle, p.category_id, p.tag, p.price, p.description, p.spec_json, p.image_svg, p.hero_image, p.card_image, p.gallery_json, p.colors_json, p.kits_json, p.feature_json, p.relationship, p.official_url, p.source_label, p.relationship_disclaimer, p.spec_source, p.spec_verified_at, p.featured_home, p.status, p.sort, c.name AS cat_name FROM products p
    LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.sort, p.id DESC`).all());
});

app.get('/api/admin/products/:id', requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(parseProduct(p));
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, features, relationship, official_url, source_label, relationship_disclaimer, spec_source, spec_verified_at, featured_home, status, sort } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: 'slug 与名称必填' });
  try {
    const r = db.prepare(`INSERT INTO products (slug,name,subtitle,category_id,tag,price,description,spec_json,image_svg,hero_image,card_image,gallery_json,colors_json,kits_json,feature_json,relationship,official_url,source_label,relationship_disclaimer,spec_source,spec_verified_at,featured_home,status,sort)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(slug, name, subtitle||'', category_id||null, tag||'', price||'',
      description||'', JSON.stringify(spec||{}), image_svg||'', hero_image||'', card_image||'', JSON.stringify(gallery||[]), JSON.stringify(colors||[]), JSON.stringify(kits||[]), JSON.stringify(features||[]), relationship||'training_reference', safeLink(official_url), source_label||'', relationship_disclaimer||'', spec_source||'', spec_verified_at||'', featured_home ? 1 : 0, status||'published', sort||0);
    res.json({ ok: true, id: r.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, features, relationship, official_url, source_label, relationship_disclaimer, spec_source, spec_verified_at, featured_home, status, sort } = req.body || {};
  db.prepare(`UPDATE products SET slug=?, name=?, subtitle=?, category_id=?, tag=?, price=?, description=?, spec_json=?, image_svg=?, hero_image=?, card_image=?, gallery_json=?, colors_json=?, kits_json=?, feature_json=?, relationship=?, official_url=?, source_label=?, relationship_disclaimer=?, spec_source=?, spec_verified_at=?, featured_home=?, status=?, sort=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(slug, name, subtitle||'', category_id||null, tag||'', price||'', description||'',
      JSON.stringify(spec||{}), image_svg||'', hero_image||'', card_image||'', JSON.stringify(gallery||[]), JSON.stringify(colors||[]), JSON.stringify(kits||[]), JSON.stringify(features||[]), relationship||'training_reference', safeLink(official_url), source_label||'', relationship_disclaimer||'', spec_source||'', spec_verified_at||'', featured_home ? 1 : 0, status||'published', sort||0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/news', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM news ORDER BY sort, id DESC').all());
});

app.post('/api/admin/news', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover, tag, status, sort } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: 'slug 与标题必填' });
  try {
    const r = db.prepare(`INSERT INTO news (slug,title,summary,body,cover,tag,status,sort) VALUES (?,?,?,?,?,?,?,?)`)
      .run(slug, title, summary||'', body||'', cover||'', tag||'', status||'published', sort||0);
    res.json({ ok: true, id: r.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover, tag, status, sort } = req.body || {};
  db.prepare(`UPDATE news SET slug=?, title=?, summary=?, body=?, cover=?, tag=?, status=?, sort=? WHERE id=?`)
    .run(slug, title, summary||'', body||'', cover||'', tag||'', status||'published', sort||0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const obj = req.body || {};
  const stmt = db.prepare(`INSERT INTO settings (key,value) VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  Object.entries(obj).forEach(([k, v]) => stmt.run(k, String(v ?? '')));
  res.json({ ok: true });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '请选择图片文件（jpg/png/webp/gif，最大 5MB）' });
    res.json({ ok: true, url: '/uploads/' + req.file.filename });
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// 使用品牌 Logo 作为轻量站点图标，避免浏览器在教育页发起 favicon 404 请求。
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'img', 'logo.svg')));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
app.get('/admin/*', (req, res) => {
  const p = path.join(__dirname, 'public', 'admin', req.path.replace(/^\/admin\//, ''));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return res.sendFile(p);
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`🟢 起元星启网站已启动: http://localhost:${PORT}`);
  console.log(`   后台管理: http://localhost:${PORT}/admin`);
  if (!IS_PROD) console.log('   开发环境默认账号见 README（首次请立即修改密码）');
});
