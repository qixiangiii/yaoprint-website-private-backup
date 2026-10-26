# 起元星启官网 — 上线部署手册

> 适用版本：`main` @ 7c58473 ｜ 整理日期：2026-10-27
> 目标形态：单台 Linux + Nginx 反向代理 + 单进程 Node（SQLite 本地库）
> 本文所有「现状」均为在本机实测所得，不是通用建议。

---

## 0. 先看这里：4 个上线阻塞项

这四项不解决，上线后一定出问题，且前两项用户能直接感知。

| # | 阻塞项 | 实测现状 | 上线后的后果 | 处理方式 |
|---|---|---|---|---|
| 1 | **静态资源长缓存但没有版本号** | 实测 `GET /js/main.min.js` 响应头为 `Cache-Control: public, max-age=31536000, immutable`（`server.js:73`）；而全站 258 处引用（164 处脚本 + 94 处样式）全是 `js/main.min.js`、`css/style.min.css` 这类固定文件名，无一带 `?v=` | 第一次上线后**再发任何版本，老访客都会继续用一年前的 JS/CSS**：新 HTML + 旧脚本，交互失效、样式错乱，且浏览器不会自动纠正，只能让用户手动清缓存 | 二选一：①（推荐）构建时给引用追加 `?v=<git sha>` 短哈希；② 把 `.css/.js` 的 max-age 降到 300s + `must-revalidate` |
| 2 | **`.env` 被 gitignore，但项目没有 dotenv** | `.gitignore` 排除了 `.env`，`package.json` 无 `dotenv` 依赖，全项目只有 4 处 `process.env` 读取 | 没有统一的配置入口：环境变量只能靠 systemd/pm2 注入，运维改一个配置要改 unit 文件；且 `NODE_ENV=production` 时 `SESSION_SECRET` 缺失会**直接抛错退出**（`server.js:19`），首次部署极易启动失败 | 加 `dotenv`（仅生产读 `.env`）+ 提供 `.env.example`；或明确只用 systemd `EnvironmentFile`，并在文档写死 |
| 3 | **会话存在内存里（MemoryStore）** | `server.js:44` 未配置 `store`，express-session 默认 MemoryStore | ① 每次重启/发版**全站用户被登出**（含后台）；② 若为了性能开 pm2 cluster 或多副本，后台登录会随机失效（请求落到别的进程没有会话）；③ 内存随会话增长泄漏 | 短期：单进程 + 接受重启登出；长期：接 Redis（`connect-redis`）或 SQLite 会话表 |
| 4 | **`site_url` 为空** | `settings.site_url = ''`，`routes/seo.js:25` 回落到 `req.protocol + req.get('host')` | sitemap.xml / robots.txt 的协议会写成 `http`（`trust proxy` 为 1 时依赖 `X-Forwarded-Proto`，代理没传就判断不出 https）；若代理没转发 `Host`，还会写成内网地址。搜索引擎会收录错误入口，OG 分享卡片同理 | 上线后第一件事：后台「站点设置 → SEO」填 `https://正式域名`（不带尾斜杠），并确认 Nginx 传了 `Host` 与 `X-Forwarded-Proto` |

**另外一项容易漏的**：`public/uploads/`（现 8.4MB）**不在 git 里**。如果只 `git clone` 到生产，后台刚上传的图片全部 404。首次部署必须单独 rsync 过去，之后每次发版也不要覆盖它。

### 阻塞项 1 的具体修法（二选一）

**方案 A（推荐，脚本已实现并验证）**：`tools/stamp-assets.js` 给 HTML 里的 js/css 引用追加 `?v=<版本号>`。

```bash
node tools/stamp-assets.js --dry                    # 先看会改多少：实测 94 个文件、258 处引用
node tools/stamp-assets.js --dir dist/public --v 3fa9c21   # 在打包产物上执行（推荐）
node tools/stamp-assets.js                          # 就地改写 public/（慎用，会弄脏 git 工作区）
```

要点：

