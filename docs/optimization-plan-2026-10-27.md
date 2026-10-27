# 持续优化方案（2026-10-27）

> 基线：`HEAD 30f8b85`（已含设置白名单、缓存 TTL、profile 部分更新、报名外键校验四项修复）
> 本文所有数字均为本机实测，采集脚本见 `/tmp/webtest/`，压测在 `/tmp/perf.db`（真实库副本，20 万行合成数据）上进行，未触碰生产数据。

## 一、优化目标与衡量标准

优化不是"让代码更好看"，而是下面 6 个指标同时不退化、其中 3 个显著改善。

| # | 指标 | 当前基线（实测） | 目标 | 采集方式 |
|---|---|---|---|---|
| M1 | 单页首屏接口总字节（`news.html` 走 `?limit=50`） | **45,358 B** | ≤ 14 KB（−69%） | `curl -w '%{size_download}'` |
| M2 | 后台列表首屏载荷（`/api/admin/news`，18 条） | **48,000 B** | ≤ 40 KB，且不随条数线性膨胀 | 同上 + 造数对比 |
| M3 | 访问看板聚合耗时（20 万行） | **55 ms × 3 次查询** | ≤ 70 ms / 全部 | 副本库压测 + `EXPLAIN QUERY PLAN` |
| M4 | 77 接口快照差异 | **0** | 保持 0 | `/tmp/webtest/snapshot.js` |
| M5 | 单个请求内的同步 DB 时间 | 空库 < 1 ms | 任一接口 < 50 ms | better-sqlite3 同步调用计时 |
| M6 | 新增一个设置项需要改动的文件数 | **3 处**（DB 键、`settingGroups`、迁移） | 1 处 | 人工核对 |

**为什么是这 6 项**：M1/M2 直接决定用户与编辑的等待时间；M3/M5 决定并发能力——`better-sqlite3` 是同步 API，一次慢查询会阻塞整个 Node 事件循环，所有并发请求一起排队；M4 是回归保险丝；M6 决定后续迭代成本。

## 二、现状实测：真正的瓶颈不在服务端延迟

先把"感觉慢"排除掉。

| 接口 / 页面 | 平均响应（20 次） | 响应体 |
|---|---|---|
| `/api/settings` | 0.65 ms | 1,478 B |
| `/api/products` | 0.67 ms | 5,890 B |
| `/api/content` | 0.67 ms | 9,562 B |
| `/api/news` | 0.78 ms | **45,358 B** |
| `/api/courses` | 0.82 ms | **37,016 B** |
| `/` | 5.78 ms | 21,171 B |
| `/api/admin/news` | 0.58 ms | **48,000 B** |

结论三条：

1. **gzip 已生效**，不是瓶颈：`/api/news` 45,358 B → 19,319 B（−57%），`compression` 中间件已在 `server.js:36`。
2. **服务端延迟不是瓶颈**：所有接口在空库下 < 1 ms。但这也是**假象**——当前库只有 news 18 条、courses 6 条、orders 0 条、page_views 0 行，延迟是"数据量小"换来的，不是"设计好"。
3. **真正的成本是"数据量 × 全量返回 × 同步阻塞"**：接口一律 `SELECT *`、后台列表无 `LIMIT`、聚合查询全表扫。数据一涨，延迟线性上升，而且因为同步 API，会阻塞整个进程。

## 三、瓶颈梳理

### 3.1 性能

**P-1 列表接口把正文一起返回（最容易被忽略的浪费）**

`routes/public.js:59` 的 `/api/news` 用 `SELECT *`，返回 `body` 全文。实测：

```
18 条已发布：总字符 18,440，其中 body 12,648 → 占 68.6%
```

`news.html` 的列表页请求的是 `?limit=50`，等于把 50 篇正文全部下发给列表渲染，而列表只用到 `title/summary/cover/tag/published_at`。详情页走 `/api/news/:slug`，正文照样拿得到——**列表不需要 body**。前端已确认零处消费 `.body`（`grep -rn "\.body\b" public/js/` 无命中）。

按现有 18 篇外推：50 篇时该接口约 126 KB，一年 200 篇时约 500 KB。

**P-2 课程接口同时返回 `*_json` 原文与解析后的数组**

`/api/courses` 单条同时含 `syllabus_json`（字符串）、`syllabus`（数组）、`outcomes_json`、`outcomes`、`gallery_json`、`gallery`。

```
6 条课程：总字符 23,832，其中 *_json 原文 8,372 → 占 35.1%
```

同一份数据传两遍，前端只用解析后的那份（`grep` 确认零处引用 `*_json`）。这是产品接口里漏掉 `parseProduct` 那种 `delete` 的同类问题。

**P-3 后台列表完全没有上限**

`lib/crud.js:40` 是 `SELECT * FROM ${table} ORDER BY ${adminOrder}`——**没有 LIMIT**。前台列表有 `pageLimit()` 收敛，后台没有：

```
/api/admin/news    18 条 → 48,000 B（带正文）
/api/admin/courses  6 条 → 22,465 B（带 gallery_json）
```

