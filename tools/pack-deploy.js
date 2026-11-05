// 打包部署包：node tools/pack-deploy.js
// 产物：dist/yaoprint-site-<日期>.zip 与同名 .tar.gz，解压后可直接在宝塔上 npm install + 启动。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STAMP = new Date().toISOString().slice(0, 10);
const OUT_NAME = `yaoprint-site-${STAMP}`;
const OUT_DIR = path.join(DIST, OUT_NAME);

// 不进入部署包的路径（相对项目根）
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.github', '.playwright-cli', '.zcode', '.workbuddy',
  'dist', 'output', 'ppt_build', 'ppt_delivery_40', 'ppt_demo_retract', 'ppt_lecture',
  '教学资料', 'qa_render', '_unused-covers',
]);
const EXCLUDE_FILES = new Set([
  '.DS_Store', '.env', '.zcodeignore', '.gitignore',
  // 旧的明文凭据文件，密码已在打包时重置，这个留着只会泄露上一条密码
  'admin-credentials.txt',
]);
const EXCLUDE_EXT = /\.(pptx|docx|zip|log|db-wal|db-shm)$/i;

// 只在项目根一层排除：这些是早期版本留下的静态页副本，早已被 public/ 下的同名文件取代。
// 注意 curriculum.js / teaching-articles.js / industry-news.js 不能排除
// ——db.js 启动时会 require 它们做内容种子，删掉会直接起不来。
const ROOT_ONLY_EXCLUDE = new Set([
  'about.html', 'contact.html', 'index.html', 'products.html', 'solutions.html', 'support.html',
  'css', 'js', 'docs',
]);

function copyTree(from, to, depth = 0) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (depth === 0 && ROOT_ONLY_EXCLUDE.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      copyTree(src, dest, depth + 1);
      continue;
    }
    if (EXCLUDE_FILES.has(entry.name)) continue;
    if (EXCLUDE_EXT.test(entry.name)) continue;
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o644);
  }
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    n += entry.isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

// ---- 1. 准备干净目录 ----
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
copyTree(ROOT, OUT_DIR);

// 日志目录与空占位，保证 PM2 能写日志
fs.mkdirSync(path.join(OUT_DIR, 'logs'), { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'logs', '.gitkeep'), '');

// ---- 1b. 给静态资源加版本号 ----
// server.js 对 .css/.js 下发 max-age=31536000, immutable，而引用是固定文件名。
// 不在产物上换 URL，以后每次发版老访客都会继续用缓存里的旧脚本和旧样式。
// 只在 dist 产物上打，仓库里的源文件保持干净。
let assetVersion = '';
let assetCount = '';
try {
  const out = execFileSync(
    process.execPath,
    [path.join(__dirname, 'stamp-assets.js'), '--dir', path.join(OUT_DIR, 'public')],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assetVersion = (out.match(/版本号\s*([^\s：:]+)/) || [])[1] || '';
  assetCount = (out.match(/(\d+)\s*个文件[、,]\s*(\d+)\s*处/) || []).slice(1).join(' 个文件 / ') || '';
} catch (error) {
  console.log('⚠ 静态资源版本号注入失败，已跳过：', String(error.message).slice(0, 100));
}

// ---- 2. 导出数据库快照并重置后台密码 ----
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const liveDb = path.join(ROOT, 'data', 'yaoprint.db');
const outDb = path.join(OUT_DIR, 'data', 'yaoprint.db');
const tmpDb = path.join(DIST, '.snapshot.db');
fs.rmSync(tmpDb, { force: true });

const live = new Database(liveDb);
live.pragma('wal_checkpoint(TRUNCATE)');
live.exec(`VACUUM INTO '${tmpDb.replace(/'/g, "''")}'`);
live.close();

const snap = new Database(tmpDb);
const adminPassword = crypto.randomBytes(9).toString('base64url');
snap
  .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
  .run(bcrypt.hashSync(adminPassword, 10), 'admin');
snap.pragma('wal_checkpoint(TRUNCATE)');
snap.close();

fs.copyFileSync(tmpDb, outDb);
fs.rmSync(tmpDb, { force: true });

// ---- 3. 后台凭据与上线提醒 ----
const notes = `起元星启官网 · 部署后必读
生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

【后台登录】
  地址：https://你的域名/admin
  账号：admin
  密码：${adminPassword}

这个密码只在本文件里出现一次。登录后请立刻到「修改密码」改成自己的口令，
然后删除本文件与 data/admin-credentials.txt：

  rm -f 部署后必读.txt data/admin-credentials.txt

【上线后要补的内容】
  1. 站点设置 → ICP 备案号（现在为空，页脚不显示，国内服务器必须挂）
  2. 站点设置 → 站点地址 site_url（影响 sitemap 与微信分享）
  3. 站点设置 → 对外电话 / 邮箱 / 详细地址（当前电话是手机号、邮箱是 gmail）
  4. support 页的「7×12 客服 / 48 小时响应 / 12 个月质保」若非实际承诺，改成实际值

【服务器环境】
  Node.js 18 及以上都能跑（有 v20/v22 更好）。一条命令装完并配好反代：
    cd 站点目录 && bash tools/server-setup.sh 你的域名
  Node 18 已停止安全维护，只在服务器升不上去（如 CentOS 7）时继续用。

【数据库备份】
  sqlite3 data/yaoprint.db ".backup '/www/backup/yaoprint-$(date +%F).db'"

【不要执行 npm run seed】
  该脚本会清空产品、新闻、课程、设置等全部内容表，只在全新空库时用于演示数据。

完整步骤见 DEPLOY.md。
`;
fs.writeFileSync(path.join(OUT_DIR, '部署后必读.txt'), notes, { mode: 0o600 });

// ---- 4. 打包 ----
const zipPath = path.join(DIST, `${OUT_NAME}.zip`);
const tarPath = path.join(DIST, `${OUT_NAME}.tar.gz`);
fs.rmSync(zipPath, { force: true });
fs.rmSync(tarPath, { force: true });

let zipped = false;
try {
  execFileSync('zip', ['-qr', zipPath, OUT_NAME], { cwd: DIST });
  zipped = true;
} catch {
  console.log('（系统没有 zip 命令，跳过 zip；保留 tar.gz）');
}
let tarred = false;
try {
  execFileSync('tar', ['-czf', tarPath, OUT_NAME], { cwd: DIST });
  tarred = true;
} catch {
  console.log('（tar 打包失败，仅保留目录）');
}

// ---- 5. 汇总 ----
const size = dirSize(OUT_DIR);
const files = countFiles(OUT_DIR);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

console.log('');
console.log(`部署目录：${path.relative(ROOT, OUT_DIR)}/  ${files} 个文件，${mb(size)}`);
if (assetVersion) console.log(`资源版本：?v=${assetVersion}（${assetCount || '已注入'} 处引用，发版换版本号即刷新缓存）`);
if (zipped) console.log(`zip     ：${path.relative(ROOT, zipPath)}  ${mb(fs.statSync(zipPath).size)}`);
if (tarred) console.log(`tar.gz  ：${path.relative(ROOT, tarPath)}  ${mb(fs.statSync(tarPath).size)}`);
console.log('');
console.log(`后台账号：admin  密码：${adminPassword}`);
console.log('（同一份密码也写在包内「部署后必读.txt」）');
console.log('');
console.log('上传后：解压 → npm install --omit=dev → 配 .env → pm2 start ecosystem.config.js');