- **版本号优先级**：`--v` > `GIT_SHA` 环境变量 > `git rev-parse` > 时间戳。最后一级是为了兼容 `git archive` 导出的制品目录——那种目录没有 `.git`，脚本若硬依赖 `git` 会直接抛错（已实测）。
- **建议在制品上打，不要在仓库工作区打**：就地改写会让 94 个 HTML 变成 modified，下次提交把版本号一起提交进去，之后再发版又要改一遍，git 历史上全是无效 diff。正确顺序是：`git archive` → 解包到 `dist/` → 在 `dist/public` 上打版本号 → 打包上传。
- **幂等**：重复执行不会叠加成 `?v=a?v=b`；换版本号会替换旧值（已实测）。
- **不误伤**：外部链接（`https://`、`//`）、图片、以及 `?v=` 已在的引用都按预期处理（已实测 6 个边界用例）。
- 对应地，`staticOpts` 里 `.js/.css` 保留 `immutable` 即可——文件名虽未变，但 URL 每次都变，缓存天然失效。实测 `/js/main.min.js?v=ABC123` 返回 200 且仍带 `immutable`，说明加了 query 不影响静态服务。

**方案 B（不改构建）**：把 `server.js:73` 的 `max-age=31536000, immutable` 改为 `max-age=300, must-revalidate`。代价是每次访问都带条件请求（有 ETag，多数是 304，开销很小），换来"发版即生效"。

> 两种方案都不要只改一半：**只加版本号但保留 1 年缓存是对的；只改缓存头但页面仍引用固定文件名也是对的**；最怕的是维持现状。

---

## 1. 环境配置

### 要点

| 项 | 要求 | 注意 |
|---|---|---|
| **系统时区** | `Asia/Shanghai` | 这是硬要求。全站时间戳用 `datetime('now','localtime')`，订单号 `orderNumber()` 用**本地年月日**拼接。服务器若是 UTC，订单号日期会比实际早一天，所有后台时间列也错位 |
| Node | **v24.x**（本机实测 v24.16.0） | `better-sqlite3` 是原生模块，ABI 与 Node 大版本绑定，换大版本必须重新编译 |
| 进程用户 | 独立非 root 用户（如 `yaoprint`） | 监听 3000 端口不需要特权，不要用 root 跑 |
| 目录权限 | `data/`、`public/uploads/` 属主为该用户，`750`/`700` | 数据库与上传目录都要写；`data/` 内含管理员口令文件，权限必须是 `600` |
| 端口 | Node 只监听 `127.0.0.1:3000` | 用 Nginx 反代；不要让 3000 直接对公网 |
| HTTPS | 必须有有效证书 | `IS_PROD` 时 Cookie 带 `secure`，**纯 HTTP 下登录会静默失败**（浏览器不保存 Cookie，表现为"登录后又变未登录"） |
| 反向代理 | 一层（Nginx） | `trust proxy` 已固定为 `1`。若前面再加 CDN，要改成对应层数，否则限流按 CDN 节点 IP 统计、`req.protocol` 判断失真 |

### `engines` 与 `.nvmrc`（当前缺失，建议补）

```json
// package.json
"engines": { "node": ">=24 <25" }
```

```text
# .nvmrc
24
```

### systemd 单元（推荐，比 pm2 更适合单进程 + SQLite）

```ini
# /etc/systemd/system/yaoprint.service
[Unit]
Description=Yaoprint Website (Qiyuan Xingqi)
After=network.target

[Service]
Type=simple
User=yaoprint
WorkingDirectory=/srv/yaoprint
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=TZ=Asia/Shanghai
EnvironmentFile=/srv/yaoprint/.env       # 只放 SESSION_SECRET 等敏感项，chmod 600
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

# 基础加固
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/srv/yaoprint/data /srv/yaoprint/public/uploads

[Install]
WantedBy=multi-user.target
```

> 若坚持用 pm2：**必须 `fork` 单实例**，不要 `-i max`。cluster 模式下 SQLite 多进程写同一文件会出现 `SQLITE_BUSY`，且 MemoryStore 会话不共享。

### Nginx 关键配置

