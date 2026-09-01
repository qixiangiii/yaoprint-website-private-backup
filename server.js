// 曜印 YAOPRINT — Express 后台与 API
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
const SESSION_SECRET = process.env.SESSION_SECRET || 'yaoprint-secret-key-change-me';

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

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

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
    cb(new Error('仅支持 jpg / png / webp / gif / svg 图片，且不超过 5MB'));
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: '未登录' });
}

function parseJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function parseProduct(product) {
  product.spec = parseJSON(product.spec_json, {});
  product.gallery = parseJSON(product.gallery_json, []);
  product.colors = parseJSON(product.colors_json, []);
  product.kits = parseJSON(product.kits_json, []);
  delete product.spec_json;
  delete product.gallery_json;
  delete product.colors_json;
  delete product.kits_json;
  return product;
}

function crud(table, fields, options = {}) {
  const required = options.required || [];
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
  const rows = db.prepare(`SELECT p.id, p.slug, p.name, p.subtitle, p.tag, p.price, p.description, p.image_svg, p.hero_image, p.card_image, p.spec_json, p.gallery_json, p.colors_json, p.kits_json, p.status, p.sort, c.slug AS cat_slug, c.name AS cat_name
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

app.get('/api/news', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(db.prepare("SELECT * FROM news WHERE status='published' ORDER BY sort, id DESC LIMIT ?").all(limit));
});

app.get('/api/news/:slug', (req, res) => {
  const n = db.prepare('SELECT * FROM news WHERE slug = ?').get(req.params.slug);
  if (!n) return res.status(404).json({ error: 'not found' });
  res.json(n);
});

app.get('/api/settings', (req, res) => {
  const obj = {};
  db.prepare('SELECT * FROM settings').all().forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

app.get('/api/heroes', (req, res) => {
  res.json(db.prepare("SELECT * FROM heroes WHERE status='published' ORDER BY sort, id").all());
});

app.post('/api/leads', (req, res) => {
  const { name, company, phone, email, scene, message, source } = req.body || {};
  if (!name && !phone && !email) return res.status(400).json({ error: '请填写联系信息' });
  db.prepare('INSERT INTO leads (name, company, phone, email, scene, message, source) VALUES (?,?,?,?,?,?,?)')
    .run(name || '', company || '', phone || '', email || '', scene || '', message || '', source || 'website');
  res.json({ ok: true });
});

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

crud('categories', ['slug', 'name', 'sort'], { required: ['slug', 'name'] });
crud('reviews', ['source', 'title', 'excerpt', 'url', 'cover', 'logo', 'sort'], { required: ['source', 'title'] });
crud('videos', ['title', 'source', 'url', 'cover', 'sort'], { required: ['title'] });
crud('scenes', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
crud('academy', ['title', 'desc', 'icon', 'link', 'cover', 'sort'], { required: ['title'] });
crud('downloads', ['name', 'platform', 'size', 'version', 'url', 'sort'], { required: ['name'] });
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
  res.json(db.prepare(`SELECT p.id, p.slug, p.name, p.subtitle, p.category_id, p.tag, p.price, p.description, p.spec_json, p.image_svg, p.hero_image, p.card_image, p.gallery_json, p.colors_json, p.kits_json, p.status, p.sort, c.name AS cat_name FROM products p
    LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.sort, p.id DESC`).all());
});

app.get('/api/admin/products/:id', requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(parseProduct(p));
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, status, sort } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: 'slug 与名称必填' });
  try {
    const r = db.prepare(`INSERT INTO products (slug,name,subtitle,category_id,tag,price,description,spec_json,image_svg,hero_image,card_image,gallery_json,colors_json,kits_json,status,sort)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(slug, name, subtitle||'', category_id||null, tag||'', price||'',
      description||'', JSON.stringify(spec||{}), image_svg||'', hero_image||'', card_image||'', JSON.stringify(gallery||[]), JSON.stringify(colors||[]), JSON.stringify(kits||[]), status||'published', sort||0);
    res.json({ ok: true, id: r.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const { slug, name, subtitle, category_id, tag, price, description, spec, image_svg, hero_image, card_image, gallery, colors, kits, status, sort } = req.body || {};
  db.prepare(`UPDATE products SET slug=?, name=?, subtitle=?, category_id=?, tag=?, price=?, description=?, spec_json=?, image_svg=?, hero_image=?, card_image=?, gallery_json=?, colors_json=?, kits_json=?, status=?, sort=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(slug, name, subtitle||'', category_id||null, tag||'', price||'', description||'',
      JSON.stringify(spec||{}), image_svg||'', hero_image||'', card_image||'', JSON.stringify(gallery||[]), JSON.stringify(colors||[]), JSON.stringify(kits||[]), status||'published', sort||0, req.params.id);
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
    if (!req.file) return res.status(400).json({ error: '请选择图片文件（jpg/png/webp/gif/svg，最大 5MB）' });
    res.json({ ok: true, url: '/uploads/' + req.file.filename });
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
app.get('/admin/*', (req, res) => {
  const p = path.join(__dirname, 'public', 'admin', req.path.replace(/^\/admin\//, ''));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return res.sendFile(p);
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`🟢 曜印 YAOPRINT 站点已启动: http://localhost:${PORT}`);
  console.log(`   后台管理: http://localhost:${PORT}/admin`);
  if (!IS_PROD) console.log('   开发环境默认账号见 README（首次请立即修改密码）');
});
