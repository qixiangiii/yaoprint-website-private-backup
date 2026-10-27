# 代码审查报告 · 起元星启官网与后台

> 审查对象：`main @ 6f619db`（工作区无未提交的源码改动）
> 审查方式：静态通读 20 个源文件 + 启动服务做 60 余项接口探针，每条结论都有实测状态码或数据佐证
> 审查范围：`server.js`、`lib/*`（9）、`routes/*`（4）、`db.js`、`tools/*`、`public/admin/index.html`、`public/js/*`
> 探针脚本：`/tmp/webtest/probe3.sh`、`probe4.sh`（可重跑）
> 说明：探针写入的测试数据已全部清理；期间为验证设置项长度上限曾临时覆盖 `seo_default_description`，已从 WAL 恢复为原值（48 字），当前 `/api/settings` 响应 1478 字节，与审查前一致。

---

## 结论概览

| 级别 | 数量 | 说明 |
|---|---|---|
| 严重 | 4 | 会造成数据污染、全站性能下降或用户可见的 500 |
| 中等 | 8 | 逻辑不完整、边界处理缺失、语义不一致 |
| 轻微 / 优化 | 9 | 体验、可维护性与运维友好度 |
| 已验证无问题 | 12 项 | 见末节，避免重复排查 |

整体评价：**安全基线扎实**（CSRF、路径遍历、上传魔数、越权隔离、请求体限制均已实测通过），
主要风险集中在「后台写接口缺乏收敛」和「业务规则只存不校验」两类。

---

## 一、严重问题

### S1. `PUT /api/admin/settings` 没有键白名单，也没有值长度上限

**位置**：`routes/admin.js:357-367`

**现状**
```js
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const body = req.body || {};
  ...
  save(Object.entries(body));   // 任意键、任意长度、任意类型
```

**实测**
- 写入 `{"__probe_key__":{"nested":1}}` → 200，落库值为字符串 `"[object Object]"`
  （`String(value ?? '')` 把对象序列化成了字面量）。
- 写入 1.5MB 的 `seo_default_description` → 200；随后 `/api/settings` 单次响应从 **1478 字节涨到 1,501,348 字节**。
  该接口**每个页面都会调用一次**，等于全站首屏被一个设置项拖垮。

**额外风险**
`settings` 表里还存着 18 个 `migration_*` 标记键（`migration_qiyuan_xingqi_v1` 等）。
本次实测发现这些键与站点设置共表。虽然没有对应路由能删除它们，但一旦某个键被写成空值，
`db.js` 的迁移判断会认为「未执行」而**重新跑一次数据迁移**（`db.js:569`、`620` 等 20 余处）。

**修改建议**
```js
// lib/settings-schema.js —— 与后台面板 settingGroups 共用同一份清单
const SETTING_KEYS = new Set([
  'brand_name','site_name','site_tagline','site_url','company_legal_name','business_scope',
  'campus_summary','copyright','icp','course_catalog_visibility','seo_default_title',
  'seo_default_description','contact_address','contact_email','contact_hours','contact_phone',
  'contact_wechat','social_bilibili','social_douyin','social_wechat','social_weibo','social_youtube',
  'wecom_webhook_url',
  ...Array.from({ length: 4 }, (_, i) => [`stat${i + 1}_label`, `stat${i + 1}_unit`, `stat${i + 1}_value`]).flat()
]);
const MAX_SETTING_LENGTH = 2000;

// routes/admin.js
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const entries = Object.entries(req.body || {});
  if (!entries.length) return res.status(400).json({ error: '没有要保存的设置项' });

  const unknown = entries.filter(([key]) => !SETTING_KEYS.has(key)).map(([key]) => key);
  if (unknown.length) return res.status(400).json({ error: `不支持的设置项：${unknown.join('、')}` });

  const invalid = entries.filter(([, value]) =>
    typeof value !== 'string' || value.length > MAX_SETTING_LENGTH).map(([key]) => key);
  if (invalid.length) {
    return res.status(400).json({ error: `设置项必须是不超过 ${MAX_SETTING_LENGTH} 字的文本：${invalid.join('、')}` });
  }
  // ...后续 upsert 不变
});
```
> 注意：白名单必须显式列出，**不能用 `migration_*` 通配**，否则迁移标记仍可被覆盖。

