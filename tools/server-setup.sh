#!/usr/bin/env bash
# 服务器端一键部署：在宝塔终端里用 root 执行
#   bash server-setup.sh 3d.novagnss.com [项目目录]
#
# 做四件事：装依赖 → 生成 .env → pm2 拉起 Node → 给站点加上反向代理并重载 Nginx。
# 改 Nginx 前会备份，nginx -t 不通过会自动回滚。重复执行安全（已配好的步骤会跳过）。
set -euo pipefail

DOMAIN="${1:-}"
PROJ_ARG="${2:-}"

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -n "$DOMAIN" ] || die "用法：bash server-setup.sh 你的域名 [项目目录]"
[ "$(id -u)" -eq 0 ] || die "请用 root 执行（宝塔终端默认就是 root）"

# ---------- 1. 定位项目目录 ----------
say "定位项目目录"
PROJ="$PROJ_ARG"
if [ -z "$PROJ" ]; then
  PROJ="$(find /www/wwwroot -maxdepth 4 -name server.js -printf '%h\n' 2>/dev/null | head -1 || true)"
fi
[ -n "$PROJ" ] || die "没找到 server.js。请把项目目录作为第二个参数传进来，例如：bash server-setup.sh $DOMAIN /www/wwwroot/yaoprint"
PROJ="$(cd "$PROJ" && pwd)"
[ -f "$PROJ/server.js" ] || die "$PROJ 里没有 server.js"
[ -d "$PROJ/public" ] || die "$PROJ 里没有 public 目录，可能上传不完整"
[ -f "$PROJ/data/yaoprint.db" ] || die "$PROJ 里没有 data/yaoprint.db，站点内容全在这个文件里"
ok "$PROJ"

# ---------- 2. Node ----------
say "检查 Node.js"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -1d /www/server/nodejs/v*/bin/node 2>/dev/null | sort -V | tail -1 || true)"
fi
[ -n "$NODE_BIN" ] || die "找不到 node。宝塔：软件商店 → Node.js 版本管理器 → 安装 v22，然后重跑本脚本。"
[ "$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')" -ge 20 ] || die "Node 版本过低（$("$NODE_BIN" -v)），需要 20 以上。"
export PATH="$(dirname "$NODE_BIN"):$PATH"
NPM_BIN="$(command -v npm || echo "$(dirname "$NODE_BIN")/npm")"
ok "node $("$NODE_BIN" -v) / npm $("$NPM_BIN" -v)"

# ---------- 3. 依赖 ----------
say "安装生产依赖"
cd "$PROJ"
if [ -d node_modules/better-sqlite3 ]; then
  ok "已安装，跳过"
else
  "$NPM_BIN" config set registry https://registry.npmmirror.com >/dev/null 2>&1 || true
  if ! "$NPM_BIN" install --omit=dev --no-audit --no-fund; then
    warn "安装失败，补编译工具后重试"
    command -v yum >/dev/null 2>&1 && yum install -y gcc-c++ make python3 >/dev/null 2>&1 || true
    command -v apt-get >/dev/null 2>&1 && apt-get install -y build-essential python3 >/dev/null 2>&1 || true
    "$NPM_BIN" rebuild better-sqlite3 || die "better-sqlite3 装不上，见 DEPLOY.md 第 2 步"
  fi
  ok "依赖安装完成"
fi

# ---------- 4. .env ----------
say "配置 .env"
[ -f .env ] || { cp .env.example .env; ok "由 .env.example 生成"; }
if grep -qE '^SESSION_SECRET=.+' .env; then
  ok "SESSION_SECRET 已存在，保持不变"
else
  SECRET="$("$NODE_BIN" -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${SECRET}|" .env
  ok "已生成随机 SESSION_SECRET"
fi
sed -i "s|^#\{0,1\} *SITE_URL=.*|SITE_URL=https://${DOMAIN}|" .env
grep -qE '^PORT=' .env || echo 'PORT=3000' >> .env
grep -qE '^NODE_ENV=' .env || echo 'NODE_ENV=production' >> .env
PORT="$(grep -oE '^PORT=[0-9]+' .env | cut -d= -f2)"
ok "PORT=$PORT  SITE_URL=https://$DOMAIN"

mkdir -p logs data public/uploads
if id www >/dev/null 2>&1; then
  chown -R www:www "$PROJ"
  chmod -R 755 "$PROJ/data" "$PROJ/public/uploads" "$PROJ/logs" 2>/dev/null || true
  ok "属主 www:www"
else
  warn "没有 www 用户，跳过权限设置"
fi

# ---------- 5. 启动 Node ----------
say "启动 Node 服务"
if ss -ltnp 2>/dev/null | grep -q ":${PORT} "; then
  ok "端口 ${PORT} 已被占用，认为服务已在运行"
