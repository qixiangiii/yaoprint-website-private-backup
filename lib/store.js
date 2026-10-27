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

// 设置表是全站高频只读数据（每个页面都会取一次），整表读入内存。
// 失效有两个途径：写接口主动调用 invalidateSettings()，以及 30s TTL。
// 只靠主动失效是不够的——运维直接改库、seed 脚本、多实例部署都会绕开写接口，
// 那些场景下接口会一直返回旧值，直到进程重启（已实测）。
const SETTINGS_TTL_MS = 30 * 1000;
let settingsCache = null;
let settingsCachedAt = 0;

function allSettings() {
  const now = Date.now();
  if (!settingsCache || now - settingsCachedAt > SETTINGS_TTL_MS) {
    const snapshot = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) snapshot[row.key] = row.value;
    settingsCache = snapshot;
    settingsCachedAt = now;
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

function invalidateSettings() { settingsCache = null; settingsCachedAt = 0; }

// 后台可写的设置键：settings 表内除迁移标记外的全部键。
// migration_* 是数据迁移的一次性执行标记，被覆盖后 db.js 会判定迁移未跑而重放迁移，
// 因此既不允许后台写入，也不能出现在任何兜底白名单里。
function settableKeys() {
  const keys = db.prepare('SELECT key FROM settings').all().map(row => row.key);
  return new Set(keys.filter(key => !key.startsWith('migration_')));
}

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

module.exports = { db, stmt, allSettings, getSetting, publicSettings, invalidateSettings, settableKeys, PUBLIC_SETTING_KEYS };