---

### S2. 用户侧不可控输入直接触发 500（外键越界）

**位置**：`routes/public.js:156-172`

**实测**
```
POST /api/enrollment-inquiries  {"parent_name":"探针","parent_phone":"13800138000","privacy_consent":1,"course_id":999999}
→ 500  {"error":"FOREIGN KEY constraint failed"}
```
原因：`course_id` 只做了 `Number(course_id) || null`，没有校验课程是否存在；
`enrollment_inquiries.course_id` 有外键（`db.js:471`），`foreign_keys = ON` 时插入直接抛错，
而这个 handler **没有 try/catch**，异常冒泡到全局错误出口，状态码被当成 500。

**危害**
- 用户看到的是"服务器内部错误"，实际是「你选的课程已被下架」这种可纠正的问题；
- 生产环境会把这类 500 计入错误率，掩盖真正的故障；
- 非生产环境还会把 SQLite 原文透给前端。

**对比**：后台同类写入（`POST /api/admin/course_sessions` 挂不存在的 `course_id`）返回的是 **400**，
因为 `crud.js:58-61` 有 try/catch。同一类错误两种状态码，说明是遗漏而非设计。

**修改建议**
```js
// 入库前显式校验，给出可纠正的文案
const courseId = Number(course_id) || null;
const campusId = Number(campus_id) || null;
if (courseId && !stmt("SELECT 1 FROM courses WHERE id=? AND status='published'").get(courseId)) {
  return res.status(400).json({ error: '所选课程已下架，请重新选择' });
}
if (campusId && !stmt("SELECT 1 FROM campuses WHERE id=?").get(campusId)) {
  return res.status(400).json({ error: '所选校区不存在，请重新选择' });
}
```

---

### S3. `PUT /api/account/profile` 整体覆盖，会静默清空姓名

**位置**：`routes/commerce.js:66-74`

**实测**
```
PUT /api/account/profile {"phone":"13900139000"}
→ 200 {"ok":true,"customer":{"name":"","phone":"13900139000",...}}
```
只改电话，`name` 被写成空串，且响应 200 无任何提示。用户下次打开账户页会发现姓名没了。

**修改建议**（与 `lib/crud.js:21` 的 `submitted()` 保持一致：只更新提交了的字段）
```js
app.put('/api/account/profile', requireCustomer, (req, res) => {
  const body = req.body || {};
  const sets = [], values = [];
  const has = key => Object.prototype.hasOwnProperty.call(body, key);

  if (has('name')) { sets.push('name=?'); values.push(limitText(body.name, 40)); }
  if (has('phone')) {
    const phone = limitText(body.phone, 20);
    if (phone && !isPhone(phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    sets.push('phone=?'); values.push(phone);
  }
  if (!sets.length) return res.status(400).json({ error: '没有要更新的字段' });

  stmt(`UPDATE customers SET ${sets.join(', ')} WHERE id=?`).run(...values, req.session.customer.id);
  const customer = stmt('SELECT * FROM customers WHERE id=?').get(req.session.customer.id);
  req.session.customer = customerPublic(customer);
  res.json({ ok: true, customer: req.session.customer });
});
```

---

### S4. 设置缓存无 TTL，外部写入后永久返回旧值

**位置**：`lib/store.js:21-30`

**实测**
审查过程中直接改写数据库里的 `seo_default_description`，接口**仍持续返回旧值**，
只有重启进程才刷新（`invalidateSettings()` 只在 `PUT /api/admin/settings` 里被调用）。

**影响场景**
- 运维用 `sqlite3` 修数据、跑 `npm run seed`、跨进程改配置 → 全站读到的都是脏值；
- 将来若上 pm2 cluster / 多实例，A 实例改了设置，B 实例的缓存永远不会失效。

