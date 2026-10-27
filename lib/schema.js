// 数据库 schema 定义：建表 DDL、增量加列（ensureColumn）与索引。
// 从 db.js 抽离，让「表长什么样」这一件事集中在一处；
// db.js 只负责连接与编排迁移/种子，不再内联几百行 DDL。
//
// 设计约定：
// 1. 所有 CREATE TABLE 一律 IF NOT EXISTS，配合 ensureColumn 做增量演进，
//    避免对已上线库做破坏性 ALTER。
// 2. ensureColumn 用 PRAGMA table_info 判断列是否存在，幂等可重复执行。
// 3. 索引只加在高频「按客户 + 时间倒序」与「按状态排序」的查询路径上。
function initSchema(db) {
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

  // ============ 增量加列（幂等） ============
  // 已上线库用 ALTER TABLE 补列；新库因上面的 DDL 已含这些列，ensureColumn 直接跳过。
  const ensureColumn = (table, column, defSql) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defSql}`);
    }
  };

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

  // ============ 高频查询索引 ============
  // 账户中心与后台看板都按「某个客户 + 时间倒序」过滤，这些表原先只有主键索引。
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
}

module.exports = { initSchema };
