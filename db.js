// 起元星启 — 数据库初始化与连接
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

CREATE TABLE IF NOT EXISTS ecosystem_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  platform_type TEXT DEFAULT 'model',
  brand_owner TEXT DEFAULT '',
  description TEXT DEFAULT '',
  url TEXT NOT NULL,
  cover TEXT DEFAULT '',
  relationship TEXT DEFAULT 'independent',
  disclaimer TEXT DEFAULT '',
  link_label TEXT DEFAULT '访问官方平台',
  last_verified_at TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT '',
  organizer TEXT DEFAULT '',
  fit TEXT DEFAULT '',
  region TEXT DEFAULT '',
  group_text TEXT DEFAULT '',
  competition_status TEXT DEFAULT '方向参考',
  official_url TEXT NOT NULL,
  registration_url TEXT DEFAULT '',
  notice_url TEXT DEFAULT '',
  source_label TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  image_type TEXT DEFAULT '方向示意图',
  image_alt TEXT DEFAULT '',
  image_source TEXT DEFAULT '',
  screenshot_taken_at TEXT DEFAULT '',
  verified_at TEXT DEFAULT '',
  visibility TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  category TEXT DEFAULT '',
  grade_min INTEGER DEFAULT 7,
  grade_max INTEGER DEFAULT 12,
  target_audience TEXT DEFAULT '',
  level TEXT DEFAULT '',
  delivery_mode TEXT DEFAULT 'offline',
  total_sessions INTEGER DEFAULT 0,
  total_hours INTEGER DEFAULT 0,
  price_text TEXT DEFAULT '课程咨询',
  description TEXT DEFAULT '',
  syllabus_json TEXT DEFAULT '[]',
  outcomes_json TEXT DEFAULT '[]',
  cover TEXT DEFAULT '',
  gallery_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  specialties_json TEXT DEFAULT '[]',
  grade_bands_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT DEFAULT '桂林市',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  transport TEXT DEFAULT '',
  opening_hours TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  facilities_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  campus_id INTEGER,
  teacher_id INTEGER,
  title TEXT NOT NULL,
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  schedule_text TEXT DEFAULT '',
  registration_deadline TEXT DEFAULT '',
  capacity INTEGER DEFAULT 0,
  trial_available INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  sort INTEGER DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollment_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_type TEXT DEFAULT 'trial',
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_wechat TEXT DEFAULT '',
  student_grade TEXT DEFAULT '',
  course_id INTEGER,
  campus_id INTEGER,
  preferred_time TEXT DEFAULT '',
  experience_level TEXT DEFAULT '',
  message TEXT DEFAULT '',
  privacy_consent INTEGER DEFAULT 0,
  privacy_version TEXT DEFAULT '',
  consent_at TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  follow_up_note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS education_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  case_kind TEXT DEFAULT '',
  grade_band TEXT DEFAULT '',
  student_count TEXT DEFAULT '',
  duration_text TEXT DEFAULT '',
  challenge TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  outcomes_json TEXT DEFAULT '[]',
  cover TEXT DEFAULT '',
  gallery_json TEXT DEFAULT '[]',
  visibility TEXT DEFAULT 'public',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0
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
ensureColumn('products', 'relationship', "TEXT DEFAULT 'training_reference'");
ensureColumn('products', 'official_url', "TEXT DEFAULT ''");
ensureColumn('products', 'source_label', "TEXT DEFAULT ''");
ensureColumn('products', 'relationship_disclaimer', "TEXT DEFAULT ''");
ensureColumn('products', 'spec_source', "TEXT DEFAULT ''");
ensureColumn('products', 'spec_verified_at', "TEXT DEFAULT ''");
ensureColumn('products', 'featured_home', 'INTEGER DEFAULT 0');
ensureColumn('products', 'feature_json', "TEXT DEFAULT '[]'");
ensureColumn('service_tickets', 'customer_id', 'INTEGER');
ensureColumn('service_tickets', 'device_id', 'INTEGER');
ensureColumn('service_tickets', 'order_no', "TEXT DEFAULT ''");

const defaultSettings = {
  site_name: '起元星启',
  brand_name: '起元星启',
  company_legal_name: '桂林起元星启科技有限公司',
  site_tagline: '让三维创意成为学习成果',
  business_scope: '面向学生与学校的 3D 建模、3D 打印、科创项目服务',
  campus_summary: '桂林本地课程与学校合作服务，校区与班期信息请通过后台完善。',
  contact_wechat: '',
  contact_email: '',
  contact_phone: '',
  contact_address: '桂林市（教学地址与校区信息待完善）',
  contact_hours: '课程咨询时间请预约确认',
  icp: '',
  copyright: '© 2026 桂林起元星启科技有限公司 版权所有',
  seo_default_title: '起元星启｜3D 建模与打印学习平台',
  seo_default_description: '桂林起元星启科技有限公司，提供 3D 建模、3D 打印、科创项目与学校创客课程支持。',
  social_wechat: '#',
  social_weibo: '#',
  social_bilibili: '#',
  social_douyin: '#',
  social_youtube: '#',
  course_catalog_visibility: 'hidden',
  site_url: '',
  stat1_value: '7',
  stat1_unit: '–12',
  stat1_label: '学习路径（基础至项目）',
  stat2_value: '3D',
  stat2_unit: '',
  stat2_label: '建模与打印实践',
  stat3_value: '4',
  stat3_unit: '类',
  stat3_label: '课程方向',
  stat4_value: '1',
  stat4_unit: '对1',
  stat4_label: '课程与学校合作咨询',
};
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([k, v]) => insSetting.run(k, v));