**修改建议**（软 TTL 兜底，进程内写仍立即失效）
```js
let settingsCache = null;
let settingsLoadedAt = 0;
const SETTINGS_TTL = 5000;   // 5 秒；站点设置读多写少，这点延迟无感

function allSettings() {
  if (!settingsCache || Date.now() - settingsLoadedAt > SETTINGS_TTL) {
    const snapshot = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) snapshot[row.key] = row.value;
    settingsCache = snapshot;
    settingsLoadedAt = Date.now();
  }
  return settingsCache;
}
function invalidateSettings() { settingsCache = null; settingsLoadedAt = 0; }
```

---

## 二、中等问题

### M1. 删除被引用的分类返回 500，且暴露 SQLite 原文

**位置**：`lib/crud.js:82-86`；根因：`db.js:51` 的 `products.category_id` 外键未声明 `ON DELETE`

**实测**
```
DELETE /api/admin/categories/5   （该分类下有 3 个产品）
→ 500 {"error":"FOREIGN KEY constraint failed"}
```
对比其他表（`catalog_skus.product_id`、`devices.product_id`、`course_sessions.campus_id` 等）都是
`ON DELETE SET NULL`，只有 `products.category_id` 是默认的 NO ACTION，属于不一致。

**修改建议**（两条都要做）
```js
// 1) crud.js 的 DELETE 补异常映射
app.delete(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
  try {
    const result = stmt(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  } catch (error) {
    if (/FOREIGN KEY constraint/i.test(error.message || '')) {
      return res.status(409).json({ error: '该记录仍被其他数据引用，请先解除关联后再删除' });
    }
    res.status(400).json({ error: error.message });
  }
});
```
```
2) 语义上，分类被删时产品应变为「未分类」而不是删不掉：
   重建 products 表（SQLite 不支持改外键）或在新库定义中改为
   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
```

### M2. 状态字段全无枚举校验，脏值可入库

**位置**：`routes/admin.js:103-108`（工单）、`:121-127`（预约）、`:140-144`（客户）、
`:179-183`（订单）、`:189-193`（售后）、`:254-259`（线索）；`routes/commerce.js:178` 仅售后做了收敛

**实测**
```
PUT /api/admin/tickets/6 {"status":"<script>alert(1)</script>"}  → 200 {"ok":true}
读回：status = "<script>alert(1)</script>"
```
**当前未构成 XSS**：后台 `statusBadge()` 只做映射、不内插原值（`admin/index.html` 已确认），
但脏值会让状态筛选（`select` 永远匹配不上）、徽章样式、统计口径全部失效。

**修改建议**
```js
// lib/enums.js
const STATUS_ENUMS = {
  service_tickets: ['new', 'processing', 'done'],
  leads: ['new', 'contacted', 'done'],
  orders: ['pending_review', 'quoted', 'confirmed', 'shipped', 'done', 'cancelled'],
  after_sales: ['new', 'processing', 'done', 'rejected'],
  customers: ['active', 'disabled'],
  enrollment_inquiries: ['new', 'contacted', 'trial_booked', 'converted', 'closed'],
  creator_submissions: ['pending', 'approved', 'rejected'],
  partner_applications: ['new', 'contacted', 'done']
};
function pickStatus(table, value, fallback) {
  const list = STATUS_ENUMS[table] || [];
  return list.includes(String(value)) ? String(value) : fallback;
}
```
配合在 `PUT` 里：非法值返回 `400 { error: '状态值不合法' }`，而不是静默回落（静默回落会把
一次误操作变成"看起来成功但没生效"）。

### M3. `/api/courses` 同时返回 `*_json` 原文与解析后的字段

**位置**：`routes/public.js:115-132`

**实测**：`/api/courses` 返回的键里仍有 `syllabus_json / outcomes_json / gallery_json`。
`lib/catalog.js` 的 `parseProduct()` 会 `delete` 掉原始字段，课程这里漏了。

**影响**：响应体积约翻倍（JSON 字符串 + 数组两份）；两个来源同名不同形，前端容易取错。

**修改建议**：抽一个 `parseCourse(course)`，与 `parseProduct` 同款，统一 `delete` 原始列。

### M4. 班期的 `capacity` 与 `registration_deadline` 只存不用

**位置**：`db.js:443-444`，`routes/admin.js:416`

