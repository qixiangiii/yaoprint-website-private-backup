# 宝塔部署说明

这套站点是 Node.js + Express + SQLite 的单进程应用，前端是纯静态文件。按下面的顺序做，大约 15 分钟可以跑起来。

---

## 极速通道（5 分钟，已装 Node 的机器）

如果宝塔已经装好 Node（**v18 及以上**，v20/v22 更好），忽略下面的分步说明，直接：

```bash
cd /www/wwwroot/你的站点目录        # server.js 所在这一层
bash tools/server-setup.sh 3d.novagnss.com
```

`server-setup.sh` 一条命令做完全部：检查 Node 版本 → 装生产依赖（国内源，失败自动补编译工具）
→ 生成 `.env`（随机 SESSION_SECRET、SITE_URL、PORT）→ 设权限 → pm2 拉起 → 自检 `/api/health`
→ **自动给站点写反向代理并重载 Nginx** → 从外网自检 `/`、`/api/health`、源码与数据库是否已封堵。

改 Nginx 前会备份到 `站点配置.yqbak.<时间戳>`，`nginx -t` 不通过自动回滚，重复执行会跳过已完成的步骤。

只剩两件事需要手点：**站点开 SSL**（生产模式后台登录必须 HTTPS）、登后台后**改密码**。
包里的 `tools/install.sh` 是精简版（只装依赖、起服务，不动 Nginx），宝塔「Node 项目」方式可以用它。

---

## 0. 服务器要求

| 项目 | 要求 |
|---|---|
| 系统 | CentOS 7+ / Ubuntu 20.04+ / Debian 11+（宝塔 8.0 以上） |
| Node.js | **18 及以上**（推荐 20/22，18 也能跑；16 及以下不行） |
| 内存 | 1 GB 起（512 MB 小机器也能跑，但要加 swap） |
| 磁盘 | 500 MB 起 |
| 时区 | **Asia/Shanghai**，见第 7 步，否则 sitemap 日期与订单号会差 8 小时 |

宝塔面板先装两个东西：

- 软件商店 → **Node.js 版本管理器** → 安装 v20 或 v22（已装 v18 也能直接用，无需升级）
- 软件商店 → **PM2 管理器**（用宝塔「Node 项目」功能的话可跳过）


### 关于 Node 18

项目原本锁定 `better-sqlite3@12`（要求 Node 20+），现在已降到 `11.10.0`，Node 18 可以直接跑：
`npm install` 会直接下载 Node 18 对应的预编译二进制，不需要编译工具。实测 Node 18.20.8 下首页、
`/api/*`、`/admin`、`sitemap.xml` 全部正常。

什么时候必须停在 18：CentOS 7 的 glibc 是 2.17，Node 20 起要求 2.28，装不上去——这类机器用 v18 就行。
能被升到 20/22（Ubuntu 20.04+、Debian 11+、CentOS 8+、Alma/Rocky）的，建议升：Node 18 已于
2025 年 4 月停止安全维护，之后再无安全补丁。

脚本的选择规则：把所有能找到的 node（PATH 里的、宝塔 `/www/server/nodejs/v*/bin/node`）都比一遍，
取版本最高的那个来装依赖和跑服务，不会因为 PATH 里躺着旧版本而误用。

---

## 1. 上传并解压

把 `yaoprint-site-xxxxxxxx.zip` 上传到 `/www/wwwroot/`，然后在线解压。

解压后确认目录结构是这样的（`server.js` 必须在最外层）：

```
/www/wwwroot/yaoprint/
├── server.js
├── db.js
├── package.json
├── .env.example
├── ecosystem.config.js
├── lib/  routes/  public/  tools/
├── data/yaoprint.db        ← 已包含全部现网内容
├── public/uploads/         ← 已有产品图
└── 部署后必读.txt           ← 看完请删除
```

如果解压出来多套了一层目录（比如 `yaoprint/yaoprint/server.js`），把里面那层的内容全选剪切到上一层。

---

## 2. 装依赖

宝塔终端里执行：

```bash
cd /www/wwwroot/yaoprint
# 国内服务器先换源，否则 better-sqlite3 的二进制包下载很慢
npm config set registry https://registry.npmmirror.com
npm install --omit=dev
```