按 48 KB / 18 条 ≈ 2.7 KB/条外推：500 条新闻时单次进入后台列表要拉 **1.3 MB**，且经过 `compression` 后仍有约 400 KB。编辑每点一次侧边栏就付一次。

**P-4 访问统计聚合：三次全表扫，且索引微调收益有限**

`routes/admin.js:405/408/411` 三条聚合，前两条条件写成 `datetime(created_at) >= datetime('now','localtime',?)`——**在列上套函数，`idx_page_views_created` 用不上**；第三条 `total` 更彻底，`WHERE is_crawler=0` 连时间过滤都没有，**每次都全表数一遍历史全部行**。

副本库 20 万行实测：

| 写法 | 查询计划 | 耗时 |
|---|---|---|
| 当前 `datetime(created_at) >= …` | `SCAN page_views`（全表） | **55.0 ms** |
| 改为 `created_at >= ?`（JS 算 cutoff） | `SEARCH … USING idx_page_views_created` | 147.9 ms ❌ |
| 加复合索引 `(is_crawler, created_at)` + 传参 | `SEARCH … USING idx_pv_crawler_created` | 162.2 ms ❌ |
| 同上，`GROUP BY path` 那条 | `SEARCH … idx_pv_crawler_created` | 44.0 ms |
| 同上，`GROUP BY date(created_at)` 那条 | `COVERING INDEX` | **20.9 ms** |

**这里要如实说明一个反直觉结果**：加了索引反而更慢。原因是 `COUNT(DISTINCT visitor)` 需要按索引回表逐行取值，随机 I/O 比顺序全扫更贵。所以 P-4 的正确解法不是"加索引"，而是：

1. 保留策略（90 天）把基数压住；
2. 三条聚合成一条 CTE，只扫一次；
3. 分日汇总表（`page_views_daily`），看板读汇总不读明细。

`GROUP BY path` 那条能从 55 ms 降到 44 ms，`GROUP BY date` 那条能到 20.9 ms——说明"明细查询"可以救，"去重访客数"救不了，只能靠预聚合。

风险量级：20 万行 ≈ 日均 550 PV 跑一年。到 100 万行时三条查询合计约 **800 ms 同步阻塞**，期间全站所有请求排队。这是唯一一个"数据量增长会导致雪崩"的点。

### 3.2 可维护性

| # | 问题 | 现状 | 代价 |
|---|---|---|---|
| C-1 | 设置项双处维护 | DB 键 35 个，`public/admin/index.html:891` 又硬编码 34 个字段名；新增一项要同时改 DB 种子 + 表单 + 迁移 | 漏改就出现"后台看不见但接口存在"或反之；我刚加的白名单正是靠"读表推导"才避免了第三处硬编码 |
| C-2 | 状态字段枚举散落 | `status` 在 products/news/courses/orders/tickets 各写各的字符串，无单一来源 | M2 那类脏值入库无法一处收口 |
| C-3 | `routes/admin.js` 454 行 | 一个文件同时管登录、20 个资源的 CRUD、设置、上传、看板 | 改动半径大，code review 容易漏 |
| C-4 | 验收脚本不在仓库里 | 全部在 `/tmp/webtest/`（snapshot.js、fixA.sh、pagetest.js…） | 机器重启即丢，等于"验证过程不可复现"，下次改动只能靠肉眼 |

C-4 是这次最该先补的：**没有可复现的回归，前面所有质量结论都只有一次性效力。**

### 3.3 边界情况

| # | 问题 | 现状 |
|---|---|---|
| E-1 | 班期容量与报名死线只存不用 | `capacity` / `registration_deadline` 全库零处比较逻辑；`enrollment_inquiries` 只有 `course_id`、**没有 `session_id`**，所以"某班期报了几人"根本算不出。要修必须先加列 → 表结构变更 → 单独排期 |
| E-2 | 6 个链接字段缺 `safeLink` | `scenes.link` / `videos.url` / `downloads.url` / `heroes.link` / `reviews.url` / `academy.link`。**不能直接加校验**：库里大量值是 `"#"`，而 `safeLink('#')` 返回空串，一加校验按钮会全部消失。必须"先规范化存量、再加校验"两步走 |
| E-3 | 上传目录无孤儿清理 | `public/uploads` 8.4 MB / 15 个文件，无引用检测、无清理脚本；编辑器换图后旧图永久残留 |

## 四、改进措施与优先级

### P0（本轮就做：改动小、收益可度量、不涉及表结构）