```nginx
# 80 端口只做跳转，避免 HTTP 下 Cookie 带 secure 导致登录状态丢失
server {
    listen 80;
    server_name www.example.com example.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;                      # nginx ≥ 1.25 的写法；≤1.24 请改为 listen 443 ssl http2;
    server_name www.example.com example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # 后台图片上传上限 5MB（lib/upload.js），留一点 multipart 余量
    client_max_body_size 6m;

    # 文本资源走 Node 的 compression 中间件，这里不再重复压缩
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

> `X-Forwarded-Proto` 必须传，否则 `secure` Cookie 与 sitemap 的协议判断都会错。

---

## 2. 依赖与版本确认

| 项 | 做法 | 为什么 |
|---|---|---|
| 安装方式 | **`npm ci --omit=dev`**，不要 `npm install` | 仓库有 `package-lock.json`，`ci` 严格按锁文件装，保证与测试环境一致；`install` 可能升级次版本 |
| 原生模块 | `better-sqlite3@12.11.1` 需编译。目标机装 `python3 make g++`，或预编译包可用时直接装 | 换机器/换 Node 版本最常见的启动失败原因就是 `NODE_MODULE_VERSION` 不匹配。报错时执行 `npm rebuild better-sqlite3` |
| 纯 JS 依赖 | `bcryptjs` 无需编译 | 这正是选 `bcryptjs` 而非 `bcrypt` 的价值，部署省事 |
| devDependencies | 生产不装（`terser` 只在构建机用） | 构建产物 `*.min.js` 随包发布，生产不需要构建能力 |
| 版本留痕 | 部署时记录 `node -v`、`npm -v`、`git rev-parse HEAD`、`npm ls --depth=0` | 出问题时第一手信息 |
| 依赖审计 | `npm audit --omit=dev`，高危必须处理 | 最近一轮安全审计的经验：老版本 `multer 1.4.x` 属于已知问题区间，需确认在维护分支内 |

### 版本基线（本次实测）

```text
Node            v24.16.0
better-sqlite3  12.11.1   (原生模块，需对应 ABI)
express         4.21.x
multer          1.4.5-lts.1
helmet          8.3.x
express-rate-limit 8.7.x
```

---

## 3. 配置项与密钥管理

### 全部环境变量（当前项目只有 4 个）

| 变量 | 必需 | 说明 | 注意 |
|---|---|---|---|
| `NODE_ENV` | 是 | 必须 `production` | 控制 `secure` Cookie、`trust proxy`、错误信息是否脱敏、启动时 `SESSION_SECRET` 强校验。**漏设会让全站以开发模式运行** |
| `PORT` | 否（默认 3000） | 监听端口 | 与 Nginx `proxy_pass` 保持一致 |
| `SESSION_SECRET` | 是（生产） | 会话签名密钥 | 缺失直接抛错退出；**更换 = 所有人被登出**。生成：`openssl rand -hex 32` |
| `WECOM_WEBHOOK_URL` | 否 | 企微群机器人通知 | 优先级高于数据库里的同名设置（`lib/notify.js:6`）。建议迁到 env，并把后台那项清空 |
| `ADMIN_INIT_PASSWORD` | 否 | 仅 `seed.js` 首次建号用 | 不配则随机生成并打印；上线后必须改密 |

### 密钥管理 6 条

1. **不落 git**：`.env` 已在 `.gitignore`，`.env.example` 只放**键名和占位值**，禁止出现真实密钥。
2. **不进镜像/制品**：打包时显式排除 `.env`、`data/`。
3. **文件权限 `600`**，属主为运行用户；`data/admin-credentials.txt` 也是一次性交付物，上线后应删除（改密后即失效）。
4. **企微 Webhook 属于密钥**：当前值存在数据库 `settings.wecom_webhook_url`，一旦备份/导出数据库，密钥就随之流出。建议：env 注入 → 后台该项清空 → 备份加密。
5. **轮换流程**：改 `SESSION_SECRET` = 全员登出，安排在低峰；改 Webhook = 后台即时生效（有缓存失效机制），无需重启。
6. **多环境不共用**：预发环境必须用**独立**的数据库与 Webhook，否则测试提交会打进真实客户群。

### 建议同时确认的"软配置"（在数据库里，不在 env）

| 键 | 现状 | 上线前应设为 |
|---|---|---|
| `site_url` | `''` | `https://正式域名` |
| `site_name` | `起元星启` | 保持 |
| `course_catalog_visibility` | `public` | 按运营决定（`public` 才在前台展示课程目录） |
| `wecom_webhook_url` | 已配置（含密钥） | 迁移到 env 后清空 |

---

## 4. 数据库变更与数据迁移

### 本项目迁移机制（必须先理解，它跟常见框架不同）

