// 基线快照：记录所有 GET 接口的状态码 + 响应体摘要，用于重构前后回归对比
const crypto = require('crypto');
const BASE = 'http://127.0.0.1:3000';

const PUBLIC = [
  '/api/products', '/api/products/creality-k2', '/api/news', '/api/news?limit=3', '/api/news?tag=行业动态',
  '/api/settings', '/api/ecosystem-platforms', '/api/competitions', '/api/courses', '/api/teachers',
  '/api/campuses', '/api/education-cases', '/api/heroes', '/api/categories', '/api/reviews', '/api/videos',
  '/api/scenes', '/api/academy', '/api/downloads', '/api/content', '/api/content?type=faq',
  '/api/shop/skus', '/api/partners', '/api/printers',
  '/api/cart', '/api/orders', '/api/account/me', '/api/devices', '/api/submissions', '/api/tickets/mine',
  '/sitemap.xml', '/robots.txt', '/', '/index.html', '/courses/index.html', '/trial.html',
  '/admin', '/admin/index.html', '/api/nonexistent', '/no-such-page.html'
];

const ADMIN = [
  '/api/admin/me', '/api/admin/settings', '/api/admin/stats', '/api/admin/products', '/api/admin/products/1',
  '/api/admin/news', '/api/admin/leads', '/api/admin/subs', '/api/admin/tickets', '/api/admin/customers',
  '/api/admin/skus', '/api/admin/orders', '/api/admin/after-sales', '/api/admin/devices',
  '/api/admin/submissions', '/api/admin/partners', '/api/admin/partner-applications',
  '/api/admin/enrollment-inquiries', '/api/admin/content', '/api/admin/pageviews/summary',
  '/api/admin/ecosystem_platforms', '/api/admin/competitions', '/api/admin/courses', '/api/admin/teachers',
  '/api/admin/campuses', '/api/admin/education_cases', '/api/admin/reviews', '/api/admin/heroes',
  '/api/admin/printers', '/api/admin/scenes', '/api/admin/downloads'
];

const stable = v => Array.isArray(v) ? v.map(stable) : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v);
const digest = (text, status) => {
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
  if (json === null) return { status, kind: 'text', len: text.length, hash: crypto.createHash('sha1').update(text).digest('hex').slice(0, 8) };
  const shape = Array.isArray(json) ? `array(${json.length})` : `object(${Object.keys(json).sort().join(',')})`;
  return { status, kind: 'json', shape, hash: crypto.createHash('sha1').update(JSON.stringify(stable(json))).digest('hex').slice(0, 8) };
};

async function main() {
  const out = {};
  for (const path of PUBLIC) {
    const r = await fetch(BASE + path, { redirect: 'manual' });
    const text = await r.text();
    out[path] = digest(text, r.status);
  }
  // 管理员登录后访问后台接口
  const login = await fetch(BASE + '/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.ADMIN_PASSWORD || '84hGTBKhCS8wMM0l' })
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  out['POST /api/admin/login'] = { status: login.status, ok: (await login.json()).ok === true };
  for (const path of ADMIN) {
    const r = await fetch(BASE + path, { headers: { cookie }, redirect: 'manual' });
    const text = await r.text();
    out[path] = digest(text, r.status);
  }
  // 写接口的关键校验行为（不落库或可回滚的）
  const cases = [
    ['/api/content?limit=-5', 'limit 负数'],
    ['/api/content?limit=2', 'limit 正常'],
    ['/api/news?limit=-1', 'news limit 负'],
    ['/api/leads', 'POST 空'],
  ];
  for (const [p] of cases.slice(0, 3)) {
    const r = await fetch(BASE + p);
    const arr = await r.json().catch(() => null);
    out[p] = { status: r.status, count: Array.isArray(arr) ? arr.length : null };
  }
  out['POST /api/leads {}'] = await (async () => {
    const r = await fetch(BASE + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return { status: r.status, body: await r.json().catch(() => null) };
  })();
  out['GET /api/admin/stats 未登录'] = await (async () => {
    const r = await fetch(BASE + '/api/admin/stats');
    return { status: r.status };
  })();
  console.log(JSON.stringify(out, null, 1));
}
main();