只装生产依赖，不需要 terser 之类的构建工具。

> 如果 `better-sqlite3` 编译报错，说明预编译包没下到，装一下编译工具再重试：
> `yum install -y gcc-c++ make python3`（Ubuntu 用 `apt install -y build-essential python3`）

---

## 3. 写配置文件

```bash
cd /www/wwwroot/yaoprint
cp .env.example .env

# 生成一个随机密钥，把输出粘贴到 .env 的 SESSION_SECRET= 后面
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`.env` 改完大概是这样：

```ini
NODE_ENV=production
PORT=3000
SESSION_SECRET=刚才生成的那串随机字符
SITE_URL=https://你的域名
```

三个要注意的点：

1. **`SESSION_SECRET` 不能空着**，空着启动会直接报错退出，这是故意的。
2. `PORT` 如果和服务器上别的项目撞了，改成 3001 之类，Nginx 那边同步改。
3. **`NODE_ENV=production` 打开后，后台登录只走 HTTPS**。所以第 6 步的 SSL 一定要先配好，否则你能打开网站但登不进后台。

---

## 4. 启动服务

### 方式 A：宝塔「Node 项目」（推荐，能看日志、能重启）

网站 → Node 项目 → 添加 Node 项目：

| 字段 | 填什么 |
|---|---|
| 项目名称 | `yaoprint` |
| 项目目录 | `/www/wwwroot/yaoprint` |
| 启动文件 | `server.js` |
| Node 版本 | v18 及以上（推荐 v22；已装 v18 直接选 v18） |
| 项目端口 | `3000`（与 .env 的 PORT 一致） |
| 运行用户 | `www` |
| 启动方式 | `pm2` |

创建后会自动生成反向代理。**但要检查一下反代配置里有没有 `X-Forwarded-Proto $scheme;`**，没有就手动加上，见 `deploy/nginx.conf.sample`。

### 方式 B：命令行 PM2

```bash
cd /www/wwwroot/yaoprint
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # 按提示执行它输出的那一行，保证重启后自动拉起
```

两种方式选一个，不要同时用，否则会抢同一个端口。

---

## 5. 目录权限

SQLite 需要在 `data/` 里写 `-wal` 和 `-shm` 文件，后台上传图要写 `public/uploads/`，这两处必须可写：

```bash
cd /www/wwwroot/yaoprint
chown -R www:www .
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod 755 data public/uploads
```

---

## 6. 域名、SSL 与反代

1. 宝塔 → 网站 → 添加站点，域名填你的（比如 `www.example.com`），PHP 版本选「纯静态」。
2. 站点设置 → **SSL** → Let's Encrypt 申请证书 → 打开「强制 HTTPS」。
3. 站点设置 → **反向代理** → 目标 `http://127.0.0.1:3000`，把 `client_max_body_size` 改成 `20m`，并补上 `X-Forwarded-Proto`。

反向代理完整内容见 `deploy/nginx.conf.sample`。

---

## 7. 服务器时区

```bash
timedatectl set-timezone Asia/Shanghai
date        # 确认输出是 CST 北京时间
```

代码里 sitemap 的 `lastmod` 和订单号都按本地日期算，时区是 UTC 的话，每天早上 8 点前生成的内容日期会显示成前一天。

---

## 8. 验证清单

浏览器和终端各过一遍，全部通过就算部署完成：

```bash
curl -s http://127.0.0.1:3000/api/health
# 期望：{"ok":true,"service":"qiyuan-xingqi","uptime":...}
```

| 检查项 | 地址 | 期望 |
|---|---|---|
| 首页 | `https://你的域名/` | 正常显示，配色是天空蓝 |
| 学习中心 | `/learning.html#online-class` | 6 张 Tinkercad 课程卡，封面正常 |
| 课程中心 | `/courses/index.html` | 课程列表有内容 |
| 后台 | `/admin` | 能打开登录页（会自动跳到 `/admin/`） |
| 搜索收录 | `/sitemap.xml` | 返回 XML，`loc` 里是真实域名 |
| 爬虫规则 | `/robots.txt` | 返回文本 |
| 图片 | 首页产品图 | 不出现裂图 |

---