- **没有迁移版本号、没有 up/down 脚本**。`db.js` 在**进程启动时**执行：`CREATE TABLE IF NOT EXISTS ...` + `ensureColumn()`（`PRAGMA table_info` 判断，缺列则 `ALTER TABLE ADD COLUMN`）。
- 因此：**启动即可能改库结构，且前向不可逆**。新版本第一次启动前不备份 = 没有退路。
- 迁移是幂等的，重复启动安全。
- 隐含要求：`data/` 必须对运行用户可写，否则启动时 `ALTER`/建表失败，进程起不来。
- `db.js` 打开连接即执行 `journal_mode = WAL` + `foreign_keys = ON`。**WAL 模式下 `data/yaoprint.db-wal` 可能存着尚未落盘的事务**（当前就有 4MB）。

### 数据迁移要点

| 场景 | 正确做法 | 错误做法 |
|---|---|---|
| 把开发数据带到生产 | `PRAGMA wal_checkpoint(TRUNCATE)` 后 `.backup`，或直接用 `VACUUM INTO` | **`cp data/yaoprint.db`** —— WAL 里未 checkpoint 的事务会丢，且会带上旧 `-shm/-wal` 导致校验异常 |
| 备份线上库 | 见第 7 节 | `cp` 正在写入的 `.db` |
| 种子数据 | `npm run seed`（**会重置内容表**，仅首次初始化用） | 在已有生产数据的库上跑 `seed` |

安全的导出命令（用项目自带依赖，不依赖 `sqlite3` CLI）：

```bash
cd /srv/yaoprint
node -e "
const db = require('./db');
db.pragma('wal_checkpoint(TRUNCATE)');
db.backup('./data/export-$(date +%Y%m%d).db')
  .then(() => { console.log('done'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

### 上线前必须确认的数据库事项

- [ ] 生产库是**空库首建**，还是从开发库迁移？（决定是否要跑 `seed.js`）
- [ ] 迁移时是否带上 `public/uploads/`（图片与数据库记录强关联，缺图即内容缺失）
- [ ] 管理员口令**不复用开发机口令**（当前开发机为 `84hGTBKhCS8wMM0l`，上线后必须改）
- [ ] `PRAGMA integrity_check` 返回 `ok`
- [ ] 记录 schema 基线，便于回滚后比对：
      `node -e "const db=require('./db');require('fs').writeFileSync('schema-$(date +%F).sql', db.prepare(\"SELECT sql FROM sqlite_master WHERE sql IS NOT NULL\").all().map(r=>r.sql).join(';\n'))"`
- [ ] `page_views` 当前已清空（上一轮测试数据已删），确认生产从零开始统计

---

## 5. 构建与打包

### 构建步骤（在构建机/CI 上，不在生产机）

```bash
npm ci                     # 含 devDependencies，因为要 terser
npm run check:syntax       # 全量语法检查（22 个文件）
npm run build:js           # terser 生成 public/js/*.min.js
npm run check              # 站点链接/页面自检

# 导出制品 → 在制品上打资源版本号（不要在仓库工作区打，见第 0 节）
git archive --format=tar.gz -o /tmp/yaoprint-$(git rev-parse --short HEAD).tar.gz HEAD
mkdir -p /tmp/yaoprint-dist && tar -xzf /tmp/yaoprint-*.tar.gz -C /tmp/yaoprint-dist
node tools/stamp-assets.js --dir /tmp/yaoprint-dist/public --v $(git rev-parse --short HEAD)
```

> `*.min.js` 是**构建产物**（上一轮重构才改成这样）。生产不执行 `build:js`，但**发版前必须重新构建**，否则源码改了而 `.min.js` 是旧的——正是之前踩过的坑。

### 打包内容

```text
必须包含：
  server.js  db.js  package.json  package-lock.json
  lib/  routes/  tools/
  public/            (73MB，其中 img/ 62MB)
  public/uploads/    (8.4MB，首次迁移单独带，之后不得覆盖)

必须排除：
  node_modules/  data/  .env  .git/
  *.pptx  *.docx  教学资料/  ppt_build/  ppt_delivery_40/
  ppt_demo_retract/  ppt_lecture/  output/  .playwright-cli/
