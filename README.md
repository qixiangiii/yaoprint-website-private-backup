# 起元星启官网与内容管理后台

桂林起元星启科技有限公司官网，面向**初中、高中学生的 3D 建模、3D 打印、科创项目与学校创客课程**。项目包含独立品牌前台与可运营的后台 CMS，课程、文章、生态入口、试听线索、学校合作案例等内容均可在线维护。

- 前台定位：课程体系 + 学习资源 + 作品展厅 + 竞赛成长 + 学校合作
- 后台定位：课程/班期/师资/校区管理 + 试听招生 + 内容发布 + 客户与订单
- 技术栈：Node.js + Express + SQLite（better-sqlite3）+ 服务端会话 + 本地图片上传

---

## 一、快速开始

### 环境要求

- Node.js **20 LTS 或 22 LTS**（推荐）。项目使用 `better-sqlite3` 原生模块，Node 版本跨度过大时可能需要重新编译。
- npm 9+
- 无需单独安装数据库，SQLite 文件会自动创建。

### 启动步骤

```bash
# 1. 安装依赖（首次执行）
npm install

# 2. 启动站点
npm start
```

启动后访问：

| 入口 | 地址 |
| --- | --- |
| 前台首页 | http://localhost:3000 |
| 后台管理 | http://localhost:3000/admin |
| 课程体系 | http://localhost:3000/courses/index.html |
| 学习中心 | http://localhost:3000/learning.html |
| 作品展厅 | http://localhost:3000/works.html |
| 竞赛成长 | http://localhost:3000/competition.html |
| 知识中心 | http://localhost:3000/knowledge.html |

本地演示管理员账号：`admin` / `admin123`。**首次登录后请立即在「站点设置 → 修改管理员密码」中更换密码。**

### 关于 `npm run seed`

`seed.js` 是**演示数据初始化脚本，会清空并重建产品、新闻、课程、分类、场景、学院、下载和站点设置等内容表**。仅建议在全新本地环境首次体验时执行：

```bash
npm run seed
```

已有真实课程、文章、咨询或客户数据时，**不要执行该命令**，否则内容会被覆盖（客户账户、订单、工单等业务表不会被清空，但演示内容会被重置）。

---

## 二、生产部署要点

启动前设置环境变量：

```bash
export NODE_ENV=production
export PORT=3000
export SESSION_SECRET="请替换为足够长的随机字符串"
npm start
```

说明：

- `NODE_ENV=production` 时，若未设置 `SESSION_SECRET`，服务会拒绝启动。
- 生产环境应通过 HTTPS 反向代理访问；如使用 Nginx，请正确转发 `Host` 与 `X-Forwarded-*` 头。
- 数据库位于 `data/yaoprint.db`，上传图片位于 `public/uploads/`，两者都不会进入 Git，请单独做备份。
- 如需对外售卖或收集学生信息，请先完成备案、隐私告知、未成年人信息保护与相关资质审核。

---

## 三、目录结构

```text
.
├── server.js                  # Express 服务：前台 API、后台 API、静态资源
├── db.js                      # SQLite 建表、兼容迁移、默认设置与初始内容
├── seed.js                    # 演示数据初始化脚本（会重置内容表）
├── curriculum.js              # 课程与学习内容数据（辅助脚本）
├── teaching-articles.js       # 教学文章数据（辅助脚本）
├── industry-news.js           # 行业动态数据（辅助脚本）
├── tools/site-check.js        # 站点链接与页面自检脚本
├── docs/
│   └── image-attribution.md   # 图片授权与来源台账
├── data/                      # SQLite 数据库（自动生成，不提交 Git）
├── public/                    # 正式前台与后台静态资源
│   ├── index.html
│   ├── courses/index.html     # 课程中心
│   ├── course.html            # 课程详情（?slug=课程 slug）
│   ├── learning.html          # 学习中心
│   ├── knowledge.html         # 知识中心
│   ├── works.html             # 作品展厅
│   ├── competition.html       # 竞赛成长
│   ├── trial.html             # 预约试听 / 家长咨询
│   ├── teachers.html          # 师资教研
│   ├── image-credits.html     # 图片来源与使用说明
│   ├── solutions/school.html  # 学校合作
│   ├── explore/ecosystem.html # 模型生态集合
│   ├── products.html          # 教学设备参考
│   ├── account/               # 家长/消费者账户
│   ├── shop/                  # 选购与报价
│   ├── admin/index.html       # 后台管理 SPA
│   ├── css/style.css
│   ├── js/main.js             # 公共导航、设置、首页、生态下拉
│   ├── js/education.js        # 课程、试听、学校合作、师资、作品
│   ├── js/business.js         # 账户、购物袋、订单、设备
│   ├── js/business-extra.js   # 设备登记、投稿、伙伴、下载
│   ├── js/competition.js      # 竞赛页面
│   └── uploads/               # 后台上传图片（不提交 Git）
└── package.json
```

