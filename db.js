// 曜印 YAOPRINT — 数据库初始化与连接
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'yaoprint.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  category_id INTEGER,
  tag TEXT,
  price TEXT,
  description TEXT,
  spec_json TEXT,
  image_svg TEXT,
  hero_image TEXT,
  card_image TEXT,
  gallery_json TEXT,
  colors_json TEXT,
  kits_json TEXT,
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  cover TEXT,
  tag TEXT,
  sort INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  published_at TEXT DEFAULT (datetime('now','localtime')),
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  cover TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  desc TEXT,
  icon TEXT,
  link TEXT,
  cover TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS academy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  desc TEXT,
  icon TEXT,
  link TEXT,
  cover TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  url TEXT,
  cover TEXT,
  logo TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT,
  size TEXT,
  version TEXT,
  url TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS heroes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  highlight TEXT,
  subtitle TEXT,
  lead TEXT,
  tag TEXT,
  image TEXT,
  link TEXT,
  link_text TEXT,
  link2 TEXT,
  link2_text TEXT,
  sort INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  scene TEXT,
  message TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

function ensureColumn(table, column, defSql) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defSql}`);
  }
}

ensureColumn('scenes', 'cover', "TEXT DEFAULT ''");
ensureColumn('academy', 'cover', "TEXT DEFAULT ''");
ensureColumn('videos', 'cover', "TEXT DEFAULT ''");
ensureColumn('reviews', 'cover', "TEXT DEFAULT ''");
ensureColumn('reviews', 'logo', "TEXT DEFAULT ''");
ensureColumn('news', 'cover', "TEXT DEFAULT ''");
ensureColumn('news', 'sort', 'INTEGER DEFAULT 0');
ensureColumn('products', 'hero_image', "TEXT DEFAULT ''");
ensureColumn('products', 'card_image', "TEXT DEFAULT ''");
ensureColumn('products', 'gallery_json', "TEXT DEFAULT '[]'");
ensureColumn('products', 'colors_json', "TEXT DEFAULT '[]'");
ensureColumn('products', 'kits_json', "TEXT DEFAULT '[]'");

const defaultSettings = {
  site_name: '曜印 YAOPRINT',
  site_tagline: '让每一个创意即刻成为实物',
  contact_email: 'hello@yaoprint.com',
  contact_phone: '400-123-4567',
  contact_address: '深圳市南山区高新南一道 88 号',
  contact_hours: '周一至周日 9:00 - 21:00',
  icp: '粤ICP备2021138226号-2',
  copyright: '© 2026 曜印科技有限公司 · 曜印 YAOPRINT 版权所有',
  social_wechat: '#',
  social_weibo: '#',
  social_bilibili: '#',
  social_douyin: '#',
  social_youtube: '#',
  stat1_value: '1.5',
  stat1_unit: 'M+',
  stat1_label: '全球累计出货(台)',
  stat2_value: '0.01',
  stat2_unit: 'mm',
  stat2_label: '最高打印精度',
  stat3_value: '100',
  stat3_unit: '+',
  stat3_label: '国家与地区',
  stat4_value: '300',
  stat4_unit: '+',
  stat4_label: '授权专利技术',
};
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([k, v]) => insSetting.run(k, v));

const heroCount = db.prepare('SELECT COUNT(*) AS c FROM heroes').get().c;
if (heroCount === 0) {
  const insHero = db.prepare(`INSERT INTO heroes
    (title, highlight, subtitle, lead, tag, image, link, link_text, link2, link2_text, sort, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  [
    ['万千想象', '一点灵光', '曜印 R1', '超紧凑桌面级 3D 打印机,小巧机身却拥有不妥协的打印性能。2026 年 9 月,敬请期待。', '2026 新品', '/img/hero/r1.jpg', 'product.html?slug=r1', '了解更多', 'contact.html', '预约试用', 1, 'published'],
    ['创意无限大', '', '曜印 A2L', '彩色触控大屏 + 全自动调平,2026 全新 A 系列旗舰,让多色打印成为日常。', '新品', '/img/hero/a2l.jpg', 'product.html?slug=a2l', '立即购买', 'product.html?slug=a2l', '了解更多', 2, 'published'],
    ['重新定义', '个人智造', '曜印 H2D', '3D 打印、激光雕刻、笔绘、刀切、贴纸模切五合一,你的瑞士军刀智造中心。', '新品', '/img/hero/h2d.jpg', 'product.html?slug=h2d', '立即购买', 'compare.html', '参数对比', 3, 'published'],
    ["Let's Make It", '创造基金', '最高 $300,000 激励,让伟大创造成真', '面向全球创作者的资助计划,寻找用 3D 打印改变世界的你。', '激励计划', '/img/hero/letsmakeit.jpg', 'news.html?slug=letsmakeit', '了解详情', 'contact.html', '提交申请', 4, 'published'],
    ['出色,无需妥协', '', '曜印 H2C · Vortek 多材料系统', '全新多材料 Vortek 系统支持 8 种工程材料热切换,大幅减少换料时间。', '新品', '/img/hero/h2c.jpg', 'product.html?slug=h2c', '立即购买', 'product.html?slug=h2c', '了解更多', 5, 'published'],
    ['再一次,成为经典', '', '曜印 P2S · 8K 单色光固化', '8K 单色液晶屏,矢量光引擎,超高细节让手办、牙科、珠宝建模栩栩如生。', '新品', '/img/hero/p2s.jpg', 'product.html?slug=p2s', '立即购买', 'product.html?slug=p2s', '了解更多', 6, 'published'],
  ].forEach(row => insHero.run(...row));
}

module.exports = db;