```

制品命名带提交号，便于回滚定位：

```bash
git archive --format=tar.gz -o /tmp/yaoprint-$(git rev-parse --short HEAD).tar.gz HEAD
```

### 传输与体积

- `public/` 73MB，首传建议 `rsync -az --delete-after` 增量同步（排除 `uploads/`）。
- 图片占 92%（`img/detail` 21MB、`img/competition` 7MB）。若首屏偏慢，再考虑 WebP 转换或 CDN，**不要在上线窗口做图片处理**。
- `compression` 中间件已对文本资源生效；图片/字体不压缩，靠 Nginx 静态缓存即可。

---

## 6. 日志与监控告警

### 现状（这是当前最大的运维空白）

- 只有 `console.log` / `console.error`，**没有访问日志、没有落盘、没有轮转**。
- 无 `/api/health` 之类的健康检查端点（已确认不存在），无法做存活探针。
- 错误中间件只记 `method / url / error.message`（这是对的，不泄敏感信息），但**没有请求 ID，跨行日志关联困难**。

### 必须补的 3 件事

**① 健康检查端点**（供探活与发布验证，需新增）

```js
// routes/public.js 内，任何鉴权之前
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, uptime: Math.round(process.uptime()), version: process.env.GIT_SHA || 'dev' });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'database unavailable' });
  }
});
```

**② 访问日志**：交给 Nginx（`access_log /var/log/nginx/yaoprint.access.log`），Node 侧不重复记录。排查接口问题再用 journald 里的 `[server error]` 行。

**③ 日志轮转**

```text
# /etc/logrotate.d/yaoprint-nginx
/var/log/nginx/yaoprint.*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        nginx -s reopen
    endscript
}
```

systemd 下 journald 已自带轮转，配 `/etc/systemd/journald.conf` 的 `SystemMaxUse=1G` 即可。

### 监控指标与告警阈值

| 指标 | 采集 | 告警阈值 | 说明 |
|---|---|---|---|
| 可用性 | `GET /api/health` 每分钟 | 连续 3 次失败 | 最直接 |
| 5xx 率 | Nginx 日志统计 | > 1% 持续 5 分钟 | 配合错误出口日志定位 |
| P95 响应时间 | Nginx `$request_time` | > 1s | SQLite 全表扫描会直接体现 |
| 进程存活 / 重启次数 | systemd | 10 分钟内重启 > 2 次 | 崩溃循环 |
| 内存 RSS | `ps`/node_exporter | > 512MB | MemoryStore 会话泄漏会体现在这里 |
| 磁盘 | df | 可用 < 20% | 数据库 + 上传图 + 日志 |
| 证书到期 | `openssl s_client` | < 30 天 | 到期即全站 HTTPS 失败 |
| 登录失败次数 | 应用日志 | 单 IP 10 分钟 > 20 次 | 后台被暴力破解 |
| `page_views` 增长 | 每日 SQL | 单日 > 平日 5 倍 | 爬虫/被刷 |

### 告警通道

复用已接入的企微群机器人（`lib/notify.js`）：新建一个运维群，Webhook 走 `WECOM_WEBHOOK_URL` 环境变量，与业务通知分开，避免业务消息淹没告警。

### 日志脱敏红线

禁止记录：密码、`connect.sid`、Webhook key、完整手机号/邮箱（日志里可保留后 4 位）。当前代码没有打印请求体，**新增日志时不要顺手 `console.log(req.body)`**。

---

## 7. 备份与回滚方案

### 备份策略

| 对象 | 方式 | 频率 | 保留 |
|---|---|---|---|
| `data/yaoprint.db` | `db.backup()`（SQLite 在线备份 API，WAL 安全） | 每日 03:00 | 14 日 + 每月 1 份 |
| `public/uploads/` | `rsync -a --delete` 增量 | 每日 | 同库，与库时间点对齐 |
| 配置（`.env`、`nginx.conf`、unit 文件） | 加密后入备份桶 | 变更时 | 永久 |
| 代码 | git（远程已有） + 发布制品 | 每次发版 | 最近 5 个版本 |

```bash
#!/usr/bin/env bash
# /srv/yaoprint/tools/backup.sh
# 仓库里没有这个文件，需要手工创建（chmod 750）。cron：0 3 * * * /srv/yaoprint/tools/backup.sh
# 可选参数：标签，用于发版前保留备份，例如 ./tools/backup.sh pre-release-7c58473
set -euo pipefail
LABEL="${1:-}"
STAMP=$(date +%Y%m%d-%H%M)
DEST=/var/backups/yaoprint
# 必须与 systemd 单元里启动服务用的是同一个 node。
# 实测踩过：脚本里的 node 解析到系统自带的 v22，而 better-sqlite3 是按 v24 编译的，
# 直接报 NODE_MODULE_VERSION 137 vs 127 失败。用绝对路径，别依赖 cron 的 PATH。
NODE_BIN="${NODE_BIN:-/usr/bin/node}"
mkdir -p "$DEST"