## 9. 上线后必须做的三件事

**① 改后台密码。** 初始账号密码在包内 `部署后必读.txt` 里，登录 `/admin` 后立刻到「修改密码」改成自己的。

**② 删除凭据文件。**

```bash
rm -f /www/wwwroot/yaoprint/部署后必读.txt /www/wwwroot/yaoprint/data/admin-credentials.txt
```

**③ 到后台「站点设置」补齐这几项**（现在还是空的或偏内部口吻，直接影响对外形象）：

- **ICP 备案号** —— 现在是空的，页脚不显示，国内服务器不挂备案号会被查
- **站点地址 `site_url`** —— 影响 sitemap 与微信分享链接
- **对外电话 / 邮箱 / 详细地址** —— 当前电话是手机号，邮箱是 gmail，建议换成企业邮箱
- **客服时间、响应时效、质保期** —— 如果 support 页的「7×12 / 48 小时 / 12 个月」兑现不了，改成实际值

---

## 10. 日常运维

**备份数据库**（建议加到宝塔计划任务，每天一次）：

```bash
cd /www/wwwroot/yaoprint
sqlite3 data/yaoprint.db ".backup '/www/backup/yaoprint-$(date +%F).db'"
```

没有 sqlite3 命令就用文件复制，先停服务再拷 `data/yaoprint.db` 和 `data/yaoprint.db-wal`。

**更新代码**：把新的 zip 解压覆盖，保留 `data/` 和 `public/uploads/` 不要覆盖，然后 `pm2 restart yaoprint`。

**看日志**：

```bash
pm2 logs yaoprint --lines 100
# 或
tail -f /www/wwwroot/yaoprint/logs/error.log
```

---

## 11. 常见问题

**后台输入密码后没反应，或登录后又跳回登录页**
生产模式下会话 Cookie 只在 HTTPS 下发送。检查：域名是否已开 SSL、Nginx 是否传了 `X-Forwarded-Proto`。临时排查可把 `.env` 的 `NODE_ENV` 改成 `development`，能登录就说明是这两处的问题。

**后台上传图片报「请求内容过大」**
Nginx 的 `client_max_body_size` 还停留在默认 1m，改成 `20m` 后重载配置。

**启动失败，报 `Could not locate the bindings file`**
better-sqlite3 没装好，重新执行 `npm rebuild better-sqlite3`；仍失败就按第 2 步装编译工具后再 `npm install`。

**启动失败，报「生产环境必须配置 SESSION_SECRET」**
`.env` 里的 `SESSION_SECRET` 是空的，按第 3 步生成一个填进去。

**端口被占用 `EADDRINUSE`**
`lsof -i:3000` 看是谁占的，换个端口同时改 `.env` 与 Nginx 反代。

**页面能开但没有内容 / 数据是旧的**
`data/yaoprint.db` 没跟着上传。**千万不要用 `npm run seed` 来恢复**——那个脚本会清空产品、新闻、课程、设置等所有内容表，只在全新空库时用于演示数据。

**打开域名是 403 Forbidden（nginx 报的）**
站点的「运行目录」指向了项目根目录，而根目录没有 `index.html`（首页在 `public/` 里）。宝塔 → 网站 → 站点设置 → 网站目录 → 运行目录 选 `/public` → 保存，立刻恢复。
**同时必须检查源码是否已暴露**：根目录被当成网站根时，下面这些地址都能直接下载，等于源码和数据库裸奔——

```bash
curl -sI https://你的域名/server.js | head -1          # 期望 404
curl -sI https://你的域名/data/yaoprint.db | head -1    # 期望 404
curl -sI https://你的域名/部署后必读.txt | head -1       # 期望 404
```

只要有一条返回 200，就当密码已泄露：立刻删掉 `部署后必读.txt` 和 `data/admin-credentials.txt`，并到后台改密码。`deploy/nginx.conf.sample` 末尾附了一组 deny 规则，可以在 `location /` 之前抄进去做兜底。

**「/api/xxx 404」或页面能开但列表全是空的**
Node 进程没起来，或者 Nginx 没做反向代理。先 `curl -s http://127.0.0.1:3000/api/health`，本机通就是反代问题，本机也不通就去看 `pm2 logs`。
