#!/usr/bin/env bash
# 一键部署脚本：bash install.sh [对外域名]
# 在项目根目录执行。做四件事：装依赖 → 生成 .env → 建日志/权限 → pm2 拉起并自检。
# 幂等：重复执行不会覆盖已有 .env，只补缺失项。
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
warn(){ printf '  \033[1;33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- 1. 找 Node，版本必须 >= 18 ----------
say "检查 Node.js"
pick_node() {
  # 收集所有可能的 node，取版本最高的那个（宝塔的 Node 版本管理器不一定进 PATH）
  local cands=() p v best="" bestv=0
  command -v node >/dev/null 2>&1 && cands+=("$(command -v node)")
  for p in /www/server/nodejs/v*/bin/node /usr/local/bin/node /usr/bin/node; do
    [ -x "$p" ] && cands+=("$p")
  done
  for p in ${cands[@]+"${cands[@]}"}; do
    v="$("$p" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [ "${v:-0}" -gt "$bestv" ] 2>/dev/null; then bestv="$v"; best="$p"; fi
  done
  printf '%s' "$best"
}
NODE_BIN="$(pick_node)"
[ -n "$NODE_BIN" ] || die "找不到 node。宝塔：软件商店 → Node.js 版本管理器 → 安装 v18 或 v20，装完重新执行本脚本。"
NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "当前 Node 是 $("$NODE_BIN" -v)，低于 18 跑不起来。请装 v18 或以上后重试。"
[ "$NODE_MAJOR" -ge 20 ] || warn "Node $("$NODE_BIN" -v) 已停止安全维护，能跑；条件允许建议升到 v20/v22。"
ok "node $("$NODE_BIN" -v) → $NODE_BIN"
export PATH="$(dirname "$NODE_BIN"):$PATH"

NPM_BIN="$(command -v npm || echo "$(dirname "$NODE_BIN")/npm")"
[ -x "$NPM_BIN" ] || die "找不到 npm，Node 安装不完整。"
ok "npm $("$NPM_BIN" -v)"

# ---------- 2. 装依赖 ----------
say "安装生产依赖（首次约 1–3 分钟）"
need_install=0
if [ -d node_modules/better-sqlite3 ]; then
  # 目录在不代表能用：换过 Node 大版本后，旧的预编译二进制会加载失败
  if "$NODE_BIN" -e "require('better-sqlite3')" >/dev/null 2>&1; then
    ok "node_modules 已存在且可用，跳过"
  else
    warn "已有 node_modules 与当前 Node（$("$NODE_BIN" -v)）不匹配，重新安装"
    rm -rf node_modules
    need_install=1
  fi
else
  need_install=1
fi

if [ "$need_install" -eq 1 ]; then
  "$NPM_BIN" config set registry https://registry.npmmirror.com >/dev/null 2>&1 || true
  if ! "$NPM_BIN" install --omit=dev --no-audit --no-fund; then
    warn "安装失败，尝试装编译工具后重试 better-sqlite3"
    if command -v yum >/dev/null 2>&1; then yum install -y gcc-c++ make python3 >/dev/null 2>&1 || true; fi
    if command -v apt-get >/dev/null 2>&1; then apt-get install -y build-essential python3 >/dev/null 2>&1 || true; fi
    "$NPM_BIN" rebuild better-sqlite3 || die "better-sqlite3 仍装不上，见 DEPLOY.md 第 2 步。"
  fi
  "$NODE_BIN" -e "require('better-sqlite3')" >/dev/null 2>&1 || die "better-sqlite3 装好后仍加载失败，请把上面的报错发我。"
  ok "依赖安装完成"
fi
[ -f data/yaoprint.db ] || die "缺少 data/yaoprint.db（站点内容全在这个文件里）。请确认上传的是解压后的完整目录。"

# ---------- 3. 生成 .env ----------
say "配置 .env"
if [ ! -f .env ]; then
  cp .env.example .env
  ok "由 .env.example 生成"
else
  ok ".env 已存在，只补缺失项"
fi

SECRET="$("$NODE_BIN" -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
if grep -qE '^SESSION_SECRET=.+' .env; then
  ok "SESSION_SECRET 已配置，保持不变"
else
  sed -i.bak "s|^SESSION_SECRET=.*|SESSION_SECRET=${SECRET}|" .env
  ok "已生成随机 SESSION_SECRET"
fi

if [ -n "$DOMAIN" ]; then
  sed -i.bak "s|^#\{0,1\} *SITE_URL=.*|SITE_URL=https://${DOMAIN}|" .env
  ok "SITE_URL=https://${DOMAIN}"
else
  warn "未传域名，SITE_URL 保持注释状态（sitemap 与分享链接会用请求头推断）"
fi

grep -qE '^PORT=' .env || echo 'PORT=3000' >> .env
grep -qE '^NODE_ENV=' .env || echo 'NODE_ENV=production' >> .env
rm -f .env.bak
ok "PORT=$(grep -oE '^PORT=.*' .env | cut -d= -f2)"

# ---------- 4. 目录与权限 ----------
say "准备目录与权限"
mkdir -p logs data public/uploads
if [ "$(id -u)" -eq 0 ] && id www >/dev/null 2>&1; then
  chown -R www:www "$APP_DIR"
  find "$APP_DIR" -type d -exec chmod 755 {} \;
  find "$APP_DIR" -type f -exec chmod 644 {} \;
  chmod 755 data public/uploads logs
  ok "属主 www:www，data / public/uploads / logs 可写"
else
  warn "非 root 或没有 www 用户，跳过 chown（宝塔 Node 项目请把运行用户设为 www）"
fi

# ---------- 5. pm2 启动 ----------
say "启动服务"
if ! command -v pm2 >/dev/null 2>&1; then
  "$NPM_BIN" install -g pm2 --no-audit --no-fund >/dev/null 2>&1 || die "pm2 安装失败，可在宝塔软件商店装「PM2 管理器」后重试。"
  ok "已全局安装 pm2"
fi
pm2 startOrReload ecosystem.config.js --update-env >/dev/null
pm2 save >/dev/null 2>&1 || true
ok "pm2 已启动（进程名 yaoprint）"

# ---------- 6. 自检 ----------
say "自检"
PORT_VAL="$(grep -oE '^PORT=[0-9]+' .env | cut -d= -f2)"
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:${PORT_VAL}/api/health" >/tmp/.yq_health 2>/dev/null; then break; fi
  sleep 1
done
if [ -s /tmp/.yq_health ]; then
  ok "健康检查通过：$(cat /tmp/.yq_health)"
  rm -f /tmp/.yq_health
else
  warn "健康检查没通过，看日志：pm2 logs yaoprint --lines 80"
  exit 1
fi

cat <<EOF

────────────────────────────────────────
接下来在宝塔面板做两件事（只需一次）：

1. 修目录：网站 → 站点设置 → 网站目录 → 运行目录 选 /public → 保存
   （这步不做，首页会 403，而且 server.js、data/yaoprint.db 会被公网下载）

2. 开 SSL：站点设置 → SSL → Let's Encrypt 申请 → 强制 HTTPS
   生产模式下后台登录只走 HTTPS，不配 SSL 登不进后台

然后用下面的命令从外网确认（三条都应该是 404，最后一条应该是 200）：

  curl -sI https://你的域名/server.js | head -1
  curl -sI https://你的域名/data/yaoprint.db | head -1
  curl -sI https://你的域名/部署后必读.txt | head -1
  curl -sI https://你的域名/api/health | head -1

后台地址 https://你的域名/admin，账号密码在 部署后必读.txt，
登录后立刻改密码，并删掉这两个文件：

  rm -f 部署后必读.txt data/admin-credentials.txt
────────────────────────────────────────
EOF
