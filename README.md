# 曜印 YAOPRINT — 3D 打印机品牌官网 (前台 + 后台)

> 完全复刻 [Bambu Lab 拓竹科技](https://bambulab.com/zh) 风格与信息架构,使用中文品牌"**曜印 YAOPRINT**"。
> 采用 Node.js + Express + SQLite,双击即开、零数据库依赖。

## ✨ 包含页面

### 前台 (10 个页面)
- `index.html` — 首页(Hero 轮播 / 数据条 / 产品 / 场景 / 学社 / 评测 / 新闻 / 订阅)
- `products.html` — 产品中心(分类筛选 + 参数对比)
- `product.html?slug=r1` — 产品详情(参数 + 图)
- `compare.html` — 产品参数对比表
- `filament.html` — 打印耗材
- `explore.html` — 探索(应用场景)
- `solutions.html` — 行业应用 + 案例
- `software.html` — 软件生态(切片 / Handy / Farm Manager)+ 下载中心
- `support.html` — 支持与服务
- `about.html` — 关于我们(品牌故事 / 发展历程)
- `contact.html` — 联系我们(联系信息 + 询价表单)
- `news.html` & `news.html?slug=xxx` — 新闻列表 / 详情

### 后台 (1 个 SPA)
- `/admin` — 后台管理:登录 / 仪表盘 / 产品 / 新闻 / 询价 / 订阅 / 设置

## 🚀 快速开始

```bash
# 1. 安装依赖 (首次)
npm install

# 2. 初始化种子数据(创建管理员账号 + 演示产品/新闻/评测)
npm run seed

# 3. 启动站点
npm start

# 浏览器打开
# 前台: http://localhost:3000
# 后台: http://localhost:3000/admin
```

## 🔐 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin123` | 超级管理员 |

> ⚠️ 首次登录后请在「站点设置」中修改密码(可在后台 user 表替换 bcrypt 哈希)。

## 📁 目录结构

```
.
├── server.js            # Express 服务器 (静态资源 + API + 后台)
├── db.js                # SQLite 连接与建表
├── seed.js              # 种子数据(产品/新闻/评测/场景/下载/设置)
├── package.json
├── data/
│   └── yaoprint.db      # SQLite 数据库 (自动生成)
└── public/              # 前台 + 后台静态资源
    ├── index.html       # 前台首页
    ├── products.html / product.html / compare.html
    ├── filament.html / explore.html / solutions.html
    ├── software.html / support.html / about.html
    ├── contact.html / news.html
    ├── css/style.css    # 前台样式 (Manrope + 绿/黑主色)
    ├── js/main.js       # 前台交互(轮播/筛选/动效/订阅)
    ├── uploads/         # 后台上传文件目录
    └── admin/index.html # 后台 SPA
```

## 🛠 后台功能

- **仪表盘** — 产品/新闻/询价/订阅数量统计,最近询价列表
- **产品管理** — 新增/编辑/删除产品、分类、规格、价格、SVG 插画
- **新闻管理** — 增删改查文章,可设置标签与摘要
- **客户询价** — 自动收集联系表单,可标记"新询价/已联系/已完成"
- **邮件订阅** — 订阅邮箱列表,前台订阅直接入库
- **站点设置** — 站点名称、联系方式、ICP、版权等可在线修改

## 📡 API 列表

### 前台 (公开)
- `GET  /api/products` — 产品列表
- `GET  /api/products/:slug` — 产品详情
- `GET  /api/categories` — 分类
- `GET  /api/news?limit=20` — 新闻列表
- `GET  /api/news/:slug` — 新闻详情
- `GET  /api/reviews` — 媒体评测
- `GET  /api/videos` — KOL 视频
- `GET  /api/scenes` — 应用场景
- `GET  /api/academy` — 学社卡片
- `GET  /api/downloads` — 下载中心
- `GET  /api/settings` — 站点设置
- `POST /api/leads` — 提交询价
- `POST /api/subs` — 邮件订阅

### 后台 (需登录)
- `POST /api/admin/login` — 登录
- `POST /api/admin/logout` — 登出
- `GET  /api/admin/me` — 当前用户
- `GET  /api/admin/stats` — 统计
- `GET/POST/PUT/DELETE /api/admin/products[/:id]`
- `GET/POST/PUT/DELETE /api/admin/news[/:id]`
- `GET/PUT/DELETE /api/admin/leads[/:id]`
- `GET  /api/admin/subs`
- `PUT  /api/admin/settings`
- `POST /api/admin/upload` — 上传图片

## 🎨 设计参考

完整复刻 https://bambulab.com/zh 的:
- 顶部固定导航 + 极简品牌 logo
- Hero 轮播(大字号标题 + 绿色强调)
- 数据统计条(深色)
- 三大品类(3D 打印机 / 耗材 / 软件)
- 应用场景四宫格
- 媒体评价 / KOL 视频墙
- 品牌新闻 (1 大 + 多小)
- 邮件订阅(同意条款复选框)
- 深色页脚 + 多列链接

## 📝 部署

```bash
# 自定义端口
PORT=8080 npm start

# PM2 守护
pm2 start server.js --name yaoprint
```

## License

MIT