cd /srv/yaoprint

# 0) 自检：Node 能加载原生模块，否则后面的备份必然失败
"$NODE_BIN" -e "require('better-sqlite3'); console.log('node ok:', process.version);"

# 1) 先把 WAL 落盘，再做在线备份（cp 会丢未 checkpoint 的事务）
"$NODE_BIN" -e "
const db = require('./db');
console.log('checkpoint:', JSON.stringify(db.pragma('wal_checkpoint(TRUNCATE)')));
db.backup('$DEST/yaoprint-$STAMP.db')
  .then(() => process.exit(0))
  .catch(error => { console.error('backup failed:', error.message); process.exit(1); });
"

gzip -f "$DEST/yaoprint-$STAMP.db"
chmod 600 "$DEST/yaoprint-$STAMP.db.gz"

# 2) 上传图与数据库同一时间点
rsync -a --delete /srv/yaoprint/public/uploads/ "$DEST/uploads/"

# 3) 校验：解压能通过、库能打开、完整性 ok
gzip -t "$DEST/yaoprint-$STAMP.db.gz"
gzip -dc "$DEST/yaoprint-$STAMP.db.gz" > "/tmp/verify-$STAMP.db"
"$NODE_BIN" -e "
const D = require('better-sqlite3');
const d = new D('/tmp/verify-$STAMP.db', { readonly: true });
console.log('integrity:', d.pragma('integrity_check', { simple: true }));
console.log('customers:', d.prepare('SELECT COUNT(*) c FROM customers').get().c,
            'orders:', d.prepare('SELECT COUNT(*) c FROM orders').get().c,
            'settings:', d.prepare('SELECT COUNT(*) c FROM settings').get().c);
"
rm -f "/tmp/verify-$STAMP.db"

# 4) 需要长期保留的备份：改用精确文件名复制，不要用通配符
if [ -n "$LABEL" ]; then
  cp -p "$DEST/yaoprint-$STAMP.db.gz" "$DEST/$LABEL.db.gz"
  echo "已保留 $LABEL.db.gz"
fi