全库检索：这两个字段**没有任何比较逻辑**。后果：
- 报名截止日已过，`/api/courses/:slug` 依旧返回 `status='open'` 的班期，前台照常展示"开放报名"；
- 名额满了也不会关闭，没有任何地方统计已报名人数。

**更深的建模缺陷**：`enrollment_inquiries` 只关联 `course_id`，**没有 `session_id`**，
所以"某个班期已报几人"目前根本算不出来。要让 capacity 生效，需要先补 `session_id` 关联。

**修改建议**
```js
// 先做能做的：过滤已过截止日
course.sessions = stmt(`SELECT * FROM course_sessions
  WHERE course_id=? AND status='open'
    AND (registration_deadline='' OR date(registration_deadline) >= date('now','localtime'))
  ORDER BY sort, id`).all(course.id);
```
```
// 中期：enrollment_inquiries 增加 session_id（ensureColumn 可平滑加列），
// 报名时写入，列表返回 remaining = capacity - 已报名数，为 0 时前端显示"已满"。
```

### M5. `/api/partners` 把用户输入的 `%` `_` 当通配符

**位置**：`routes/public.js:195`

**实测**：`GET /api/partners?city=%` 返回全部网点（LIKE `%%%` 恒真）。

**修改建议**
```js
const escapeLike = value => String(value).replace(/[\\%_]/g, match => '\\' + match);
if (city) {
  clauses.push("(city LIKE ? ESCAPE '\\' OR province LIKE ? ESCAPE '\\')");
  values.push(`%${escapeLike(city)}%`, `%${escapeLike(city)}%`);
}
```

### M6. 6 个链接字段没有 `safeLink` 校验（但不能直接加，见下）

**位置**：`routes/admin.js:419-425`（`reviews.url`、`videos.url`、`scenes.link`、`academy.link`、
`downloads.url`），以及 `heroes.link` / `heroes.link2`

前台直接把值塞进 `href`（`public/js/main.js:446`），`javascript:` 会被执行。
`text()` 只做 HTML 转义，拦不住伪协议。

**关键约束（先看数据再改）**
```
GET /api/downloads → url: "#"
GET /api/videos    → url: "#" / "https://www.bilibili.com/..."
```
`safeLink('#')` 会返回空串 —— **直接加校验会把现有按钮全部变没**。必须按两步走：
1. 先规范化存量：`UPDATE downloads SET url='' WHERE url='#'`（videos/scenes/academy/reviews/heroes 同理），
   前端对空值回落到默认链接；
2. 再加校验：`validate: body => !body.url || safeLink(body.url) ? null : '链接仅支持站内路径或 HTTPS 地址'`。

### M7. 后台列表硬编码 LIMIT 200 且无分页，部分表又完全不限

**位置**：`routes/admin.js:100`（tickets）、`:251`（leads）用 `LIMIT 200`；
`:137`（customers）、`:176`（orders）、`:268`（subs）无任何限制

**影响**：询价超过 200 条后，后台看板筛选不到新数据（也没有"加载更多"）；反过来 subs 全量返回，
几万条订阅时首屏要传几 MB。

**修改建议**：统一 `?page=&pageSize=`（默认 50，上限 200），返回 `{ rows, total }`；
前端表格底部加"加载更多"。

### M8. `page_views` 无保留策略

全库检索无任何 `DELETE FROM page_views`。每次访问写一行，只增不减。

**修改建议**：启动时 + 每日定时清理
```js
function prunePageViews(days = 90) {
  const info = db.prepare("DELETE FROM page_views WHERE created_at < datetime('now','localtime', ?)").run(`-${days} days`);
  if (info.changes) console.log(`[page_views] 清理 ${info.changes} 行`);
}
prunePageViews();
setInterval(prunePageViews, 24 * 60 * 60 * 1000).unref();
```

---

## 三、轻微问题与优化项