| 措施 | 改动位置 | 预期收益 | 验证方式 |
|---|---|---|---|
| **1. 列表接口瘦身**：`/api/news` 去掉 `body`；`/api/courses` 去掉 `*_json` | `routes/public.js:59`、`routes/public.js:109` 附近 | M1 45,358 B → ≈14 KB（−69%）；gzip 后 19,319 B → ≈6 KB | `curl -w size_download` 前后对比；详情页 `/api/news/:slug` 仍返回 body；95 页回归 + 快照 0 差异 |
| **2. 后台列表加分页** | `lib/crud.js:40` 加 `LIMIT ? OFFSET ?` + `total` 计数；`public/admin/index.html` 列表底部加翻页 | M2 从"随条数线性膨胀"变为"恒定 ≤ 40 KB"；500 条时 1.3 MB → 130 KB | 副本库造 500 条新闻，测 `size_download`；翻页到最后一页无重复/漏项 |
| **3. 看板聚合收口** | `routes/admin.js:405-411` 三条合成一条 CTE，`total` 改为限定时间窗；`created_at >= ?` 由 JS 计算 cutoff | 三次扫表 → 一次；20 万行 165 ms → 约 60 ms；`total` 不再随历史行数线性增长 | 副本库 20 万行计时；`EXPLAIN QUERY PLAN` 出现 `COVERING INDEX` |
| **4. 访问统计保留策略** | `db.js` 加 90 天清理（启动时 + 每日一次） | 基数封顶，P-4 的长尾风险消除 | 造 120 天数据，跑清理后核对行数 |

P0 四项合计约 120 行 diff，互不牵连，可一次提交、一次验收。

### P1（下一轮：修结构性问题）

| 措施 | 收益 | 验证 |
|---|---|---|
| **5. 验收脚本入库**：`tools/qa/`（snapshot / page / admin / 探针）+ `npm run test:api` | 质量结论可复现，任何人一条命令跑完 77 接口 + 95 页 | 新克隆仓库执行 `npm run test:api` 全绿 |
| **6. 状态枚举单一来源**：`lib/enums.js` 导出各表允许值，CRUD 与表单共用 | M2 的脏值在一处收口 | 传非法 status → 400；后台下拉框选项与枚举一致 |
| **7. 链接规范化 + 校验两步走** | 先跑 `tools/normalize-links.js` 把 `"#"` 转成 `""`、相对路径补全，再给 6 个字段加 `safeLink` | 脚本 dry-run 报告改动条数；加校验后前台按钮数量不变（目录页对比截图） |
| **8. 设置表单 schema 后端下发** | M6 从 3 处降到 1 处 | 新增一个假设置项，只改 DB 种子，后台自动出现 |

### P2（排期后置：涉及表结构或收益不足）

| 措施 | 为什么后置 |
|---|---|
| 9. `enrollment_inquiries.session_id` + 容量/死线逻辑 | 表结构变更 + 报名流程改造，需先定产品规则（超额是拦截还是候补） |
| 10. sitemap 加 10 分钟缓存 | 实测 0.57 ms，收益可忽略；只为将来加动态 URL 时不退化 |
| 11. 上传孤儿文件清理 + 缩略图 | 需要引用关系扫描，容易误删；建议先出"只报告不删除"的清单 |
| 12. 拆 `routes/admin.js` | 454 行尚未到痛点；等 P0-2 分页改动落地后按资源拆，一次改完 |

## 五、不建议做的事（避免过度工程）

| 方案 | 不做的理由 |
|---|---|
| 引入 Redis 做缓存 | 当前 `settings` 缓存命中后 0.65 ms，Redis 往返就 0.2–0.5 ms，净收益接近零，还多一个运维组件 |
| 引入 ORM（Prisma/TypeORM） | SQL 全部是简单单表 + 少量 join，`better-sqlite3` 预编译语句缓存已经把解析开销摊掉；ORM 会带来 N+1 与类型生成成本 |
| 上 SSR / 前端框架 | 95 个静态页 + 接口取数，首屏 5.78 ms；重写收益远小于回归风险（95 页全量重测） |
| 拆微服务 | 单机 SQLite、单进程、PV 量级未到；拆分会把"同步事务"变成"分布式一致性"问题 |
| 给 `page_views` 猛加索引 | 已实测：加索引后 `COUNT(DISTINCT visitor)` 从 55 ms 变成 162 ms，是负优化 |

## 六、执行顺序与验收门槛

```
P0-1 列表瘦身  →  P0-2 后台分页  →  P0-3 聚合收口  →  P0-4 保留策略
（互不依赖，但 1 先做：它同时降低 2 的数据量）
```

每批的**通过门槛**（缺一不放行）：

1. `node -c` 全部改动文件通过；
2. 77 接口快照与基线对比 **0 差异**（允许的差异必须逐条说明原因）；
3. 95 个前台页面加载 0 console 异常；
4. 后台 20 个视图逐个点开无报错；
5. 本文第一节的对应指标达到目标值，且**记录前后数字**；
6. 验收脚本一并入库（P1-5 之前，至少把当批用到的探针放进 `tools/qa/`）。

## 附：本文数据的复现方式

```bash
# 接口耗时与体积（20 次平均）
for i in $(seq 1 20); do curl -s --noproxy '*' -o /dev/null -w '%{time_total}\n' http://localhost:3000/api/news; done

# 快照比对
cd /tmp/webtest && node snapshot.js > snap.json   # 与 snap-before.json 逐项比对

# 索引与聚合压测（副本库，勿在真实库上造数）
cp data/yaoprint.db /tmp/perf.db && node tools/perf-pageviews.js   # 待 P1-5 入库后提供
```