---

## 四、前台页面与功能

### 1. 品牌与课程

- 首页包含：教育轮播、模型生态入口、课程成长路径、作品示例、教学文章与试听 CTA。
- 课程中心按初中基础、高中进阶、假期营、学校合作等分类展示。
- 课程详情展示课程目标、年级、课次、课时、授课形式、课程大纲、学习成果与过程示意。
- 师资、校区、教学案例均来自后台可维护数据；没有授权照片时显示中性占位，不伪造师资或学生成果。

### 2. 学习与创作资源

- 学习中心、知识中心提供建模、切片、打印与安全相关学习内容。
- 作品展厅展示课堂教学示例与经授权或匿名处理的案例。
- 竞赛成长页说明选题、原型、测试、记录与答辩路径，**不承诺报名即获证或参赛即获奖**。

### 3. 模型生态集合与顶部下拉

- 顶部导航「模型社区」为下拉菜单，读取后台「模型生态平台」的已发布数据。
- 每个平台点击后新窗口跳转对应官方站点，链接统一带 `noopener noreferrer external` 与严格 Referrer Policy。
- 本站模型生态集合页明确标注“第三方平台”，不转载、不镜像第三方模型文件。
- 平台卡片缩略图当前使用各平台首页截图作为导航示意；正式公开上线前应确认平台使用条款或取得授权，或替换为官方授权 Logo。

### 4. 教学设备参考

- 当前展示：智小白 Explorer3、Vorlon 350 × 350、快造 U1、小鲁班打印机、拓竹 A1。
- 这些设备以**教学选型参考**呈现，不声明官方销售、授权经销或原厂保修。
- 未取得厂商媒体授权或自有拍摄前，不使用网络抓取的机型宣传图。

### 5. 家长账户与咨询

- 家长可注册登录，管理地址、选购清单、报价订单、设备与工单。
- 「预约试听」收集监护人姓名、电话、学生年级、意向课程、时间偏好和隐私同意，进入后台「试听与招生咨询」跟进。
- 当前**不要求未成年人独立注册**，也未实现学生任务/作品/教师反馈工作台（见“待完善”）。

---

## 五、后台管理模块

登录 `/admin` 后可管理：

| 分组 | 模块 |
| --- | --- |
| 内容 | 首页轮播、产品管理、产品分类、教学文章、内容中心、竞赛入口、模型生态平台、课程中心、课程班期、师资教研、校区与授课点、教学案例、应用场景、课程入口卡、创作资源、媒体评测、软件下载 |
| 业务运营 | 消费者账户、选购 SKU、报价订单、售后申请、设备与保修、创作投稿、伙伴申请、服务伙伴 |
| 客户与系统 | 试听与招生咨询、通用咨询、服务工单、邮件订阅、站点设置、前台预览 |

站点设置可维护：

- 公司法定名称、展示品牌名、业务范围、校区说明
- 联系电话、咨询微信、企业邮箱、咨询时间、地址
- 版权信息、ICP 备案号
- 社交链接
- 首页四项数据统计

图片字段支持 URL 或上传。上传限制：`jpg / png / webp / gif`，单文件不超过 5MB；**不接受 SVG**。

---

## 六、主要 API

### 公开 API

| 路径 | 说明 |
| --- | --- |
| `GET /api/products`、`GET /api/products/:slug` | 教学设备列表与详情 |
| `GET /api/courses`、`GET /api/courses/:slug` | 课程列表与详情 |
| `GET /api/teachers` | 师资 |
| `GET /api/campuses` | 校区 |
| `GET /api/education-cases` | 教学案例 |
| `GET /api/competitions`、`GET /api/competitions/:slug` | 竞赛入口 |
| `GET /api/ecosystem-platforms` | 模型生态平台 |
| `GET /api/news`、`GET /api/news/:slug` | 教学文章 |
| `GET /api/content?type=...`、`GET /api/content/:type/:slug` | 通用内容中心 |
| `GET /api/settings` | 全站设置 |
| `GET /api/heroes` | 首页轮播 |
| `POST /api/enrollment-inquiries` | 试听/招生咨询 |
| `POST /api/leads` | 通用咨询 |
| `POST /api/tickets` | 服务工单 |
| `POST /api/subs` | 邮件订阅 |
| `POST /api/account/register`、`/login`、`/logout` | 家长账户 |
| `GET/POST/PUT/DELETE /api/cart/*`、`/api/orders`、`/api/devices` | 选购、报价订单、设备 |