| # | 位置 | 问题 | 建议 |
|---|---|---|---|
| 1 | `routes/commerce.js:93-96` | 删除不存在地址返回 200，而 `/api/cart/items/:id` 返回 404，同模块语义不一致 | 统一为 404，或统一为幂等 200 并注释说明 |
| 2 | `routes/commerce.js:117,25` | `quantity` 累加后 `MIN(99)` 静默截断；`quantity=0` 被当成 1，无法用 0 移除 | 返回实际生效的数量（`{ok, quantity}`），前端提示"已调整为 99 件" |
| 3 | `routes/commerce.js:36,54`；`routes/admin.js:26,48,51` | `bcrypt.hashSync/compareSync` 同步执行，cost=10 约 60–100ms，登录高峰会串行阻塞事件循环 | 改用 `await bcrypt.compare()`；限流已挡住暴力破解，改异步主要是吞吐 |
| 4 | `server.js:116-123` | 框架错误文案原样透出：413 → `request entity too large`，400 → `Expected property name or '}' in JSON at position 1` | 按 status 映射中文："请求内容过大" / "请求格式不正确" |
| 5 | `routes/seo.js:26` | `lastmod` 每次都写当天日期，等于没有 lastmod，搜索引擎会逐步忽略 | 取内容表真实最大更新时间（`content_items.updated_at` 与 `news.created_at` 的 MAX） |
| 6 | `routes/seo.js:37` | robots.txt 只 `Disallow: /admin`，未拦 `/api/` | 补 `Disallow: /api/`（接口无需收录） |
| 7 | `server.js:126` | 无优雅关闭：`SIGTERM` 直接退出，WAL 未 checkpoint | `server.close()` → `db.close()`，带 10s 兜底超时 |
| 8 | `server.js` | 无 `/api/health`（实测 404），无法做存活探针 | 返回 `{ ok:true, db: db.prepare('SELECT 1 AS v').get().v === 1 }` |
| 9 | `routes/admin.js:359` | `settings` 写入用 `db.prepare` 而非 `stmt()`，与全站写法不一致（每次请求重新编译） | 改为 `stmt()` 复用 |

---

## 四、已验证正常的部分（避免重复排查）

| 项 | 实测结果 |
|---|---|
| CSRF Origin 校验 | 跨站 Origin → 403；同站 → 200 |
| 路径遍历 | `/admin/../server.js` → 404；`/admin/%2e%2e/../server.js` → 回落 `index.html`，未读到源码 |
| 上传伪造图片 | HTML 改名的 `.jpg` → 400 `文件内容不是有效图片`，落盘文件已被删除；无文件 → 400 |
| 请求体边界 | 3MB → 413；损坏 JSON → 400（状态码正确，仅文案待本地化） |
| 越权访问 | 用他人/不存在地址下单 → 400；订单/地址/工单均按 `customer_id` 过滤 |
| 设备重复登记 | 同账户重复登记同一序列号 → 幂等成功，未产生重复绑定行 |
| 购物车数量收敛 | `0→1`、`999→99`、`abc→1`、`sku_id=99999→404` |
| `page_views.path` | 超长输入被截断到 255 字符 |
| 后台面板 XSS | 全部插值走 `esc()`（`& < > " '` 全转义）；`statusBadge()`/`imageCell()` 不内插原始值 |
| 公开设置白名单 | `/api/settings` 未泄漏 `wecom_webhook_url` 与全部 `migration_*` 键 |
| 前端构建一致性 | 重跑 `npm run build:js` 后 `git diff` 为空 —— 7 个 `.min.js` 与源码同步 |
| sitemap 有效性 | 43 条 URL 逐条请求，全部 200，无死链 |

---

## 五、建议的修复顺序

1. **S1 + S4**（设置白名单 + 缓存 TTL）—— 半小时内可完成，消除两个"一次误操作影响全站"的入口。
2. **S3 + S2**（profile 部分更新 + 外键校验）—— 用户可直接感知，改动局部。
3. **M1 + M2**（删除异常映射 + 状态枚举）—— 后台数据质量的兜底。
4. **M3 + M5**（课程字段清理 + LIKE 转义）—— 纯后端小改。
5. **M6 两步走** —— 先跑数据规范化脚本，再加校验，不要颠倒。
6. **M4 + M7 + M8** —— 涉及表结构或前端分页，建议排到下一次迭代。
