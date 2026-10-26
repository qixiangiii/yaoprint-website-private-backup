// 数据访问的公共读取层：预编译语句复用 + 站点设置缓存。
const db = require('../db');

// better-sqlite3 的 prepare 每次都要解析 SQL。站点路由的 SQL 是有限的固定串，
// 按 SQL 文本缓存编译结果即可，避免每个请求重复解析（路由数量多时收益明显）。
const MAX_STATEMENTS = 400;
const statements = new Map();

function stmt(sql) {
  let prepared = statements.get(sql);
  if (!prepared) {
    if (statements.size >= MAX_STATEMENTS) statements.clear(); // 防御性上限，正常不会触发
    prepared = db.prepare(sql);
    statements.set(sql, prepared);
  }
  return prepared;
}

// 设置表是全站高频只读数据（每个页面都会取一次），整表读入内存，
// 写接口成功后调用 invalidateSettings() 失效，保证一致性。
let settingsCache = null;

function allSettings() {
  if (!settingsCache) {
    const snapshot = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) snapshot[row.key] = row.value;
    settingsCache = snapshot;
  }
  return settingsCache;
}

function getSetting(key, fallback = '') {
  const value = allSettings()[key];
  return value === undefined || value === null ? fallback : value;
}

function publicSettings(keys) {
  const snapshot = allSettings();
  const out = {};
  for (const key of keys) if (snapshot[key] !== undefined) out[key] = snapshot[key];
  return out;
}

function invalidateSettings() { settingsCache = null; }

// 公开设置白名单：仅暴露品牌/联系/SEO/统计等前台展示项，绝不返回 webhook 等敏感键
const PUBLIC_SETTING_KEYS = [
  'brand_name', 'site_name', 'site_tagline', 'site_url', 'company_legal_name',
  'business_scope', 'campus_summary', 'copyright', 'icp', 'course_catalog_visibility',
  'seo_default_title', 'seo_default_description',
  'contact_address', 'contact_email', 'contact_hours', 'contact_phone', 'contact_wechat',
  'social_bilibili', 'social_douyin', 'social_wechat', 'social_weibo', 'social_youtube',
  'stat1_label', 'stat1_unit', 'stat1_value', 'stat2_label', 'stat2_unit', 'stat2_value',
  'stat3_label', 'stat3_unit', 'stat3_value', 'stat4_label', 'stat4_unit', 'stat4_value'
];

module.exports = { db, stmt, allSettings, getSetting, publicSettings, invalidateSettings, PUBLIC_SETTING_KEYS };
