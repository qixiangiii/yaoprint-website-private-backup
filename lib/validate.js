// 输入解析、校验与裁剪的纯函数集合。
// 路由层只负责调用这些函数，不再各自重复实现正则与截断逻辑。
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

// 只允许站内路径或 HTTPS 外链，阻断 javascript: / data: 等伪协议
function safeLink(value = '') {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { return new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
}

// 竞赛类入口只允许外部 HTTPS 官网，站内路径不接受
function httpsOnly(value = '') {
  const url = String(value || '').trim();
  if (!url) return '';
  try { return new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
}

function isExternal(url = '') { return /^https:\/\//i.test(url); }

function isEmail(value = '') { return EMAIL_RE.test(String(value).trim()); }

// 公开提交类接口的字段长度上限，防止单次请求写入超大文本（DoS / 数据库膨胀）
function capStrings(max = 4000) {
  return function capStringsMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string' && req.body[key].length > max) {
          req.body[key] = req.body[key].slice(0, max);
        }
      }
    }
    next();
  };
}

// 单字段长度裁剪：不同字段语义不同，统一 4000 上限对姓名/电话过于宽松
function limitText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

// 电话格式校验：手机号、带区号固话、可带 +86 前缀与分隔符
function isPhone(value = '') {
  const raw = String(value).trim().replace(/[\s()（）]/g, '');
  if (!raw) return false;
  const normalized = raw.replace(/^\+?86/, '');
  return /^1[3-9]\d{9}$/.test(normalized) || /^0\d{2,3}-?\d{7,8}$/.test(normalized);
}

// 图片文件魔数校验：防止伪造 Content-Type 上传非图片内容（如 HTML/脚本）
function isValidImageBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true; // GIF
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true; // WEBP
  return false;
}

// 查询参数的整数收敛：负数、NaN、超大值统一回落到合法区间。
// 注：SQLite 的 LIMIT -1 表示“不限制”，必须显式收敛，否则等于绕过条数上限。
function clampInt(value, { min = 0, max = 100, fallback = max } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num) || String(value).trim() === '') return fallback;
  return Math.min(Math.max(Math.trunc(num), min), max);
}

module.exports = { parseJSON, safeLink, httpsOnly, isExternal, isEmail, capStrings, limitText, isPhone, isValidImageBuffer, clampInt };
