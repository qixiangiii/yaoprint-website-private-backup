#!/usr/bin/env node
// 前端脚本压缩构建：以未压缩源码为唯一真源，生成同名的 .min.js。
// 页面引用的是 .min.js，此前需要手工同步两份文件，容易漏改（例如安全修复只改了源码）。
// 用法：npm run build:js
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SRC_DIR = path.join(__dirname, '..', 'public', 'js');
// 顺序无关，仅决定日志输出顺序
const FILES = ['main', 'education', 'business', 'business-extra', 'competition', 'competition-data', 'page'];

async function buildOne(name) {
  const sourcePath = path.join(SRC_DIR, `${name}.js`);
  const outputPath = path.join(SRC_DIR, `${name}.min.js`);
  const code = fs.readFileSync(sourcePath, 'utf8');
  const result = await minify(code, {
    compress: { passes: 2 },
    // 只压缩局部变量与参数，不重命名顶层标识符，避免影响页面内联脚本的全局引用
    mangle: true,
    format: { comments: false, ascii_only: false }
  });
  if (!result.code) throw new Error(`${name}.js 压缩结果为空`);
  fs.writeFileSync(outputPath, result.code + '\n');
  const before = Buffer.byteLength(code, 'utf8');
  const after = Buffer.byteLength(result.code, 'utf8');
  return { name, before, after, ratio: Math.round((1 - after / before) * 100) };
}

(async () => {
  let failed = 0;
  for (const name of FILES) {
    try {
      const stat = await buildOne(name);
      console.log(`✓ ${stat.name}.min.js  ${(stat.before / 1024).toFixed(1)}KB → ${(stat.after / 1024).toFixed(1)}KB  (-${stat.ratio}%)`);
    } catch (error) {
      failed++;
      console.error(`✗ ${name}.min.js 构建失败：${error.message}`);
    }
  }
  if (failed) process.exit(1);
})();
