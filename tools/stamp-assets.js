// 静态资源版本号：给 HTML 里的 js/css 引用追加 ?v=<版本号>。
//
// 为什么需要：server.js 对 .css/.js 下发 `max-age=31536000, immutable`，
// 而引用的是固定文件名。不换 URL 的话，发版后老访客会继续用一年前的脚本。
//
// 用法：
//   node tools/stamp-assets.js                 # 就地改写 public/（默认，适合打包机上的产物目录）
//   node tools/stamp-assets.js --dry           # 只统计不写盘
//   node tools/stamp-assets.js --dir dist/public
//   node tools/stamp-assets.js --v 3fa9c21     # 显式指定版本号
//
// 版本号优先级：--v 参数 > GIT_SHA 环境变量 > git rev-parse > 当前时间戳。
// 时间戳兜底是为了支持 `git archive` 导出的制品目录（那种目录没有 .git）。
//
// 幂等：重复执行不会叠加成 ?v=a?v=b。
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const options = { dir: null, version: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry' || arg === '--dry-run') options.dry = true;
    else if (arg === '--dir') options.dir = argv[++i];
    else if (arg.startsWith('--dir=')) options.dir = arg.slice(6);
    else if (arg === '--v' || arg === '--version') options.version = argv[++i];
    else if (arg.startsWith('--v=')) options.version = arg.slice(4);
  }
  return options;
}

function resolveVersion(explicit) {
  if (explicit) return explicit;
  if (process.env.GIT_SHA) return process.env.GIT_SHA.trim();
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // 无 git 的制品目录：退回时间戳，仍然保证每次发版 URL 不同
    return `t${Date.now().toString(36)}`;
  }
}

const ARG = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(ARG.dir || path.join(__dirname, '..', 'public'));
const VERSION = resolveVersion(ARG.version);

// 只匹配相对或根路径的 js/css 引用，外部链接（https://、//）与图片不动。
// 同时兼容双引号与单引号写法。
const REF = /(src|href)=(["'])((?:\.\.\/|\/)?(?:js|css)\/[^"'?]+\.(?:js|css))(?:\?[^"']*)?\2/g;

// uploads 是用户上传的图片目录，admin 是纯内联页面，都不必处理。
const SKIP_DIRS = new Set(['uploads', 'admin', '.git', 'node_modules']);

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, onFile);
    } else if (entry.name.endsWith('.html')) {
      onFile(full);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`✗ 目录不存在：${ROOT}`);
  process.exit(1);
}

let files = 0;
let refs = 0;

walk(ROOT, file => {
  const before = fs.readFileSync(file, 'utf8');
  let hits = 0;
  const after = before.replace(REF, (_, attr, quote, asset) => {
    hits++;
    return `${attr}=${quote}${asset}?v=${VERSION}${quote}`;
  });
  if (after === before) return;
  files++;
  refs += hits;
  if (!ARG.dry) fs.writeFileSync(file, after);
  console.log(`  ${path.relative(ROOT, file)}  ${hits} 处`);
});

console.log(
  `${ARG.dry ? '[dry-run] ' : ''}版本号 ${VERSION}：${files} 个文件、${refs} 处引用${ARG.dry ? '（未写盘）' : '已更新'}`
);
if (!files) console.log('提示：没有匹配到引用，确认 --dir 是否指向包含 *.html 的目录。');
