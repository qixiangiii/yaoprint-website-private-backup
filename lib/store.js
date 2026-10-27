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

// 设置项 schema：后台表单渲染的单一来源（键名 → 分组/标签/宽度）。
// 前端据此生成表单，不再各自硬编码键清单，避免后端白名单与前端表单漂移。
// 顺序即展示顺序；新增设置项时只需在此追加，前端会自动渲染。
const SETTING_SCHEMA = [
  { group: '品牌与联系信息', fields: [
    ['site_name', '站点名称'], ['brand_name', '展示品牌名'], ['company_legal_name', '公司法定全称', 'full'],
    ['site_tagline', '站点副标题', 'full'], ['business_scope', '业务范围', 'full'], ['campus_summary', '校区/服务说明', 'full'],
    ['contact_phone', '联系电话'], ['contact_wechat', '咨询微信'], ['contact_email', '联系邮箱'],
    ['contact_hours', '咨询时间'], ['contact_address', '联系地址', 'full'], ['copyright', '版权信息', 'full'], ['icp', 'ICP 备案号']
  ] },
  { group: 'SEO 与统计', fields: [
    ['site_url', '站点域名（用于 sitemap 与分享卡片，如 https://www.example.com）', 'full'],
    ['seo_default_title', '默认 SEO 标题', 'full'], ['seo_default_description', '默认 SEO 描述', 'full']
  ] },
  { group: '社交媒体链接', fields: [
    ['social_wechat', '微信链接'], ['social_weibo', '微博链接'], ['social_bilibili', 'B 站链接'],
    ['social_douyin', '抖音链接'], ['social_youtube', 'YouTube 链接']
  ] },
  { group: '通知设置', fields: [
    ['wecom_webhook_url', '企业微信机器人 Webhook（预约/咨询提交时推送，留空则不推送）', 'full']
  ] },
  { group: '首页数据条', fields: [
    ['stat1_value', '数据 1 数值'], ['stat1_unit', '数据 1 单位'], ['stat1_label', '数据 1 描述', 'full'],
    ['stat2_value', '数据 2 数值'], ['stat2_unit', '数据 2 单位'], ['stat2_label', '数据 2 描述', 'full'],
    ['stat3_value', '数据 3 数值'], ['stat3_unit', '数据 3 单位'], ['stat3_label', '数据 3 描述', 'full'],
    ['stat4_value', '数据 4 数值'], ['stat4_unit', '数据 4 单位'], ['stat4_label', '数据 4 描述', 'full']
  ] },
];

module.exports = { db, stmt, allSettings, getSetting, publicSettings, invalidateSettings, settableKeys, PUBLIC_SETTING_KEYS, SETTING_SCHEMA };