else
  if ! command -v pm2 >/dev/null 2>&1; then
    "$NPM_BIN" install -g pm2 --no-audit --no-fund >/dev/null 2>&1 || die "pm2 装不上，可用宝塔软件商店装「PM2 管理器」"
    ok "已安装 pm2"
  fi
  if id www >/dev/null 2>&1; then
    su -s /bin/bash www -c "cd '$PROJ' && PATH=$PATH pm2 startOrReload ecosystem.config.js --update-env" >/dev/null 2>&1 \
      || pm2 startOrReload ecosystem.config.js --update-env >/dev/null
  else
    pm2 startOrReload ecosystem.config.js --update-env >/dev/null
  fi
  pm2 save >/dev/null 2>&1 || true
  ok "pm2 已启动"
fi

HEALTH=""
for i in $(seq 1 20); do
  if HEALTH="$(curl -fsS "http://127.0.0.1:${PORT}/api/health" 2>/dev/null)"; then break; fi
  HEALTH=""; sleep 1
done
[ -n "$HEALTH" ] || { pm2 logs yaoprint --lines 40 --nostream 2>/dev/null || true; die "服务没起来，看上面的日志"; }
ok "健康检查：$HEALTH"

# ---------- 6. 给站点加反向代理 ----------
say "配置 Nginx 反向代理"
CONF="$(grep -rlE "server_name[^;]*${DOMAIN}([[:space:]]|;)" /www/server/panel/vhost/nginx/*.conf 2>/dev/null | head -1 || true)"
if [ -z "$CONF" ]; then
  warn "没在 /www/server/panel/vhost/nginx/ 找到 $DOMAIN 的站点配置"
  warn "请在宝塔面板 → 网站 → Node 项目 里建一个项目（目录 $PROJ、启动文件 server.js、端口 $PORT），会自动生成反代"
  exit 2
fi
ok "站点配置：$CONF"

if grep -q "proxy_pass http://127.0.0.1:${PORT}" "$CONF"; then
  ok "反向代理已存在，跳过"
else
  BACKUP="${CONF}.yqbak.$(date +%s)"
  cp -a "$CONF" "$BACKUP"
  ok "已备份 → $BACKUP"

  BLOCKFILE="$(mktemp)"
  cat > "$BLOCKFILE" <<'EOF'
    #PROXY-START 由 server-setup.sh 添加（原 root 指向项目根目录，改由 Node 处理全部请求）
    location / {
        proxy_pass http://127.0.0.1:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_connect_timeout 30s;
        proxy_read_timeout    60s;
        proxy_send_timeout    60s;
        client_max_body_size  20m;
    }
    location ~ ^/(data|lib|routes|tools|deploy|logs)/ { deny all; return 404; }
    location ~ ^/(server|db|seed|seed-printers|curriculum|teaching-articles|industry-news)\.js$ { deny all; return 404; }
    location ~ /(\.env|package-lock\.json|ecosystem\.config\.js)$ { deny all; return 404; }
    #PROXY-END
EOF
  sed -i "s|__PORT__|${PORT}|g" "$BLOCKFILE"

  awk -v bf="$BLOCKFILE" '
    BEGIN { nb = 0; while ((getline l < bf) > 0) blk[++nb] = l }
    { line[NR] = $0 }
    END {
      for (i = NR; i >= 1; i--) if (line[i] ~ /^[[:space:]]*}[[:space:]]*$/) { last = i; break }
      if (!last) exit 3
      for (i = 1; i <= NR; i++) {
        if (i == last) { for (k = 1; k <= nb; k++) print blk[k] }
        print line[i]
      }
    }' "$CONF" > "${CONF}.new" || { rm -f "${CONF}.new" "$BLOCKFILE"; die "写入 Nginx 配置失败"; }
  rm -f "$BLOCKFILE"

  mv "${CONF}.new" "$CONF"
  if nginx -t >/tmp/.nginx_test 2>&1; then
    nginx -s reload
    ok "已写入反向代理并重载 Nginx"
  else
    cp -a "$BACKUP" "$CONF"
    cat /tmp/.nginx_test
    die "Nginx 配置检查不通过，已回滚到备份"
  fi
fi

# ---------- 7. 外网自检 ----------
say "外网自检"
check() {
  local path="$1" want="$2" code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}${path}" || echo 000)"
  if [ "$code" = "$want" ]; then ok "$path → $code"; else warn "$path → $code（期望 $want）"; fi
}
check "/" 200
check "/api/health" 200
check "/server.js" 404
check "/data/yaoprint.db" 404
check "/部署后必读.txt" 404

cat <<EOF

────────────────────────────────────────
完成。剩下的收尾：

  rm -f "$PROJ/部署后必读.txt" "$PROJ/data/admin-credentials.txt"

后台：https://${DOMAIN}/admin
账号密码在打包机的「部署后必读.txt」里，登录后先改密码。

如果后台登录后又跳回登录页：站点没开 SSL 或 Nginx 没传 X-Forwarded-Proto，
上面这段代理配置已经带了，若仍失败就检查宝塔站点是否开了「强制 HTTPS」。
────────────────────────────────────────
EOF
