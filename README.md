# 曜印 YAOPRINT — 3D 打印品牌官网与 CMS

曜印 YAOPRINT 的独立品牌官网，采用成熟的产品展示信息架构，同时保留独立的品牌、产品、文案与视觉体系。项目内置可运营的内容管理后台，前台展示内容可通过后台在线替换。

## 快速开始

```bash
# 安装依赖（首次执行）
npm install

# 仅首次初始化演示数据（会重置内容表，请勿在已有运营内容时执行）
npm run seed

# 启动本地站点
npm start
```

- 前台：[http://localhost:3000](http://localhost:3000)
- 后台：[http://localhost:3000/admin](http://localhost:3000/admin)
- 本地演示账号：`admin` / `admin123`

首次登录后，请在后台的“站点设置 → 修改管理员密码”中更新密码。生产环境应设置强随机的 `SESSION_SECRET` 环境变量。

## 后台内容覆盖范围

| 模块 | 可管理内容 |
| --- | --- |
| 首页轮播 | 标题、高亮文字、副标题、说明、按钮、排序、发布状态与背景图 |
| 产品与分类 | 产品信息、价格、状态、Hero 图、卡片图、详情图集、规格、颜色、套装及分类 |
| 新闻 | 标题、摘要、正文、封面图、标签、排序与发布状态 |
| 首页内容 | 应用场景、曜印学院、创作者视频、媒体评测、软件下载资源 |
| 客户信息 | 询价状态、询价记录、邮件订阅列表 |
| 全站设置 | 品牌名称、联系方式、工作时间、版权、ICP、社交链接和首页数据条 |
| 系统 | 管理员密码与受白名单保护的图片上传（jpg/png/webp/gif/svg，最大 5MB） |

所有新增或编辑完成后，刷新相应前台页面即可查看已发布内容。草稿与未发布的首页轮播、新闻不会在前台公开接口中返回。

## 技术栈与目录

- Node.js、Express、SQLite（`better-sqlite3`）
- 会话登录：`express-session` + `bcryptjs`
- 图片上传：`multer`，文件保存在 `public/uploads/`

```text
.
├── server.js              # Express 服务、前台 API、后台 API
├── db.js                  # SQLite 表结构、兼容迁移、默认设置与首页轮播
├── seed.js                # 演示数据初始化脚本
├── data/yaoprint.db       # 本地 SQLite 数据库（自动生成）
└── public/
    ├── index.html         # 首页
    ├── admin/index.html   # CMS 单页后台
    ├── css/style.css      # 前台样式
    ├── js/main.js         # 前台动态内容、设置、Hero 轮播
    └── uploads/           # 后台上传文件
```

## 主要 API

公开 API：`/api/products`、`/api/categories`、`/api/news`、`/api/heroes`、`/api/scenes`、`/api/academy`、`/api/videos`、`/api/reviews`、`/api/downloads`、`/api/settings`。

后台 API 均需登录，覆盖产品、新闻、分类、轮播、场景、学院、视频、评测、下载、询价、订阅、设置、密码与上传操作。
