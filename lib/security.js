// 安全相关中间件与工具：CSRF 来源校验、限流工厂、Webhook 白名单。
const rateLimit = require('express-rate-limit');

// CSRF 纵深防御：写请求若携带 Origin 且与本机 Host 不一致则拒绝。
// （同站 fetch/表单 Origin 与 Host 一致；旧浏览器不发送 Origin 时回退到 SameSite=Lax 保护）
function csrfOriginGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.get('host')) return next();
  } catch { /* 非法 Origin 视为跨站 */ }
  return res.status(403).json({ error: '跨站请求被拒绝' });
}

// 限流器统一工厂：只声明窗口、次数与提示语，公共参数集中维护。
function makeLimiter({ windowMs, max, error }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error }
  });
}

// 只允许外网 HTTPS 地址，阻断指向内网/回环的 SSRF 请求（如云元数据 169.254.169.254）
function isSafeWebhook(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host === '[::1]' || host === '::1') return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch { return false; }
}

module.exports = { csrfOriginGuard, makeLimiter, isSafeWebhook };
