#!/usr/bin/env node
/* Lightweight static checks for the education website. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'uploads') walk(full);
    else if (entry.isFile() && full.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(publicDir);

const issues = [];
const localRefs = new Set(htmlFiles.map(file => '/' + path.relative(publicDir, file).replaceAll(path.sep, '/')));
const assetRoots = ['/css/', '/js/', '/img/'];
const localTarget = href => {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:/i.test(href)) return null;
  const clean = href.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return null;
  return clean;
};

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  if (!/<title(?:\s[^>]*)?>[^<]+<\/title>/i.test(html)) issues.push(`${rel}: missing title`);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]).filter(id => !/[${}]/.test(id));
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) issues.push(`${rel}: duplicate id=${id}`);
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const target = localTarget(match[1]);
    if (!target) continue;
    if (target.startsWith('/img/') || target.startsWith('/css/') || target.startsWith('/js/')) {
      if (!fs.existsSync(path.join(publicDir, target.slice(1)))) issues.push(`${rel}: missing asset ${target}`);
    } else if (target.endsWith('.html') && !localRefs.has(target)) {
      issues.push(`${rel}: missing page ${target}`);
    }
  }
  for (const img of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(img[1])) issues.push(`${rel}: image missing alt`);
  }
}

const css = fs.readFileSync(path.join(publicDir, 'css/style.css'), 'utf8');
let balance = 0;
for (const char of css) { if (char === '{') balance++; if (char === '}') balance--; }
if (balance !== 0) issues.push(`public/css/style.css: brace balance ${balance}`);

if (issues.length) {
  console.error(`site-check: ${issues.length} issue(s)`);
  issues.slice(0, 80).forEach(issue => console.error(`- ${issue}`));
  process.exitCode = 1;
} else {
  console.log(`site-check: OK (${htmlFiles.length} HTML pages, assets and CSS balance checked)`);
}
