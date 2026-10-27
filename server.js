// 起元星启 — 课程、设备参考与教育运营 API
// 本文件只做“装配”：中间件 → 路由模块 → 静态资源 → 兜底处理 → 启动。
// 业务实现见 routes/，通用能力见 lib/。
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');

const db = require('./db');
const { csrfOriginGuard } = require('./lib/security');
const { startPruneScheduler } = require('./lib/prune');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (IS_PROD ? '' : 'qiyuan-xingqi-development-secret-change-me');
if (IS_PROD && !SESSION_SECRET) throw new Error('生产环境必须配置 SESSION_SECRET');

// 反向代理后正确解析客户端 IP / 协议，保证 secure Cookie、限流与访问统计准确。
// 默认不信任 X-Forwarded-*，避免直连时被伪造；部署到 Nginx 等一层代理后由生产环境开启。
if (IS_PROD) app.set('trust proxy', 1);

// 关闭框架指纹，避免暴露技术栈
app.disable('x-powered-by');

// 安全响应头（CSP 保持宽松以兼容现有内联脚本与第三方字体/图片）
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// gzip/brotli 压缩文本类响应
app.use(compression());

// 收紧请求体大小：JSON 2MB、表单 256KB，防止超大载荷拖垮进程或撑大数据库
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb', parameterLimit: 100 }));

app.use(csrfOriginGuard);

// 健康检查：监控/负载均衡探活用。返回服务状态与数据库连通性，
// 数据库不可用时返回 503，避免把故障节点继续留在流量里。
app.get('/api/health', (req, res) => {
  let dbOk = true;
  try { db.prepare('SELECT 1').get(); } catch { dbOk = false; }
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    ok: dbOk,
    service: 'qiyuan-xingqi',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD, // 生产环境仅经 HTTPS 传输，防止会话 Cookie 被嗅探
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// ============ 业务路由 ============
// 顺序要求：显式路由（public / commerce / admin 内部）必须在通用 CRUD 之前注册，
// 通用 CRUD 在 routes/admin.js 末尾统一注册，以保证专门实现的接口优先命中。
require('./routes/public')(app);
require('./routes/commerce')(app);
require('./routes/admin')(app);
require('./routes/seo')(app);

// ============ 静态资源 ============
// 按类型设置长缓存，提升回访加载速度。
// HTML 不缓存（保证改版即时生效），图片/字体 30 天，CSS/JS/SVG 一年。
const staticOpts = {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (/\.(css|js|mjs|svg|ico)$/.test(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(png|jpe?g|webp|gif|avif|woff2?|ttf|otf)$/.test(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (/\.html?$/.test(ext)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOpts));

// 使用品牌 Logo 作为轻量站点图标，避免浏览器在教育页发起 favicon 404 请求。
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'img', 'logo.svg')));

const ADMIN_DIR = path.join(__dirname, 'public', 'admin');
app.get('/admin', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));
app.get('/admin/*', (req, res) => {
  const relative = req.path.replace(/^\/admin\/?/, '') || 'index.html';
  const resolved = path.resolve(ADMIN_DIR, relative);
  // 解析后仍须位于 admin 目录内，阻断 ../ 路径遍历读取任意文件
  if ((resolved === ADMIN_DIR || resolved.startsWith(ADMIN_DIR + path.sep)) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return res.sendFile(resolved);
  }
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ============ 兜底 ============
// 404：接口返回 JSON，页面返回带导航的品牌化提示页
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: '接口不存在' });
  res.status(404).type('html').send(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>页面不存在｜起元星启</title>
<link rel="stylesheet" href="/css/style.min.css"></head>
<body><main class="section"><div class="container" style="text-align:center;padding:80px 0">
<p class="kicker">404</p><h1>没有找到这个页面</h1>
<p style="color:var(--text-secondary);margin:12px 0 28px">地址可能已经调整，或链接输入有误。可以回到首页，或直接预约一次体验课。</p>
<p><a class="btn btn-primary" href="/">返回首页</a> <a class="btn btn-outline" href="/trial.html">预约试听</a> <a class="btn btn-outline" href="/contact.html">联系我们</a></p>
</div></main></body></html>`);
});

// 统一错误出口：接口一律返回 JSON，页面返回简短提示；生产环境不输出堆栈
app.use((error, req, res, next) => {
  console.error('[server error]', req.method, req.originalUrl, error && error.message);
  if (res.headersSent) return next(error);
  // 框架抛出的客户端错误（如 JSON 解析失败）自带 status，直接透传
  const status = Number(error && (error.status || error.statusCode)) || 500;
  const message = status >= 500 && IS_PROD ? '服务器内部错误，请稍后重试' : String((error && error.message) || '服务器内部错误');
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).type('text').send(`请求处理失败：${message}`);
});

app.listen(PORT, () => {
  console.log(`🟢 起元星启网站已启动: http://localhost:${PORT}`);
  console.log(`   后台管理: http://localhost:${PORT}/admin`);
  warnWeakAdminPassword();
  startPruneScheduler();
});

// 弱口令自检：命中常见默认口令时给出明确告警（替代原先只比对 admin123 的失效检查）
function warnWeakAdminPassword() {
  const WEAK_PASSWORDS = ['admin123', '123456', 'admin', 'password'];
  try {
    const adminUser = db.prepare("SELECT password_hash FROM users WHERE username='admin'").get();
    if (!adminUser) return;
    if (WEAK_PASSWORDS.some(password => bcrypt.compareSync(password, adminUser.password_hash))) {
      console.warn('⚠️  安全警告：后台仍在使用常见弱口令，请立即在「后台 → 修改密码」中更换！');
    }
  } catch { /* 忽略检测异常 */ }
}
