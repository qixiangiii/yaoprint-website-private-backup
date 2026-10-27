# QA 验收脚本

存放用于回归验收的轻量脚本。全部依赖 Node 24 内置能力（`fetch` / `WebSocket`），无需 `npm install`。

## 前置条件

- 站点已在本机运行：`node server.js`（监听 127.0.0.1:3000）
- Node 24（`/Users/huang/.local/devtools/bin/node` 或系统 `node`，需支持内置 `fetch` 与 `WebSocket`）
- `pagetest.js` 需要一个开好调试端口的无头 Chrome（见下）

## 脚本说明

### 1. `snapshot.js` — 接口快照（无浏览器依赖）

记录所有 GET 接口的状态码 + 响应体摘要（shape + 稳定 hash），用于**重构前后回归比对**。

```bash
node tools/qa/snapshot.js > /tmp/before.json   # 改动前
node tools/qa/snapshot.js > /tmp/after.json    # 改动后
diff /tmp/before.json /tmp/after.json          # 应零差异（动态接口除外）
```

- 覆盖：前台 37 个只读接口 + 后台 30 个（自动登录）+ 若干写接口边界（limit 负数、空提交、未登录鉴权）。
- 管理员口令从 `ADMIN_PASSWORD` 环境变量读取，默认取仓库内测试口令。
- 注意：`/api/reviews`、`/sitemap.xml` 等依赖 `now` 或外部内容，天然不稳定，比对时需人工排除。

### 2. `pagetest.js` — 全站页面扫描（需 CDP）

用无头 Chrome 逐一加载页面，收集：控制台报错、运行时异常、破图、横向溢出、缺 h1、`undefined` 文本泄漏、空网格等。

```bash
# 先启动带调试端口的 Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --remote-debugging-port=9222 --user-data-dir=/tmp/qa-chrome about:blank &

CDP_PORT=9222 node tools/qa/pagetest.js > /tmp/pages.json     # 全站 95 页
CDP_PORT=9222 node tools/qa/pagetest.js "/about.html,/works.html"  # 指定子集
```

- 页面清单在 `pages.json`（95 条站内路径，与 sitemap 对齐）。
- 已内置 `Network.setCacheDisabled`，避免读到旧脚本的假回归。

### 3. `cdp.js` — 极简 CDP 客户端

被 `pagetest.js` 复用。封装 `Page/Runtime/Network/Log` 的发送与事件订阅，供需要操作浏览器的脚本直接 `require('./cdp.js')`。

## npm 命令

```bash
npm run test:api     # 等价于 node tools/qa/snapshot.js
npm run check        # 站点自检（site-check.js）
npm run check:syntax # 全量语法检查
```

## 维护约定

- 新增前台页面时，同步把路径补进 `pages.json`，保证全站扫描覆盖。
- 一次性探针脚本（性能、样式试错等）不要入库，只保留有长期复用价值的验收脚本。