# 5) 清理：日备保留 14 天，发版前备份保留 60 天
find "$DEST" -maxdepth 1 -name 'yaoprint-*.db.gz' -mtime +14 -delete
find "$DEST" -maxdepth 1 -name 'pre-release-*.db.gz' -mtime +60 -delete
```

注意事项：

- **绝不用 `cp` 备份正在使用的 `.db`**（WAL 未落盘 → 备份不可用或丢数据）。上面实测：备份产物 557KB、`integrity_check = ok`、表行数与线上一致，且执行后 `data/yaoprint.db-wal` 由 4MB 归零。
- **长期保留不要用 `cp 通配符`**：目标目录里有两个以上 `yaoprint-*.db.gz` 时，`cp a* dest.db.gz` 会直接报 `not a directory` 并失败（已实测）；而且 `find -name 'yaoprint-*.db.gz'` 永远匹配不到 `pre-release-*.db.gz`，那些文件会无限累积。上面的脚本用「标签参数 + 精确文件名」规避了这两个坑。
- 备份里含客户信息与企微密钥：**必须加密**（`gpg -c` 或对象存储服务端加密），权限 `600`。
- 每周随机抽一份做恢复演练（能打开 + 行数合理），否则"备份成功"只是假象。
- 至少一份**异地**（COS/S3/另一台机），本机磁盘故障时同盘备份等于没有。

### 回滚方案

| 维度 | 能否回滚 | 做法 | 风险 |
|---|---|---|---|
| **代码** | 能，1–2 分钟 | 切回上一个制品：`git checkout <上一个 sha>` 或解压旧包 → `systemctl restart yaoprint` | 低 |
| **静态资源** | 能 | 随代码包一起回滚 | 低；注意第 0 节第 1 项，回滚同样受缓存影响 |
| **数据库结构** | **基本不能** | 迁移是前向的（`ALTER TABLE ADD COLUMN` 无 down）。回滚代码但库已加列通常无害（旧代码忽略新列）；若涉及改语义/删数据则必须用发版前备份恢复 | **高**：恢复备份会丢失发版后写入的表单/订单数据 |
| **上传文件** | 能 | 从备份 `rsync` 回来 | 丢失发版后新增的图 |

因此两条纪律：

1. **发版前必须备份**：`./tools/backup.sh pre-release-<sha>`（带标签，单独保留 60 天）。
2. **结构变更与功能变更分批上线**。数据库迁移单独一个窗口，出问题可直接回代码而不必回数据。

### 回滚判定标准（任一命中即回滚，不犹豫）

- `/api/health` 持续 503 或首页非 200
- 5xx 率 > 1% 持续 5 分钟
- 后台无法登录（且已排除口令问题）
- 加购/下单/表单提交任一主链路报错
- 首页或核心页白屏 / 大面积样式错乱（很可能是第 0 节第 1 项）

### 上线前演练

在**预发环境**完整走一遍：部署 → 冒烟 → 故意回滚 → 再次部署。确认回滚耗时与数据影响可接受，再动生产。

---

## 8. 上线检查清单

### T-1 天（准备与确认）

- [ ] 域名解析已生效，`dig +short 域名` 指向目标机
- [ ] HTTPS 证书申请完成，`http` 自动跳 `https`
- [ ] 服务器时区为 `Asia/Shanghai`（`timedatectl`）
- [ ] Node 24 安装完成，`node -v` 符合
- [ ] 系统依赖 `python3 make g++` 就绪（编译 `better-sqlite3`）
- [ ] 独立运行用户创建，`/srv/yaoprint` 目录与权限就绪
- [ ] `data/` 与 `public/uploads/` 可写、属主正确
- [ ] `.env` 已生成（`SESSION_SECRET` 为随机 32 字节，权限 600）
- [ ] **阻塞项 1（静态资源版本号）已处理**
- [ ] **阻塞项 3（会话存储）已决策**：单进程接受重启登出，或已接 Redis
- [ ] `/api/health` 已加（可选但强烈建议）
- [ ] 构建机已产出制品，`npm run check` / `check:syntax` 通过
- [ ] 备份脚本已部署并**手动执行成功一次**，恢复演练通过
- [ ] Nginx 配置 `nginx -t` 通过
- [ ] 预发环境完成一次「部署 → 回滚」演练

### T-0（发版窗口）

```bash
# 1) 记录当前状态（回滚依据）
cd /srv/yaoprint && git rev-parse HEAD | tee /tmp/prev-sha.txt
systemctl is-active yaoprint

# 2) 备份（带标签，脚本内部用精确文件名，避免通配符踩坑）
./tools/backup.sh "pre-release-$(git rev-parse --short HEAD)"

# 3) 停服（避免迁移与新代码竞争）
systemctl stop yaoprint

# 4) 部署代码（排除 data/ uploads/ .env .git/，其余以 dist 为准）
rsync -az --delete-after \
  --exclude 'data/' --exclude 'public/uploads/' \
  --exclude '.env' --exclude '.git/' \
  ./dist/ /srv/yaoprint/

# 5) 依赖
cd /srv/yaoprint && npm ci --omit=dev

# 6) 启动（首次启动会执行建表/迁移）
systemctl start yaoprint
journalctl -u yaoprint -n 50 --no-pager