### 后台 API

所有 `/api/admin/*` 接口均需管理员会话，覆盖产品、课程、班期、师资、校区、案例、竞赛、生态平台、文章、内容中心、轮播、下载、订单、设备、投稿、伙伴、咨询、工单、订阅、设置、密码与图片上传。

---

## 七、安全与合规

已实现：

- 仅公开 `public/` 目录，项目根目录、数据库与源码不再通过静态服务暴露。
- 生产环境强制要求 `SESSION_SECRET`。
- 上传接口校验 MIME 与扩展名，拒绝 SVG。
- 生态平台、官方资料等外链仅允许 `https:` 或站内相对路径，并统一使用安全新窗口属性。
- 消费者账户与后台管理员会话隔离，账户数据按登录身份过滤。
- 未成年人相关咨询仅收集安排试听所需的最小信息，并要求隐私同意。

注意事项：

- 默认账号 `admin / admin123` 仅用于本地演示，上线前必须修改。
- 当前后台管理员与教师共用同一权限，尚未实现教师角色与班级数据隔离。
- 正式对外收集学生信息前，请补充隐私政策、监护人授权、数据删除与保留期限说明。

---

## 八、图片与内容授权

- 教育过渡场景图来源与许可记录见 [`docs/image-attribution.md`](docs/image-attribution.md) 与前台 [`/image-credits.html`](/image-credits.html)。
- 第三方设备图片必须使用厂商书面授权媒体包、授权经销素材或自有拍摄，**不得直接下载官网、电商或评测图片**。
- 学生正脸、姓名、校服、学校标识、作品署名与课堂影像，公开展示前需取得监护人与学校授权；未授权内容应使用手部、背影、物件特写或匿名化处理。
- 外部模型平台仅提供官方跳转，不批量抓取或转载模型文件；当前生态入口缩略图使用平台首页截图作导航示意，正式对外发布前需完成授权确认或替换为授权素材。

---

## 九、待完善内容

上线前建议补充以下真实信息：

1. 桂林实际教学地址、校区、联系电话、企业邮箱与咨询微信。
2. ICP 备案号与实际运营主体信息。
3. 教师姓名、照片、资历及其公开授权。
4. 真实班期、开课时间、名额、价格与试听安排。
5. 学校合作案例、学生作品的公开授权或匿名化处理。
6. 五款教学设备的正式参数、图片、官方资料链接与授权/销售关系。
7. 课程任务、学生作品提交、教师反馈与家长摘要工作台（目前仅有方案，尚未实现）。
8. 首页早期导入的部分创作者视频仍沿用旧品牌标题，需要替换或下线。

---

## 十、常用命令与排障

```bash
npm start          # 启动站点（默认 3000 端口）
npm run check      # 运行站点页面/链接自检（tools/site-check.js）
npm run check:syntax  # 检查主要 JS 文件语法
npm rebuild better-sqlite3  # 原生模块与当前 Node 版本不匹配时重建
```

常见问题：

- **端口被占用**：`lsof -nP -iTCP:3000 -sTCP:LISTEN` 查看进程，停止旧进程或改用 `PORT=3001 npm start`。
- **`better-sqlite3` 原生模块报错**：多为 Node 版本与安装时不一致，执行 `npm rebuild better-sqlite3`，或切换到 Node 20/22 LTS 后重新 `npm install`。
- **后台登录 401**：确认已启动服务并登录；浏览器需允许本地 Cookie。
- **数据库恢复**：停止服务后，用备份文件替换 `data/yaoprint.db`，再启动即可。
- **上传图片 404**：确认 `public/uploads/` 存在且文件未被手动删除。

---

## 十一、当前 Git 备份范围

本仓库只备份网站源码与公开素材，不包含：

- `data/` 下的 SQLite 数据库（含客户与咨询数据）
- `public/uploads/` 后台上传文件
- `.env` 等环境配置
- 演示 PPT、教学资料、构建输出等本地工作文件

这些内容需在服务器或本地单独备份。
