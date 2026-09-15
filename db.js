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

CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  body TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  meta_json TEXT DEFAULT '{}',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  published_at TEXT DEFAULT (datetime('now','localtime')),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(type, slug)
);
CREATE INDEX IF NOT EXISTS idx_content_items_type_status_sort ON content_items(type, status, sort, id);

CREATE TABLE IF NOT EXISTS service_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  product TEXT DEFAULT '',
  serial_no TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  description TEXT DEFAULT '',
  source TEXT DEFAULT 'support-ticket',
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  recipient TEXT NOT NULL,
  phone TEXT DEFAULT '',
  province TEXT DEFAULT '',
  city TEXT DEFAULT '',
  district TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS catalog_skus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  variant TEXT DEFAULT '',
  price TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER UNIQUE NOT NULL,
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL,
  sku_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES catalog_skus(id) ON DELETE CASCADE,
  UNIQUE(cart_id, sku_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  address_id INTEGER,
  status TEXT DEFAULT 'pending_review',
  note TEXT DEFAULT '',
  total_text TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  sku_id INTEGER,
  name TEXT NOT NULL,
  variant TEXT DEFAULT '',
  price TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES catalog_skus(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_no TEXT UNIQUE NOT NULL,
  product_id INTEGER,
  product_name TEXT DEFAULT '',
  purchase_date TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  warranty_until TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS device_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS after_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  type TEXT DEFAULT 'repair',
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS creator_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  license TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  admin_note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  province TEXT DEFAULT '',
  city TEXT DEFAULT '',
  service_type TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS partner_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  application_type TEXT DEFAULT '',
  city TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
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
ensureColumn('service_tickets', 'customer_id', 'INTEGER');
ensureColumn('service_tickets', 'device_id', 'INTEGER');
ensureColumn('service_tickets', 'order_no', "TEXT DEFAULT ''");

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

const contentCount = db.prepare('SELECT COUNT(*) AS c FROM content_items').get().c;
if (contentCount === 0) {
  const insertContent = db.prepare(`INSERT INTO content_items
    (type, slug, title, summary, body, cover, tag, meta_json, status, sort)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const items = [
    ['faq', 'first-print', '第一次打印前需要做哪些准备？', '完成开箱检查、设备调平和耗材干燥，即可从官方测试模型开始。', '建议先阅读设备安全说明，确认平台清洁、耗材状态良好，并完成自动调平。首次打印选择小尺寸测试模型，观察首层附着情况。', '/img/cards/academy.jpg', '新手入门', '{"product":"通用","read_time":"3 分钟"}', 'published', 1],
    ['faq', 'filament-storage', '耗材应该如何储存？', '潮湿会影响表面质量与强度，建议密封保存并按材料特性干燥。', 'PLA、PETG、TPU 等材料对湿度敏感。请使用密封袋、干燥剂或干燥箱保存，并在出现拉丝、爆裂声或表面粗糙时进行烘干处理。', '/img/cards/filament.jpg', '材料使用', '{"product":"耗材","read_time":"2 分钟"}', 'published', 2],
    ['tutorial', 'calibration-basics', '从自动调平到稳定首层', '掌握校准逻辑，让每次开机都获得可靠的第一层。', '本课程介绍平台清洁、自动调平、首层检查和常见故障排查。完成后，你可以独立判断附着问题并进行基础维护。', '/img/cards/academy.jpg', '基础课程', '{"level":"入门","duration":"18 分钟","video_url":""}', 'published', 1],
    ['tutorial', 'multi-material', '多材料打印设计指南', '从模型拆分、材料组合到换料策略，建立高效的多材料工作流。', '课程围绕多色和多材料模型的设计原则展开，涵盖材料兼容性、支撑策略、时间成本与后处理建议。', '/img/hero/h2c.jpg', '进阶课程', '{"level":"进阶","duration":"26 分钟","video_url":""}', 'published', 2],
    ['case', 'education-lab', '让设计课从屏幕走进实验室', '一所中学用曜印设备建立跨学科创客实验室，缩短了从想法到验证的时间。', '教育团队将 3D 打印纳入科学、工程和艺术课程，通过项目制学习帮助学生完成原型迭代、结构验证和成果展示。', '/img/scenes/education.jpg', '教育', '{"industry":"教育","result":"项目迭代效率提升","products":"曜印 A 系列"}', 'published', 1],
    ['case', 'rapid-prototyping', '面向小批量验证的快速原型单元', '本地硬件团队用多台设备建立短周期试制能力。', '通过统一切片参数、材料规范和工单排期，团队将设计验证从外协等待转为内部快速循环。', '/img/hero/h2d.jpg', '工业', '{"industry":"工业","result":"缩短试制周期","products":"曜印 H 系列"}', 'published', 2],
    ['material', 'pla-plus', 'PLA+ 通用创作材料', '稳定、易打印、颜色丰富，适合模型、教学与展示件。', 'PLA+ 兼顾低翘曲与良好表面效果。适用于多数开放与封闭腔体设备，可用于日常创作、教育模型和快速展示件。', '/img/cards/filament.jpg', 'PLA', '{"nozzle":"190–220°C","bed":"35–55°C","strength":"中等","compatible":"全部 FDM 设备"}', 'published', 1],
    ['material', 'petg-functional', 'PETG 功能型材料', '兼具韧性、耐候性与易加工性，适合功能件和工具夹具。', 'PETG 推荐用于对耐冲击和耐湿热有要求的项目。打印时注意控制风扇与回抽参数，以获得更平整的表面。', '/img/cards/filament.jpg', 'PETG', '{"nozzle":"225–250°C","bed":"70–85°C","strength":"较高","compatible":"封闭或半封闭设备"}', 'published', 2],
    ['model', 'desk-organizer', '模块化桌面收纳系统', '可按桌面空间自由组合的收纳模型，适配常见 PLA 材料。', '项目包含基础盒、笔筒、线材夹和标签模块。适合练习拼装结构、尺寸控制与多色标记。', '/img/scenes/diy.jpg', '实用主义', '{"author":"曜印创作实验室","source_url":"explore/project.html?slug=desk-organizer","material":"PLA+"}', 'published', 1],
    ['project', 'light-and-structure', '光与结构：桌面灯具创作项目', '将参数化设计与打印结构结合，完成一盏可维护的桌面灯。', '项目从灯罩透光效果、散热空间和装配公差切入，适合具有基础建模能力的创作者。', '/img/scenes/art.jpg', '艺术与时尚', '{"author":"曜印创作实验室","material":"PLA+ / PETG","duration":"2 小时"}', 'published', 1],
    ['service', 'remote-diagnosis', '远程诊断服务', '提交设备现象与日志后，技术支持团队会给出排查建议。', '服务覆盖常见打印异常、连接问题和基础维护咨询。复杂故障可转交到授权服务网点。', '/img/quick/printer.jpg', '技术支持', '{"response":"1 个工作日","cta":"support/ticket.html"}', 'published', 1],
    ['service', 'network-service', '授权服务网络', '查询附近的技术服务与合作经销商，获得演示、维修和培训支持。', '服务网络覆盖咨询、设备交付、维护与培训。请先提交地区和设备信息，以便匹配合适的服务伙伴。', '/img/quick/printer.jpg', '服务网络', '{"cta":"support/service-network.html"}', 'published', 2],
    ['channel', 'partner-program', '曜印合作伙伴计划', '面向区域经销、教育集成和行业解决方案伙伴的协作计划。', '合作伙伴可获得产品培训、市场物料、项目支持和售后协同。提交申请后，我们将在 3 个工作日内联系。', '/img/hero/h2d.jpg', '渠道合作', '{"cta":"about/partners.html"}', 'published', 1],
    ['policy', 'privacy', '隐私政策', '说明我们如何收集、使用与保护咨询、工单和订阅信息。', '我们仅在提供咨询、售后、订阅和网站服务所必需的范围内处理您的信息。未经授权不会向无关第三方出售个人信息。您可通过联系邮箱请求访问、更正或删除相关数据。', '', '法律与信任', '{"version":"2026.09","effective_date":"2026-09-01"}', 'published', 1],
    ['policy', 'terms', '使用条款', '说明访问网站、下载资料和提交内容时应遵守的基本规则。', '网站中的文字、图像、软件资料和品牌资产受适用法律保护。请勿以违反法律、侵犯他人权利或干扰服务稳定性的方式使用本站。', '', '法律与信任', '{"version":"2026.09","effective_date":"2026-09-01"}', 'published', 2],
    ['policy', 'warranty', '保修与维修政策', '了解设备保修范围、送修流程与非保修情形。', '保修服务以实际购买凭证、产品序列号和当地适用政策为准。提交工单时请附上设备型号、序列号、问题描述及必要的图片或日志。', '', '服务政策', '{"version":"2026.09","effective_date":"2026-09-01"}', 'published', 3]
  ];
  items.forEach(item => insertContent.run(...item));
}

const skuCount = db.prepare('SELECT COUNT(*) AS c FROM catalog_skus').get().c;
if (skuCount === 0) {
  const products = db.prepare("SELECT id, slug, name, price, card_image, hero_image FROM products WHERE status IN ('published','soon') ORDER BY sort, id LIMIT 6").all();
  const insertSku = db.prepare('INSERT INTO catalog_skus (product_id,slug,name,variant,price,cover,status,sort) VALUES (?,?,?,?,?,?,?,?)');
  products.forEach((product, index) => insertSku.run(product.id, `${product.slug}-standard`, product.name, '标准配置', product.price || '咨询报价', product.card_image || product.hero_image || '', 'published', index + 1));
}

const partnerCount = db.prepare('SELECT COUNT(*) AS c FROM partners').get().c;
if (partnerCount === 0) {
  const insertPartner = db.prepare('INSERT INTO partners (name,province,city,service_type,phone,address,status,sort) VALUES (?,?,?,?,?,?,?,?)');
  [
    ['曜印华南技术服务中心','广东省','深圳市','演示 / 维修 / 培训','400-123-4567','南山区创新大道 88 号','active',1],
    ['曜印华东合作伙伴','上海市','上海市','教育 / 行业方案','400-123-4567','浦东新区智造路 168 号','active',2],
    ['曜印华北服务伙伴','北京市','北京市','演示 / 维修','400-123-4567','海淀区创客街 12 号','active',3]
  ].forEach(row => insertPartner.run(...row));
}

module.exports = db;