# 7) 冒烟（见第 9 节）
```

> `--exclude '.git/'` 不能省。实测：若线上目录是 git 克隆，`--delete-after` 会把 `.git` 当"源里没有的多余文件"整个删掉，之后的 `git pull` 式部署直接失效。同理 `data/`、`public/uploads/`、`.env` 必须显式排除才会被保护——rsync 只保护被 exclude 的文件。

- [ ] 服务成功启动，日志无异常、无弱口令告警
- [ ] 后台「修改密码」立即改掉初始口令，删除 `data/admin-credentials.txt`
- [ ] 后台填 `site_url` 为正式域名
- [ ] 企微 Webhook 确认可用（真发一条测试）

---

## 9. 发布后验证步骤

按顺序执行，**全绿才算发布完成**。

### 9.1 自动化冒烟（5 分钟）

```bash
BASE=${BASE:-https://正式域名}
BASE=${BASE%/}          # 去掉尾斜杠，避免拼出 //products.html
PROBES="/ /index.html /products.html /courses/index.html /explore.html \
  /api/settings /api/products /api/reviews /sitemap.xml /robots.txt /api/health"
for p in $PROBES; do
  printf "%-24s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done
```

| 检查 | 期望 |
|---|---|
| 所有页面与接口 | `200`（`/api/health` 返回 `{"ok":true}`） |
| `/admin` | `301 → /admin/` 后 `200`（已实测本机行为） |
| 不存在的路径 | `404` 且为中文品牌页；`/api/nope` 为 JSON |
| `sitemap.xml` | 域名是**正式域名**，不是 `127.0.0.1` |
| 响应头 | `content-encoding: gzip`（已实测 HTML/CSS 均压缩）；`x-powered-by` 不存在；`strict-transport-security` 存在 |

> **`/api/health` 目前是 404**——项目里还没有这个端点，需要先按第 6 节加上，否则这条冒烟会红，属于预期而非故障。加之前请把这一项从 `PROBES` 里去掉，避免误判。

### 9.2 关键业务链路（人工，10 分钟）

- [ ] **后台登录** → 打开「课程中心」→ 点保存 → 刷新后 `gallery_json` / `seo_title` **未被清空**（上一轮修复的静默数据丢失，必须回归）
- [ ] 后台**上传一张图片** → 前台能正常显示（验证 `uploads/` 权限与 Nginx 静态路径）
- [ ] **试听预约**表单真实提交 → 页面提示成功 → 企微群收到通知 → 后台「试听预约」能看到记录
- [ ] **联系表单 / 订阅 / 工单**各提交一次 → 均成功
- [ ] 非法电话（如 `abc`）→ 提示「请填写有效的联系电话」，而不是笼统的失败
- [ ] 注册 → 登录 → **加购 → 下单** → 后台「订单」可见，订单号日期与当天一致
- [ ] 未登录访问 `/account/index.html` → 跳登录页，`?next=` 为站内路径
- [ ] 移动端 390px 宽：首页、课程、产品页无横向滚动
- [ ] 浏览器控制台：0 报错、0 破图

### 9.3 缓存与静态资源（对应阻塞项 1）

```bash
curl -sI https://正式域名/js/main.min.js | grep -i cache-control
curl -sI https://正式域名/index.html    | grep -i cache-control
```

- [ ] HTML 为 `no-cache`（改版即时生效）
- [ ] JS/CSS：若保留了 `immutable + 1 year`，确认引用已带版本号；否则改为短 `max-age`
- [ ] **发版后用一个"曾经访问过"的浏览器窗口验证**：新功能可用（这是唯一能真正暴露缓存问题的测法）

### 9.4 观察期（发布后 30 分钟 / 24 小时）

| 时间 | 检查 |
|---|---|
| +5 min | `journalctl` 无 5xx；`/api/health` 连续正常 |
| +30 min | Nginx 5xx 率 < 0.1%；P95 < 500ms；无重启 |
| +2 h | 内存 RSS 平稳；`data/yaoprint.db-wal` 未异常膨胀 |
| +24 h | `page_views` 有真实数据；表单/订单有正常量；备份任务首次成功；证书有效期正确 |

---

## 10. 附：上线后待办（非阻塞，但应有排期）

| 项 | 现状 | 建议 |
|---|---|---|
| CSP | `helmet({ contentSecurityPolicy: false })` 关闭 | 内联脚本较多，先收集违规报告（`report-only` 模式），再逐步收紧 |
| `page_views` 保留策略 | 每次访问写一行，永久增长 | 保留 180 天或聚合到日表；加定时清理 |
| `PUT /api/admin/settings` 无键白名单 | 任意键都会写入 `settings` 表 | 按后台 `settingGroups` 生成白名单 |
| 后台链接字段无协议校验 | `scenes.link` 等可存 `javascript:`（需管理员权限，风险低） | 先做存量数据规范化（现有 `#`、相对路径），再启用 `safeLink` |
| `/teachers.html` | 空态页面 | 补内容或 `noindex` |
| 多实例扩展 | SQLite + 本地文件上传 | 真要横向扩展需换托管库 + 对象存储，当前单机足够 |