const qiyuanMigration = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_xingqi_v1'").get();
if (!qiyuanMigration) {
  const migrate = db.transaction(() => {
    const set = db.prepare(`INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
    Object.entries(defaultSettings).forEach(([key, value]) => set.run(key, value));
    set.run('migration_qiyuan_xingqi_v1', 'done');

    db.prepare('DELETE FROM catalog_skus').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();
    const addCategory = db.prepare('INSERT INTO categories (slug,name,sort) VALUES (?,?,?)');
    addCategory.run('education-equipment', '教学设备参考', 1);
    addCategory.run('project-equipment', '项目与创客设备参考', 2);
    const educationId = db.prepare("SELECT id FROM categories WHERE slug='education-equipment'").get().id;
    const projectId = db.prepare("SELECT id FROM categories WHERE slug='project-equipment'").get().id;

    const addProduct = db.prepare(`INSERT INTO products
      (slug,name,subtitle,category_id,tag,price,description,spec_json,image_svg,hero_image,card_image,gallery_json,colors_json,kits_json,status,sort,relationship,official_url,source_label,relationship_disclaimer,spec_source,spec_verified_at,featured_home,feature_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const disclaimer = '第三方品牌信息，仅供起元星启课程设备选型与教学参考；参数、购买、保修及服务请以品牌官方渠道为准。';
    const products = [
      ['zhixiaobai-explorer3', '智小白 Explorer3', '面向课堂创意实践的设备参考', educationId, '教学参考', '课程设备咨询', '适合课堂 3D 建模与打印实践的设备选型参考。正式参数与服务范围请以官方资料核验为准。', { '技术':'FDM（资料待核验）', '成型尺寸':'资料待核验', '适用材料':'资料待核验', '精度':'资料待核验', '速度':'资料待核验', '教学场景':'初中建模与打印实践', '适用年级':'初中 / 高中' }, 1, '智小白 Explorer3', '资料待核验'],
      ['vorlon-350', 'Vorlon 350 × 350', '大尺寸项目与创客设备参考', projectId, '资料待核验', '课程设备咨询', '适合大尺寸项目讨论与创客空间设备选型参考。用户提供规格为 350 × 350，完整轴向尺寸与参数待核验。', { '技术':'FDM（资料待核验）', '成型尺寸':'350 × 350 mm（用户提供，完整尺寸待核验）', '适用材料':'资料待核验', '精度':'资料待核验', '速度':'资料待核验', '教学场景':'高中工程设计与项目制作', '适用年级':'高中' }, 2, 'Vorlon 350 × 350', '用户提供信息 / 官方资料待核验'],
      ['kuaizao-u1', '快造 U1', '多材料课程项目设备参考', projectId, '教学参考', '课程设备咨询', '用于多材料、结构设计与课程项目的设备选型参考。具体功能、规格与适用材料请以官方资料为准。', { '技术':'FDM（资料待核验）', '成型尺寸':'资料待核验', '适用材料':'资料待核验', '精度':'资料待核验', '速度':'资料待核验', '教学场景':'高中进阶设计与课程项目', '适用年级':'高中' }, 3, '快造 U1', '官方资料待核验'],
      ['xiaoluban-printer', '小鲁班打印机', '基础教学设备参考', educationId, '资料待核验', '课程设备咨询', '面向基础建模与打印课堂的设备选型参考。正式型号、参数和适用服务范围待提供资料后补充。', { '技术':'资料待核验', '成型尺寸':'资料待核验', '适用材料':'资料待核验', '精度':'资料待核验', '速度':'资料待核验', '教学场景':'初中基础建模与打印实践', '适用年级':'初中' }, 4, '小鲁班打印机', '资料待核验'],
      ['bambu-lab-a1', '拓竹 A1', '桌面 FDM 教学设备参考', educationId, '教学参考', '课程设备咨询', '用于桌面 FDM 课程、创客社团与项目制作的设备选型参考。产品信息与服务政策请以拓竹官方渠道为准。', { '技术':'FDM（官方资料待核验）', '成型尺寸':'官方资料待核验', '适用材料':'官方资料待核验', '精度':'官方资料待核验', '速度':'官方资料待核验', '教学场景':'初中 / 高中三维创作实践', '适用年级':'初中 / 高中' }, 5, '拓竹 A1', '官方资料待核验']
    ];
    products.forEach(([slug,name,subtitle,categoryId,tag,price,description,spec,sort,sourceLabel,specSource]) => addProduct.run(
      slug,name,subtitle,categoryId,tag,price,description,JSON.stringify(spec),'','','','[]','[]','[]','published',sort,
      'training_reference','',sourceLabel,disclaimer,specSource,'',1,JSON.stringify([])
    ));

    db.prepare('DELETE FROM heroes').run();
    const addHero = db.prepare(`INSERT INTO heroes (title,highlight,subtitle,lead,tag,image,link,link_text,link2,link2_text,sort,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    addHero.run('让三维创意', '成为学习成果', '桂林起元星启科技有限公司', '面向初中、高中学生开展 3D 建模、3D 打印、科创项目与学校创客课程支持。', '初高中三维创作教育', '', 'courses/index.html', '查看课程', 'explore/ecosystem.html', '发现模型生态', 1, 'published');
    addHero.run('设备选型', '服务于教学', '五款教学设备参考', '结合课程目标、学生年级与项目类型，获得更合适的设备与材料建议。', '课程设备参考', '', 'products.html', '查看设备参考', 'trial.html', '预约试听', 2, 'published');
  });
  migrate();
}

const ecosystemCount = db.prepare('SELECT COUNT(*) AS c FROM ecosystem_platforms').get().c;
if (ecosystemCount === 0) {
  const addPlatform = db.prepare(`INSERT INTO ecosystem_platforms (slug,name,platform_type,brand_owner,description,url,cover,relationship,disclaimer,link_label,last_verified_at,status,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const disclaimer = '第三方平台入口，商标、内容与服务归各自权利人所有；起元星启仅提供模型生态跳转与课程选型参考，不代表官方合作或内容背书。';
  [
    ['makerworld', 'MakerWorld', 'model', '拓竹生态平台', '浏览模型灵感与社区项目，适合课堂项目选题与打印练习。', 'https://makerworld.com/', '/img/ecosystem/makerworld.png', 'independent', disclaimer, '访问 MakerWorld', '', 'published', 1],
    ['snapmaker-ecosystem', '快造生态入口', 'model', '快造 / Snapmaker', '查看快造官方生态与创作资源；具体模型入口以其官方站点实际提供为准。', 'https://www.snapmaker.com/', '/img/ecosystem/snapmaker.png', 'independent', disclaimer, '访问快造生态', '', 'published', 2],
    ['creality-cloud', '创想云', 'model', '创想三维生态', '发现创想三维生态中的模型与创作资源，适合课堂灵感延展。', 'https://www.crealitycloud.com/', '/img/ecosystem/crealitycloud.png', 'independent', disclaimer, '访问创想云', '', 'published', 3]
  ].forEach(row => addPlatform.run(...row));
}

const qiyuanEcosystemCovers = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_ecosystem_covers_v1'").get();
if (!qiyuanEcosystemCovers) {
  const migrateEcosystemCovers = db.transaction(() => {
    const updateCover = db.prepare('UPDATE ecosystem_platforms SET cover=? WHERE slug=?');
    updateCover.run('/img/ecosystem/makerworld.png', 'makerworld');
    updateCover.run('/img/ecosystem/snapmaker.png', 'snapmaker-ecosystem');
    updateCover.run('/img/ecosystem/crealitycloud.png', 'creality-cloud');
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_ecosystem_covers_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateEcosystemCovers();
}

// 模型社区官方入口更新：使用面向中文用户的官方地址，并保留后台可编辑能力。
const qiyuanModelCommunityLinksV1 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_model_community_links_v1'").get();
if (!qiyuanModelCommunityLinksV1) {
  const updateModelCommunityLinks = db.transaction(() => {
    db.prepare(`UPDATE ecosystem_platforms SET url='https://makerworld.com.cn/zh', name='拓竹 MakerWorld', description='浏览拓竹官方模型社区中的模型与创作项目，适合课堂选题、打印练习与作品延展。', brand_owner='拓竹（Bambu Lab）', link_label='访问官方模型社区', last_verified_at='2026-09-21' WHERE slug='makerworld'`).run();
    db.prepare(`UPDATE ecosystem_platforms SET url='https://www.crealitycloud.cn/', name='创想云', description='浏览创想三维官方模型社区中的模型与创作资源，适合课堂灵感与打印实践。', brand_owner='创想三维（Creality）', link_label='访问官方模型社区', last_verified_at='2026-09-21' WHERE slug='creality-cloud'`).run();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_model_community_links_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  updateModelCommunityLinks();
}

const curriculum = require('./curriculum');

const upsertCourse = db.prepare(`INSERT INTO courses (
  code,slug,title,subtitle,category,grade_min,grade_max,target_audience,level,delivery_mode,
  total_sessions,total_hours,price_text,description,syllabus_json,outcomes_json,cover,gallery_json,
  status,sort,seo_title,seo_description,updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'))
ON CONFLICT(slug) DO UPDATE SET
  code=excluded.code, title=excluded.title, subtitle=excluded.subtitle, category=excluded.category,
  grade_min=excluded.grade_min, grade_max=excluded.grade_max, target_audience=excluded.target_audience,
  level=excluded.level, delivery_mode=excluded.delivery_mode, total_sessions=excluded.total_sessions,
  total_hours=excluded.total_hours, price_text=excluded.price_text, description=excluded.description,
  syllabus_json=excluded.syllabus_json, outcomes_json=excluded.outcomes_json, cover=excluded.cover,
  gallery_json=excluded.gallery_json, status=excluded.status, sort=excluded.sort,
  seo_title=excluded.seo_title, seo_description=excluded.seo_description, updated_at=excluded.updated_at`);

function applyCurriculum() {
  curriculum.courses.forEach(course => {
    const row = curriculum.toRow(course);
    upsertCourse.run(
      row.code, row.slug, row.title, row.subtitle, row.category, row.grade_min, row.grade_max,
      row.target_audience, row.level, row.delivery_mode, row.total_sessions, row.total_hours,
      row.price_text, row.description, row.syllabus_json, row.outcomes_json, row.cover, row.gallery_json,
      'draft', row.sort, row.seo_title, row.seo_description
    );
  });
}

const courseCount = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
if (courseCount === 0) applyCurriculum();

const qiyuanCourseCurriculum = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_course_curriculum_v1'").get();
if (!qiyuanCourseCurriculum) {
  const migrateCurriculum = db.transaction(() => {
    applyCurriculum();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_course_curriculum_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateCurriculum();
}

const qiyuanCourseCurriculumV2 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_course_curriculum_v2'").get();
if (!qiyuanCourseCurriculumV2) {
  const migrateCurriculumV2 = db.transaction(() => {
    applyCurriculum();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_course_curriculum_v2','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateCurriculumV2();
}

// 官网内容需求问卷落地：公开课程目录、同步正式品牌信息，保留后台可编辑能力。
// 仅更新课程与站点设置，不重置用户、上传文件或咨询数据。
const qiyuanQuestionnaireV1 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_questionnaire_v1'").get();
if (!qiyuanQuestionnaireV1) {
  const migrateQuestionnaire = db.transaction(() => {
    const courseTotal = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
    if (courseTotal === 0) applyCurriculum();
    db.prepare("UPDATE courses SET status='published' WHERE status IN ('draft','published')").run();
    const setSetting = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    [
      ['brand_name', '起元星启'],
      ['site_name', '起元星启'],
      ['company_legal_name', '桂林起元星启科技有限公司'],
      ['business_scope', '立足 3D 数字化应用领域，以 3D 建模设计与 3D 打印服务为核心，同时开展面向企业与院校的 3D 技术培训。'],
      ['site_tagline', '3D × 创造 × 落地'],
      ['campus_summary', '服务地区：广西桂林；支持全国学校、企业与个人客户合作咨询。'],
      ['contact_phone', '18620571580'],
      ['contact_email', 'morriszhang66@gmail.com'],
      ['contact_address', '广西桂林（课程、设备与项目合作可预约沟通）'],
      ['contact_hours', '课程与合作咨询请提前预约'],
      ['course_catalog_visibility', 'public'],
      ['seo_default_title', '起元星启｜3D 建模、打印与科创项目服务'],
      ['seo_default_description', '桂林起元星启科技有限公司，提供 3D 建模、3D 打印、设备与耗材参考、学校课程及科创项目支持。'],
      ['stat1_value', '3D'],
      ['stat1_label', '建模 · 打印 · 教学'],
      ['stat1_unit', '三位一体'],
      ['stat2_value', '5'],
      ['stat2_label', '从认识设备到项目表达'],
      ['stat2_unit', '个环节'],
      ['stat3_value', 'FDM'],
      ['stat3_label', '课程与项目常用工艺'],
      ['stat3_unit', '打印'],
      ['stat4_value', '全国'],
      ['stat4_label', '学校与企业合作咨询'],
      ['stat4_unit', '支持']
    ].forEach(([key, value]) => setSetting.run(key, value));
    db.prepare("INSERT INTO settings (key,value) VALUES ('migration_qiyuan_questionnaire_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'").run();
  });
  migrateQuestionnaire();
}

const educationCaseCount = db.prepare('SELECT COUNT(*) AS c FROM education_cases').get().c;
const qiyuanEducationImages = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_education_images_v1'").get();
if (!qiyuanEducationImages) {
  const migrateImages = db.transaction(() => {
    const updateCourse = db.prepare('UPDATE courses SET cover=?,gallery_json=? WHERE slug=?');
    updateCourse.run('/img/education/course-junior-modeling.webp', JSON.stringify(['/img/education/course-junior-modeling.webp','/img/education/robotic-fair-01.webp']), 'junior-3d-foundation');
    updateCourse.run('/img/education/course-senior-engineering.webp', JSON.stringify(['/img/education/course-senior-engineering.webp','/img/education/makerspace-commons.webp']), 'senior-3d-engineering');
    updateCourse.run('/img/education/course-holiday-project.webp', JSON.stringify(['/img/education/course-holiday-project.webp','/img/education/robotic-fair-01.webp']), 'holiday-creative-camp');
    updateCourse.run('/img/education/course-school-space.webp', JSON.stringify(['/img/education/course-school-space.webp','/img/education/makerspace-commons.webp']), 'school-maker-program');
    db.prepare("UPDATE education_cases SET cover=?,gallery_json=? WHERE slug='classroom-creative-project'").run('/img/education/case-creative-project.webp', JSON.stringify(['/img/education/case-creative-project.webp','/img/education/robotic-fair-01.webp']));
    db.prepare("UPDATE heroes SET image=? WHERE sort=1").run('/img/education/hero-makerspace.webp');
    db.prepare("UPDATE heroes SET image=? WHERE sort=2").run('/img/education/course-school-space.webp');
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_education_images_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateImages();
}

const teachingArticles = require('./teaching-articles');
const upsertNews = db.prepare(`INSERT INTO news (slug,title,summary,body,cover,tag,sort,status)
  VALUES (?,?,?,?,?,?,?,?)
  ON CONFLICT(slug) DO UPDATE SET
    title=excluded.title, summary=excluded.summary, body=excluded.body,
    cover=excluded.cover, tag=excluded.tag, sort=excluded.sort, status=excluded.status`);

function applyTeachingArticles() {
  teachingArticles.articles.forEach(article => {
    upsertNews.run(
      article.slug, article.title, article.summary, article.body,
      article.cover, article.tag, article.sort, article.status || 'published'
    );
  });
}

const qiyuanTeachingArticles = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_teaching_articles_v1'").get();
if (!qiyuanTeachingArticles) {
  const migrateTeachingArticles = db.transaction(() => {
    applyTeachingArticles();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_teaching_articles_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateTeachingArticles();
}

const qiyuanTeachingArticlesV2 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_teaching_articles_v2'").get();
if (!qiyuanTeachingArticlesV2) {
  const migrateTeachingArticlesV2 = db.transaction(() => {
    applyTeachingArticles();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_teaching_articles_v2','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateTeachingArticlesV2();
}

const qiyuanTeachingArticlesV3 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_teaching_articles_v3'").get();
if (!qiyuanTeachingArticlesV3) {
  const migrateTeachingArticlesV3 = db.transaction(() => {
    applyTeachingArticles();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_teaching_articles_v3','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateTeachingArticlesV3();
}

const qiyuanTeachingArticlesV4 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_teaching_articles_v4'").get();
if (!qiyuanTeachingArticlesV4) {
  const migrateTeachingArticlesV4 = db.transaction(() => {
    applyTeachingArticles();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_teaching_articles_v4','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateTeachingArticlesV4();
}

const industryNews = require('./industry-news');
const upsertIndustryNews = db.prepare(`INSERT INTO news (slug,title,summary,body,cover,tag,sort,status,published_at)
  VALUES (?,?,?,?,?,?,?,?,?)
  ON CONFLICT(slug) DO UPDATE SET
    title=excluded.title, summary=excluded.summary, body=excluded.body,
    cover=excluded.cover, tag=excluded.tag, sort=excluded.sort, status=excluded.status,
    published_at=excluded.published_at`);

function applyIndustryNews() {
  industryNews.articles.forEach(article => {
    upsertIndustryNews.run(
      article.slug, article.title, article.summary, article.body,
      article.cover, article.tag, article.sort, article.status || 'published',
      article.published_at
    );
  });
}

const qiyuanIndustryNewsV1 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_industry_news_v1'").get();
if (!qiyuanIndustryNewsV1) {
  const migrateIndustryNews = db.transaction(() => {
    applyIndustryNews();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_industry_news_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateIndustryNews();
}

// 2026-09 content language and visual refresh. This is intentionally additive:
// it re-syncs only the education catalog/news rows and keeps user-submitted leads,
// uploads and the existing SQLite database intact.
const qiyuanContentVisualsV1 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_content_visuals_v1'").get();
if (!qiyuanContentVisualsV1) {
  const migrateContentVisuals = db.transaction(() => {
    applyCurriculum();
    applyTeachingArticles();
    applyIndustryNews();
    db.prepare("UPDATE settings SET value=? WHERE key='business_scope'").run('面向学生与学校的 3D 建模、3D 打印、科创项目服务');
    db.prepare("UPDATE settings SET value=? WHERE key='seo_default_title'").run('起元星启｜3D 建模与打印学习平台');
    db.prepare("UPDATE settings SET value=? WHERE key='seo_default_description'").run('桂林起元星启科技有限公司，提供 3D 建模、3D 打印、科创项目与学校创客课程支持。');
    db.prepare("UPDATE settings SET value=? WHERE key='stat1_label'").run('学习路径（基础至项目）');
    db.prepare(`UPDATE products SET spec_json=replace(replace(replace(spec_json,'初中 / 高中','基础至项目'),'初中','基础入门'),'高中','项目进阶')` ).run();
    db.prepare(`UPDATE education_cases SET grade_band='基础至项目' WHERE grade_band LIKE '%初中%' OR grade_band LIKE '%高中%'`).run();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_content_visuals_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateContentVisuals();
}

const qiyuanContentVisualsV2 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_content_visuals_v2'").get();
if (!qiyuanContentVisualsV2) {
  const migrateContentVisualsV2 = db.transaction(() => {
    applyTeachingArticles();
    applyIndustryNews();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_content_visuals_v2','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateContentVisualsV2();
}

const qiyuanContentVisualsV3 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_content_visuals_v3'").get();
if (!qiyuanContentVisualsV3) {
  const migrateContentVisualsV3 = db.transaction(() => {
    applyTeachingArticles();
    applyIndustryNews();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_content_visuals_v3','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateContentVisualsV3();
}

const qiyuanTeachingFront = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_teaching_front_v1'").get();
if (!qiyuanTeachingFront) {
  const migrateTeachingFront = db.transaction(() => {
    db.prepare(`UPDATE news SET status='draft' WHERE slug IN ('makegood','h2c-vortek','seagrass','farm-manager','letsmakeit')`).run();
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_teaching_front_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateTeachingFront();
}

const qiyuanAiPlatforms = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_ai_platforms_v1'").get();
if (!qiyuanAiPlatforms) {
  const upsertPlatform = db.prepare(`INSERT INTO ecosystem_platforms
    (slug,name,platform_type,brand_owner,description,url,cover,relationship,disclaimer,link_label,last_verified_at,status,sort)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, platform_type=excluded.platform_type, brand_owner=excluded.brand_owner,
      description=excluded.description, url=excluded.url, relationship=excluded.relationship,
      disclaimer=excluded.disclaimer, link_label=excluded.link_label,
      last_verified_at=excluded.last_verified_at, status=excluded.status, sort=excluded.sort`);
  const aiDisclaimer = '第三方 AI 建模平台入口，商标、生成内容与服务归各自权利人所有；起元星启仅提供课堂参考跳转，不镜像模型或生成器，也不代表官方合作或内容背书。';
  const migrateAiPlatforms = db.transaction(() => {
    [
      ['meshy', 'Meshy', 'ai', 'Meshy', '文生 / 图生三维的课堂演示入口。生成网格仍须检查封闭、壁厚、尺寸与切片，不能代替积木建模。', 'https://www.meshy.ai/', '', 'independent', aiDisclaimer, '访问 Meshy 官网', '2026-09-17', 'published', 11],
      ['tripo-3d', 'Tripo 3D', 'ai', 'Tripo', 'AI 三维生成的课堂对照工具。适合观察外形，不适合跳过尺寸与可打印性判断。', 'https://www.tripo3d.ai/', '', 'independent', aiDisclaimer, '访问 Tripo 官网', '2026-09-17', 'published', 12],
      ['hyper3d-rodin', 'Hyper3D Rodin', 'ai', 'Hyper3D', 'AI 三维生成参考入口。课堂只跳转官网，不镜像模型文件，也不宣称合作。', 'https://hyper3d.ai/', '', 'independent', aiDisclaimer, '访问 Hyper3D 官网', '2026-09-17', 'published', 13],
      ['hunyuan-3d', '腾讯混元 3D', 'ai', '腾讯混元', '国产大模型三维能力的官方入口，供教师核对照与演示。账号与使用条款以官网为准。', 'https://3d.hunyuan.tencent.com/', '', 'independent', aiDisclaimer, '访问混元 3D', '2026-09-17', 'published', 14]
    ].forEach(row => upsertPlatform.run(...row));
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_ai_platforms_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  });
  migrateAiPlatforms();
}

// 竞赛入口目录：只做一次增量迁移，之后所有内容由后台 competitions 管理。
const qiyuanCompetitionsV1 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_competitions_v1'").get();
if (!qiyuanCompetitionsV1) {
  const upsertCompetition = db.prepare(`INSERT INTO competitions
    (slug,title,category,organizer,fit,region,group_text,competition_status,official_url,registration_url,notice_url,source_label,cover,image_type,image_alt,image_source,screenshot_taken_at,verified_at,visibility,sort)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET
      title=excluded.title, category=excluded.category, organizer=excluded.organizer,
      fit=excluded.fit, region=excluded.region, group_text=excluded.group_text,
      competition_status=excluded.competition_status, official_url=excluded.official_url,
      registration_url=excluded.registration_url, notice_url=excluded.notice_url,
      source_label=excluded.source_label, cover=excluded.cover, image_type=excluded.image_type,
      image_alt=excluded.image_alt, image_source=excluded.image_source,
      screenshot_taken_at=excluded.screenshot_taken_at, verified_at=excluded.verified_at,
      visibility=excluded.visibility, sort=excluded.sort, updated_at=datetime('now','localtime')`);
  const competitionRows = [
    ['national-science-innovation', '全国青少年科技创新大赛', '科技创新', '中国科协等相关单位（以当年通知为准）', '校园问题、工程结构、环保与生活改进项目', '全国', '按当年官方通知查看组别与资格', '官网入口 · 年度通知与地方赛安排待核对', 'https://castic.cyscc.org/', '', '', '中国青少年科技创新大赛官网', '/img/competition/castic-direction.webp', '方向示意图', '工程结构与科技创新项目方向示意图', '起元星启课程方向示意图，非赛事官方截图', '', '2026-09-18', 'published', 1],
    ['world-robotics-youth', '世界机器人大赛青少年机器人设计与信息素养大赛', '机器人 / 工程', '世界机器人大会相关组织与承办单位', '机器人结构、连接件、机构设计与程序协同', '全国及各赛区', '组别、赛区和报名资格以当年公告为准', '官网入口 · 组别、赛区和报名时间以当年公告为准', 'https://ceic.kpcb.org.cn/cms/gyds/index.htm', '', 'https://ceic.kpcb.org.cn/cms/sstz/8543.htm', '世界机器人大会青少年赛事信息页', '/img/competition/world-robotics-direction.webp', '方向示意图', '机器人结构设计与工程实践方向示意图', '起元星启课程方向示意图，非赛事官方截图', '', '2026-09-18', 'published', 2],
    ['noc-information-innovation', '全国中小学信息技术创新与实践大赛（NOC）', '数字创作', '全国中小学信息技术创新与实践活动相关组织', '数字建模、创意设计、人工智能与信息技术应用', '全国', '具体赛项、组别与资格需查看年度规则', '官网入口 · 具体赛项与资格需查看年度规则', 'https://www.noc.net.cn/', '', '', 'NOC 官方网站', '/img/competition/noc-direction.webp', '方向示意图', '数字创作与信息技术应用方向示意图', '起元星启课程方向示意图，非赛事官方截图', '', '2026-09-18', 'published', 3],
    ['ai-innovation-challenge', '全国青少年人工智能创新挑战赛', '人工智能 / 创客', '相关主办单位与年度承办机构', 'AI 交互装置、机器人、智能硬件与场景设计', '全国', '报名和赛项须以主办方当年公告为准', '方向参考 · 报名和赛项须以主办方当年公告为准', 'https://www.gov.cn/zhengce/zhengceku/', '', '', '国务院政策文件公开入口（用于核对年度通知）', '/img/competition/ai-maker-direction.webp', '方向示意图', '智能硬件与创客实验方向示意图', '起元星启课程方向示意图，非赛事官方截图', '', '2026-09-18', 'published', 4],
    ['information-literacy-practice', '全国中小学生信息素养提升实践活动', '信息素养', '教育系统相关活动组织单位', '创意设计、数字作品、编程与综合实践', '全国', '以教育主管部门和学校通知为准', '方向参考 · 以教育主管部门和学校通知为准', 'https://huodong.ncet.edu.cn/', '', '', '全国中小学生信息素养提升实践活动入口', '/img/competition/information-literacy-direction.webp', '方向示意图', '数字设计与信息素养实践方向示意图', '起元星启课程方向示意图，非活动官方截图', '', '2026-09-18', 'published', 5],
    ['local-maker-events', '地方青少年科技创新、创客与机器人赛事', '地方活动', '省、市教育主管部门、科协或学校正式通知', '校园真实问题、科创作品展、机器人和社团项目', '各省市', '不同地区规则差异较大，请按所在省市核验', '主管部门查询入口 · 非报名页，请按所在省市正式通知核验', 'https://www.cast.org.cn/', '', '', '中国科协官网（地方活动查找起点，非报名页）', '/img/competition/local-maker-direction.webp', '方向示意图', '地方创客与机器人活动方向示意图', '起元星启课程方向示意图，非赛事官方截图', '', '2026-09-18', 'published', 6]
  ];
  db.transaction(() => {
    competitionRows.forEach(row => upsertCompetition.run(...row));
    db.prepare(`INSERT INTO settings (key,value) VALUES ('migration_qiyuan_competitions_v1','done') ON CONFLICT(key) DO UPDATE SET value='done'`).run();
  })();
}

// 修正已失效的地方赛事泛政府入口。仅更新仍保留旧地址的记录，避免覆盖后台后续人工编辑。
const qiyuanCompetitionLinksV2 = db.prepare("SELECT value FROM settings WHERE key='migration_qiyuan_competition_links_v2'").get();
if (!qiyuanCompetitionLinksV2) {
  db.transaction(() => {
    db.prepare('UPDATE competitions SET competition_status=?, official_url=?, source_label=?, verified_at=?, updated_at=datetime(\'now\',\'localtime\') WHERE slug=\'local-maker-events\' AND official_url=\'https://www.gov.cn/fuwu/xxgk/\'').run(
      '主管部门查询入口 · 非报名页，请按所在省市正式通知核验',
      'https://www.cast.org.cn/',
      '中国科协官网（地方活动查找起点，非报名页）',
      '2026-09-18'
    );
    db.prepare("INSERT INTO settings (key,value) VALUES ('migration_qiyuan_competition_links_v2','done') ON CONFLICT(key) DO UPDATE SET value='done'").run();
  })();
}

if (educationCaseCount === 0) {
  db.prepare(`INSERT INTO education_cases (slug,title,case_kind,grade_band,student_count,duration_text,challenge,solution,outcomes_json,visibility,status,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'classroom-creative-project','从课堂创意到可展示作品','初高中项目制课程','初中 / 高中','信息待补充','按课程与班期安排','将抽象的空间与工程概念转化为学生能理解、能操作的学习任务。','以建模、打印、迭代和展示为主线，形成完整项目制学习过程。',JSON.stringify(['学生完成独立作品','形成作品表达与反思','支持校园成果展示']),'public','published',1
  );
}

const heroCount = db.prepare('SELECT COUNT(*) AS c FROM heroes').get().c;
if (heroCount === 0) {
  const insHero = db.prepare(`INSERT INTO heroes
    (title, highlight, subtitle, lead, tag, image, link, link_text, link2, link2_text, sort, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  [
    ['万千想象', '一点灵光', '起元星启 R1', '超紧凑桌面级 3D 打印机,小巧机身却拥有不妥协的打印性能。2026 年 9 月,敬请期待。', '2026 新品', '/img/hero/r1.jpg', 'product.html?slug=r1', '了解更多', 'contact.html', '预约试用', 1, 'published'],
    ['创意无限大', '', '起元星启 A2L', '彩色触控大屏 + 全自动调平,2026 全新 A 系列旗舰,让多色打印成为日常。', '新品', '/img/hero/a2l.jpg', 'product.html?slug=a2l', '立即购买', 'product.html?slug=a2l', '了解更多', 2, 'published'],
    ['重新定义', '个人智造', '起元星启 H2D', '3D 打印、激光雕刻、笔绘、刀切、贴纸模切五合一,你的瑞士军刀智造中心。', '新品', '/img/hero/h2d.jpg', 'product.html?slug=h2d', '立即购买', 'compare.html', '参数对比', 3, 'published'],
    ["Let's Make It", '创造基金', '最高 $300,000 激励,让伟大创造成真', '面向全球创作者的资助计划,寻找用 3D 打印改变世界的你。', '激励计划', '/img/hero/letsmakeit.jpg', 'news.html?slug=letsmakeit', '了解详情', 'contact.html', '提交申请', 4, 'published'],
    ['出色,无需妥协', '', '起元星启 H2C · Vortek 多材料系统', '全新多材料 Vortek 系统支持 8 种工程材料热切换,大幅减少换料时间。', '新品', '/img/hero/h2c.jpg', 'product.html?slug=h2c', '立即购买', 'product.html?slug=h2c', '了解更多', 5, 'published'],
    ['再一次,成为经典', '', '起元星启 P2S · 8K 单色光固化', '8K 单色液晶屏,矢量光引擎,超高细节让手办、牙科、珠宝建模栩栩如生。', '新品', '/img/hero/p2s.jpg', 'product.html?slug=p2s', '立即购买', 'product.html?slug=p2s', '了解更多', 6, 'published'],
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
    ['case', 'education-lab', '让设计课从屏幕走进实验室', '一所中学用起元星启设备建立跨学科创客实验室，缩短了从想法到验证的时间。', '教育团队将 3D 打印纳入科学、工程和艺术课程，通过项目制学习帮助学生完成原型迭代、结构验证和成果展示。', '/img/scenes/education.jpg', '教育', '{"industry":"教育","result":"项目迭代效率提升","products":"起元星启 A 系列"}', 'published', 1],
    ['case', 'rapid-prototyping', '面向小批量验证的快速原型单元', '本地硬件团队用多台设备建立短周期试制能力。', '通过统一切片参数、材料规范和工单排期，团队将设计验证从外协等待转为内部快速循环。', '/img/hero/h2d.jpg', '工业', '{"industry":"工业","result":"缩短试制周期","products":"起元星启 H 系列"}', 'published', 2],
    ['material', 'pla-plus', 'PLA+ 通用创作材料', '稳定、易打印、颜色丰富，适合模型、教学与展示件。', 'PLA+ 兼顾低翘曲与良好表面效果。适用于多数开放与封闭腔体设备，可用于日常创作、教育模型和快速展示件。', '/img/cards/filament.jpg', 'PLA', '{"nozzle":"190–220°C","bed":"35–55°C","strength":"中等","compatible":"全部 FDM 设备"}', 'published', 1],
    ['material', 'petg-functional', 'PETG 功能型材料', '兼具韧性、耐候性与易加工性，适合功能件和工具夹具。', 'PETG 推荐用于对耐冲击和耐湿热有要求的项目。打印时注意控制风扇与回抽参数，以获得更平整的表面。', '/img/cards/filament.jpg', 'PETG', '{"nozzle":"225–250°C","bed":"70–85°C","strength":"较高","compatible":"封闭或半封闭设备"}', 'published', 2],
    ['model', 'desk-organizer', '模块化桌面收纳系统', '可按桌面空间自由组合的收纳模型，适配常见 PLA 材料。', '项目包含基础盒、笔筒、线材夹和标签模块。适合练习拼装结构、尺寸控制与多色标记。', '/img/scenes/diy.jpg', '实用主义', '{"author":"起元星启创作实验室","source_url":"explore/project.html?slug=desk-organizer","material":"PLA+"}', 'published', 1],
    ['project', 'light-and-structure', '光与结构：桌面灯具创作项目', '将参数化设计与打印结构结合，完成一盏可维护的桌面灯。', '项目从灯罩透光效果、散热空间和装配公差切入，适合具有基础建模能力的创作者。', '/img/scenes/art.jpg', '艺术与时尚', '{"author":"起元星启创作实验室","material":"PLA+ / PETG","duration":"2 小时"}', 'published', 1],
    ['service', 'remote-diagnosis', '远程诊断服务', '提交设备现象与日志后，技术支持团队会给出排查建议。', '服务覆盖常见打印异常、连接问题和基础维护咨询。复杂故障可转交到授权服务网点。', '/img/quick/printer.jpg', '技术支持', '{"response":"1 个工作日","cta":"support/ticket.html"}', 'published', 1],
    ['service', 'network-service', '授权服务网络', '查询附近的技术服务与合作经销商，获得演示、维修和培训支持。', '服务网络覆盖咨询、设备交付、维护与培训。请先提交地区和设备信息，以便匹配合适的服务伙伴。', '/img/quick/printer.jpg', '服务网络', '{"cta":"support/service-network.html"}', 'published', 2],
    ['channel', 'partner-program', '起元星启合作伙伴计划', '面向区域经销、教育集成和行业解决方案伙伴的协作计划。', '合作伙伴可获得产品培训、市场物料、项目支持和售后协同。提交申请后，我们将在 3 个工作日内联系。', '/img/hero/h2d.jpg', '渠道合作', '{"cta":"about/partners.html"}', 'published', 1],
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
    ['起元星启华南技术服务中心','广东省','深圳市','演示 / 维修 / 培训','400-123-4567','南山区创新大道 88 号','active',1],
    ['起元星启华东合作伙伴','上海市','上海市','教育 / 行业方案','400-123-4567','浦东新区智造路 168 号','active',2],
    ['起元星启华北服务伙伴','北京市','北京市','演示 / 维修','400-123-4567','海淀区创客街 12 号','active',3]
  ].forEach(row => insertPartner.run(...row));
}

// 打印机与访问统计表放在文件末尾创建，因此导出语句必须留在最后一行，
// 否则 require 到的模块会拿到一个“尚未建完表”的连接对象。
db.exec(`
CREATE TABLE IF NOT EXISTS printers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT DEFAULT 'FDM 桌面级',
  tagline TEXT,
  image TEXT,
  price_text TEXT,
  price_num REAL DEFAULT 0,
  build_volume TEXT,
  build_volume_l REAL DEFAULT 0,
  max_speed REAL DEFAULT 0,
  max_accel REAL DEFAULT 0,
  nozzle_temp REAL DEFAULT 0,
  bed_temp REAL DEFAULT 0,
  min_layer REAL DEFAULT 0,
  filament_diameter TEXT DEFAULT '1.75mm',
  materials TEXT,
  bed_type TEXT,
  leveling TEXT,
  connectivity TEXT,
  screen TEXT,
  camera TEXT DEFAULT '0',
  multi_color TEXT DEFAULT '0',
  noise TEXT,
  weight TEXT,
  slicer TEXT,
  highlights_json TEXT,
  specs_json TEXT,
  official_url TEXT,
  source_label TEXT,
  verified_at TEXT,
  relationship TEXT,
  featured INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT DEFAULT '',
  visitor TEXT DEFAULT '',
  is_crawler INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
`);

// 账户中心与后台看板的高频查询都按「某个客户 + 时间倒序」过滤，
// 这些表原先只有主键索引，数据量上来后会退化为全表扫描。
db.exec(`
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id, is_default DESC);
CREATE INDEX IF NOT EXISTS idx_devices_bind_customer ON device_bindings(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON service_tickets(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_device ON service_tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_customer ON after_sales(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_customer ON creator_submissions(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON course_sessions(course_id, sort);
CREATE INDEX IF NOT EXISTS idx_enrollment_course ON enrollment_inquiries(course_id);
CREATE INDEX IF NOT EXISTS idx_news_status_tag ON news(status, tag, published_at);
CREATE INDEX IF NOT EXISTS idx_products_status_sort ON products(status, sort);
`);

module.exports = db;
