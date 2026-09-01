// 曜印 YAOPRINT — 初始数据 (产品/新闻/评测/视频/场景/学社/下载/设置)
const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('⏳ 初始化种子数据…');

const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)')
    .run('admin', hash, '超级管理员', 'admin');
  console.log('  ✔ 创建后台账号 admin / admin123');
}

// 清空数据
['products','news','reviews','videos','scenes','academy','downloads','categories','settings']
  .forEach(t => db.prepare(`DELETE FROM ${t}`).run());

// 分类
const insCat = db.prepare('INSERT INTO categories (slug,name,sort) VALUES (?,?,?)');
const catIds = {};
[
  ['fdm', '桌面级 FDM', 1],
  ['pro', '工业级高速', 2],
  ['resin', '光固化', 3],
  ['filament', '打印耗材', 4],
].forEach(c => {
  const r = insCat.run(c[0], c[1], c[2]);
  catIds[c[0]] = r.lastInsertRowid;
});

// 产品
const insProd = db.prepare(`INSERT INTO products
  (slug, name, subtitle, category_id, tag, price, description, spec_json, image_svg, hero_image, card_image, gallery_json, colors_json, kits_json, sort)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const products = [
  {
    slug: 'r1', name: '曜印 R1', subtitle: '万千想象 一点灵光', tag: '新品', price: '¥?',
    cat: 'fdm', desc: '全新发布的桌面级迷你打印机,体积小巧但性能毫不妥协,将于 2026 年 9 月正式发布。',
    spec: { 技术: 'FDM 熔融沉积', 尺寸: '200×200×200 mm', 精度: '±0.1 mm', 速度: '500 mm/s' },
    hero: '/img/hero/r1.jpg', card: '/img/hero/r1.jpg', sort: 1
  },
  {
    slug: 'a2l', name: '曜印 A2L', subtitle: '创意无限大', tag: '新品', price: '¥3,499 起', cat: 'fdm',
    desc: '彩色触控大屏 + 全自动调平,2026 全新 A 系列旗舰,让多色打印成为日常。',
    spec: { 技术: 'FDM 多色', 尺寸: '256×256×256 mm', 精度: '±0.08 mm', 速度: '600 mm/s' },
    hero: '/img/hero/a2l.jpg', card: '/img/hero/a2l.jpg', sort: 2
  },
  {
    slug: 'x2d', name: '曜印 X2D', subtitle: '轻松出大作', tag: '新品', price: '¥5,999 起', cat: 'fdm',
    desc: '12 色料盒与超大幅面,大尺寸创意作品也能一气呵成,支持高速、高质量双模式。',
    spec: { 技术: 'FDM 多色 12 色', 尺寸: '350×350×350 mm', 精度: '±0.05 mm', 速度: '600 mm/s' },
    hero: '/img/hero/x2d.jpg', card: '/img/hero/x2d.jpg', sort: 3
  },
  {
    slug: 'h2c', name: '曜印 H2C', subtitle: '出色,无需妥协', tag: '新品', price: '¥9,999 起', cat: 'pro',
    desc: 'Vortek 多材料系统与工程级精度,让工业级手板验证与多材料打印变得触手可得。',
    spec: { 技术: 'FDM 工程级', 尺寸: '325×320×325 mm', 精度: '±0.04 mm', 速度: '1000 mm/s' },
    hero: '/img/hero/h2c.jpg', card: '/img/hero/h2c.jpg', sort: 4,
    gallery: ['/img/detail/h2c/banner.jpg', '/img/detail/h2c/h1.png', '/img/detail/h2c/h2.png', '/img/detail/h2c/h3.png', '/img/detail/h2c/h4.png', '/img/detail/h2c/h5.png', '/img/detail/h2c/h6.png', '/img/detail/h2c/h7.png']
  },
  {
    slug: 'p2s', name: '曜印 P2S', subtitle: '再一次,成为经典', tag: '新品', price: '¥3,999 起', cat: 'resin',
    desc: '8K 单色液晶屏,矢量光引擎,超高细节让手办、牙科、珠宝建模栩栩如生。',
    spec: { 技术: 'MSLA 光固化', 尺寸: '228×128×230 mm', 精度: '±0.01 mm', 速度: '60 mm/h' },
    hero: '/img/hero/p2s.jpg', card: '/img/hero/p2s.jpg', sort: 5,
    gallery: ['/img/detail/p2s/banner.jpg', '/img/detail/p2s/h1.jpg', '/img/detail/p2s/h2.jpg', '/img/detail/p2s/h3.jpg', '/img/detail/p2s/h4.jpg', '/img/detail/p2s/h5.jpg', '/img/detail/p2s/h6.jpg', '/img/detail/p2s/h7.jpg', '/img/detail/p2s/h8.jpg', '/img/detail/p2s/h9.jpg', '/img/detail/p2s/m1.jpg', '/img/detail/p2s/m2.jpg', '/img/detail/p2s/m3.jpg']
  },
  {
    slug: 'h2s', name: '曜印 H2S', subtitle: '你的个人智造中心', tag: '新品', price: '¥7,999 起', cat: 'pro',
    desc: '集成 3D 打印、激光雕刻、刀切与笔绘的多功能智造中心,一台设备,无限可能。',
    spec: { 技术: 'FDM 多功能', 尺寸: '325×320×325 mm', 精度: '±0.05 mm', 速度: '600 mm/s' },
    hero: '/img/hero/h2s.jpg', card: '/img/hero/h2s.jpg', sort: 6
  },
  {
    slug: 'h2d', name: '曜印 H2D', subtitle: '重新定义个人智造', tag: '新品', price: '¥11,999 起', cat: 'pro',
    desc: '融合 3D 打印、激光切割、笔绘、刀切与贴纸模切于一身,你的瑞士军刀智造中心。',
    spec: { 技术: 'FDM 多功能 5 合 1', 尺寸: '325×320×325 mm', 精度: '±0.05 mm', 速度: '600 mm/s' },
    hero: '/img/hero/h2d.jpg', card: '/img/hero/h2d.jpg', sort: 7,
    gallery: ['/img/detail/h2d/h1.jpg', '/img/detail/h2d/h2.jpg', '/img/detail/h2d/h3.jpg', '/img/detail/h2d/h4.jpg', '/img/detail/h2d/h5.jpg', '/img/detail/h2d/g1.jpg', '/img/detail/h2d/g2.jpg', '/img/detail/h2d/g3.jpg', '/img/detail/h2d/g4.jpg', '/img/detail/h2d/g5.jpg', '/img/detail/h2d/g6.jpg', '/img/detail/h2d/kv.jpg'],
    colors: [
      { name: '经典黑', hex: '#1a1a1a' },
      { name: '极地白', hex: '#f5f5f5' },
      { name: '钛灰', hex: '#6b6b6b' },
      { name: '曜金', hex: '#c8a96a' }
    ],
    kits: [
      { name: '标准版', price: '¥11,999', desc: '曜印 H2D 主机 + 基础切片软件 + 12 个月质保' },
      { name: '创作套装', price: '¥13,999', desc: '标准版 + AMS 多色料盒 + 4 卷 PLA + 收纳包' },
      { name: '工坊套装', price: '¥19,999', desc: '创作套装 + 激光模组 + 笔绘模组 + 刀切模组' }
    ]
  },
  {
    slug: 'a1', name: '曜印 A1', subtitle: '让多色打印成为标配', tag: '性价比', price: '¥2,499 起', cat: 'fdm',
    desc: '入门级全彩 FDM 打印机,4 色 AMS lite 色彩管理,易上手、好玩、不贵。',
    spec: { 技术: 'FDM 多色', 尺寸: '256×256×256 mm', 精度: '±0.1 mm', 速度: '500 mm/s' },
    hero: '/img/hero/a1.jpg', card: '/img/hero/a1.jpg', sort: 8,
    gallery: ['/img/detail/a1/banner.jpg', '/img/detail/a1/h1.jpg', '/img/detail/a1/h2.jpg', '/img/detail/a1/h3.jpg', '/img/detail/a1/h4.jpg', '/img/detail/a1/h5.jpg', '/img/detail/a1/h6.jpg', '/img/detail/a1/h7.jpg', '/img/detail/a1/comment1.jpg', '/img/detail/a1/comment2.jpg']
  },
  {
    slug: 'a1-mini', name: '曜印 A1 mini', subtitle: '3D 打印入门小钢炮', tag: '热销', price: '¥1,599 起', cat: 'fdm',
    desc: '极致紧凑的桌面尺寸,开学、租房、家用皆合适,小身板,大作为。',
    spec: { 技术: 'FDM 单色', 尺寸: '180×180×180 mm', 精度: '±0.1 mm', 速度: '500 mm/s' },
    hero: '/img/hero/a1mini.jpg', card: '/img/hero/a1mini.jpg', sort: 9
  },
  {
    slug: 'p1s', name: '曜印 P1S', subtitle: '全能生产力 3D 打印机', tag: '热销', price: '¥5,499 起', cat: 'pro',
    desc: '全封闭腔体 + AMS 多色支持 + 高速打印,被全球创作者称为全能生产力工具。',
    spec: { 技术: 'FDM 多色', 尺寸: '256×256×256 mm', 精度: '±0.05 mm', 速度: '500 mm/s' },
    hero: '/img/hero/p1s.jpg', card: '/img/hero/p1s.jpg', sort: 10,
    gallery: ['/img/detail/p1s/banner.jpg', '/img/detail/p1s/f1.png', '/img/detail/p1s/f2.png', '/img/detail/p1s/foot.png']
  },
];

// 打印机 SVG 插画
const svg = (type) => {
  if (type === 'mini') {
    return `<svg viewBox="0 0 220 220" fill="none">
      <rect x="34" y="188" width="152" height="18" rx="6" fill="#1a2340"/>
      <rect x="42" y="62" width="12" height="130" rx="4" fill="#1a2340"/>
      <rect x="166" y="62" width="12" height="130" rx="4" fill="#1a2340"/>
      <rect x="42" y="54" width="136" height="10" rx="5" fill="#00ae42"/>
      <rect x="66" y="72" width="88" height="6" rx="3" fill="#31406b"/>
      <rect x="100" y="68" width="22" height="20" rx="4" fill="#00ae42"/>
      <path d="M100 158h20v-14h8v-18H92v18h8Z" fill="#1aaf5d" opacity=".9"/>
    </svg>`;
  }
  if (type === 'enclosed') {
    return `<svg viewBox="0 0 220 220" fill="none">
      <rect x="40" y="26" width="140" height="172" rx="14" fill="#101a33" stroke="#2a3657" stroke-width="2"/>
      <rect x="52" y="40" width="96" height="106" rx="8" fill="#0a0f22" stroke="#31406b"/>
      <rect x="60" y="52" width="80" height="6" rx="3" fill="#31406b"/>
      <rect x="86" y="48" width="26" height="20" rx="4" fill="#00ae42"/>
      <path d="M84 122h26v-16h10v-24H74v24h10Z" fill="#1aaf5d"/>
      <rect x="58" y="126" width="86" height="9" rx="3" fill="#31406b"/>
      <rect x="52" y="160" width="58" height="22" rx="6" fill="#0a0f22" stroke="#31406b"/>
      <rect x="58" y="166" width="30" height="4" rx="2" fill="#00ae42"/>
      <rect x="58" y="173" width="20" height="4" rx="2" fill="#31406b"/>
      <circle cx="164" cy="171" r="6" fill="#00ae42"/>
    </svg>`;
  }
  if (type === 'resin') {
    return `<svg viewBox="0 0 220 220" fill="none">
      <rect x="52" y="24" width="116" height="174" rx="12" fill="#101a33" stroke="#2a3657" stroke-width="2"/>
      <rect x="64" y="38" width="92" height="34" rx="6" fill="#1c2748"/>
      <path d="M72 52h14M72 60h22" stroke="#00ae42" stroke-width="3" stroke-linecap="round"/>
      <rect x="128" y="46" width="20" height="16" rx="3" fill="#00ae42"/>
      <rect x="66" y="80" width="6" height="104" rx="3" fill="#31406b"/>
      <rect x="148" y="80" width="6" height="104" rx="3" fill="#31406b"/>
      <rect x="66" y="92" width="88" height="8" rx="4" fill="#00ae42"/>
      <rect x="88" y="100" width="44" height="8" rx="3" fill="#7c3aed"/>
      <rect x="70" y="158" width="80" height="26" rx="5" fill="#0a0f22" stroke="#31406b"/>
      <rect x="74" y="166" width="72" height="14" rx="3" fill="#7c3aed" opacity=".55"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 220 220" fill="none">
    <rect x="34" y="188" width="152" height="18" rx="6" fill="#1a2340"/>
    <rect x="42" y="52" width="12" height="140" rx="4" fill="#1a2340"/>
    <rect x="166" y="52" width="12" height="140" rx="4" fill="#1a2340"/>
    <rect x="42" y="44" width="136" height="10" rx="5" fill="#00ae42"/>
    <rect x="66" y="62" width="88" height="8" rx="4" fill="#31406b"/>
    <rect x="98" y="58" width="24" height="22" rx="4" fill="#00ae42"/>
    <path d="M96 168h28v-18h10v-22H86v22h10Z" fill="#1aaf5d"/>
    <rect x="52" y="172" width="116" height="9" rx="4" fill="#31406b"/>
  </svg>`;
};

products.forEach(p => {
  const type = p.cat === 'resin' ? 'resin' : (p.cat === 'pro' ? 'enclosed' : 'mini');
  insProd.run(p.slug, p.name, p.subtitle, catIds[p.cat], p.tag, p.price, p.desc,
    JSON.stringify(p.spec), svg(type), p.hero, p.card,
    JSON.stringify(p.gallery || []),
    JSON.stringify(p.colors || []),
    JSON.stringify(p.kits || []),
    p.sort);
});
console.log(`  ✔ 写入 ${products.length} 个产品`);

// 品牌新闻
const insNews = db.prepare(`INSERT INTO news (slug,title,summary,body,cover,tag,sort) VALUES (?,?,?,?,?,?,?)`);
const news = [
  { s: 'makegood', t: 'MakeGood 发布开源 3D 打印儿童移动训练椅,并在 MakerWorld 公开全部文件',
    d: '该开源项目让更多行动不便儿童获得个性化辅具,展示社区如何用 3D 打印改变生活。',
    b: '我们与社区伙伴一起,共同推动 3D 打印在公益领域的应用。MakeGood 团队发布的儿童移动训练椅,采用模块化设计,家长与治疗师可以根据孩子的成长调整尺寸,而所有打印文件均免费开放下载。',
    c: '/img/scenes/diy.jpg', tag: '社区', sort: 1 },
  { s: 'h2c-vortek', t: '曜印 H2C:多材料 Vortek 系统与工程精度的全新结合',
    d: '全新多材料 Vortek 系统支持 8 种工程材料热切换,大幅减少更换耗材的时间损耗。',
    b: 'H2C 重新定义了多材料打印的可能性,从前需要 30 分钟的换料动作,现在只需 5 秒即可完成。',
    c: '/img/hero/h2c.jpg', tag: '产品', sort: 2 },
  { s: 'seagrass', t: '曜印支持英国初创团队建造海草收割机,助力修复海底生态',
    d: '为环保团队提供设备与技术支持,3D 打印正在成为环保科技的重要工具。',
    b: '海草床是海洋生态系统的重要基础,但全球海草正以惊人速度消失。该项目通过 3D 打印定制零件,大幅降低了海草修复装置的研发与制造成本。',
    c: '/img/scenes/utility.jpg', tag: '环保', sort: 3 },
  { s: 'farm-manager', t: '本地集群管理:曜印 Farm Manager 让工坊效率翻倍',
    d: '在断网环境下统一管理 50 台设备,任务队列、切片、远程监控一站式完成。',
    b: 'Farm Manager 是面向工坊与教室的集群管理工具,支持断网环境下的本地部署。',
    c: '/img/quick/printer.jpg', tag: '软件', sort: 4 },
  { s: 'letsmakeit', t: "Let's Make It 创造基金:最高 30 万美元激励,让伟大创造成真",
    d: '面向全球创作者的资助计划,寻找用 3D 打印改变世界的你。',
    b: '我们相信创造的力量,创造基金致力于资助有意义的项目。', c: '/img/hero/letsmakeit.jpg', tag: '活动', sort: 5 },
];
news.forEach(n => insNews.run(n.s, n.t, n.d, n.b, n.c || '', n.tag, n.sort));
console.log(`  ✔ 写入 ${news.length} 条新闻`);

// 媒体评测
const insRv = db.prepare('INSERT INTO reviews (source,title,excerpt,url,cover,sort) VALUES (?,?,?,?,?,?)');
[
  ['The Verge', '曜印 H2D 不只是一台更大的 3D 打印机,它还是激光切割、笔绘和 Cricut 的对手',
    '曜印 H2D 把 3D 打印、激光雕刻、刀切和笔绘四合一,是你自己的个人制造中心。',
    'https://www.theverge.com/', '/img/hero/h2d.jpg', 1],
  ['The Independent', '曜印 H2D 3D 打印机评测:你自己的个人制造中心',
    '将创作者们喜爱的 3D 打印、激光雕刻、刀切与笔绘集于一体,堪称个人智造的瑞士军刀。',
    'https://www.independent.co.uk/', '/img/hero/h2d.jpg', 2],
  ['TechRadar', '曜印 H2S 3D 打印机评测:大尺寸单喷头的全新高度',
    '封闭腔体让它能打印工程材料,而不只是 PLA。', 'https://www.techradar.com/', '/img/hero/h2s.jpg', 3],
  ["Tom's Hardware", '曜印 P2S 评测:经典再次进化', '上手简单、设置容易,无论新手还是农场主都值得拥有。',
    'https://www.tomshardware.com/', '/img/hero/p2s.jpg', 4],
].forEach(r => insRv.run(...r));
console.log('  ✔ 写入 4 条媒体评测');

// 视频评测
const insV = db.prepare('INSERT INTO videos (title,source,url,cover,sort) VALUES (?,?,?,?,?)');
const vids = [
  ['I Tested the 曜印 H2D – And It’s More Than I Expected', 'YouTube', '#', '/img/videos/c1.jpg', 1],
  ['My Thoughts on the 曜印 H2C After 500 Hours of Testing', 'YouTube', '#', '/img/videos/c2.jpg', 2],
  ['The 曜印 H2C Changes Everything - For Better or Worse', 'YouTube', '#', '/img/videos/c3.jpg', 3],
  ['曜印 P2S | Der beste 3D-Drucker jetzt noch BESSER?!', 'YouTube', '#', '/img/videos/c4.jpg', 4],
  ['Is 曜印’s H2S truly a H2D Lite or just a bigger X1C?', 'YouTube', '#', '/img/videos/c5.jpg', 5],
  ['曜印Lab H2C Full In-Depth Review: Extensive Tests vs SnapMaker U1, Prusa XL', 'YouTube', '#', '/img/videos/c6.jpg', 6],
  ['曜印 CUTTER & PLOTTER Review - The Secret Reason This Upgrade Is Genius', 'YouTube', '#', '/img/videos/c7.jpg', 7],
  ['Is 曜印’s NEW H2C Tool-Changer printer a REAL game-changer?', 'YouTube', '#', '/img/videos/c8.jpg', 8],
];
vids.forEach(v => insV.run(...v));
console.log('  ✔ 写入 8 条视频');

// 应用场景
const insSc = db.prepare('INSERT INTO scenes (title,desc,icon,link,cover,sort) VALUES (?,?,?,?,?,?)');
[
  ['爱好 & DIY', '定制化设计,满足个性爱好', '✦', 'explore/inspirations/hobby-diy.html', '/img/scenes/diy.jpg', 1],
  ['实用主义', '打你所需,让生活更美好', '✧', 'explore/inspirations/utility.html', '/img/scenes/utility.jpg', 2],
  ['STEAM 教育', '寓教于乐,激发无限潜能', '✪', 'explore/inspirations/steam-education.html', '/img/scenes/education.jpg', 3],
  ['艺术 & 时尚', '用 3D 打印丰富未来美学', '✺', 'explore/inspirations/art-fashion.html', '/img/scenes/art.jpg', 4],
].forEach(s => insSc.run(...s));
console.log('  ✔ 写入 4 个应用场景');

// 学社
const insAc = db.prepare('INSERT INTO academy (title,desc,icon,link,cover,sort) VALUES (?,?,?,?,?,?)');
[
  ['新手入门?从这里启航', '从 0 到 1 进阶 3D 打印', '📘', 'support/academy.html', '/img/cards/academy.jpg', 1],
  ['免费优质模型', '百万级模型社区 MakerWorld', '🎨', '#makerworld', '/img/cards/models.jpg', 2],
  ['为项目选择合适的耗材', '原厂耗材,一站购齐', '🧵', 'filament/collections.html', '/img/cards/filament.jpg', 3],
].forEach(a => insAc.run(...a));
console.log('  ✔ 写入 3 个学社卡片');

// 下载
const insDl = db.prepare('INSERT INTO downloads (name,platform,size,version,url,sort) VALUES (?,?,?,?,?,?)');
[
  ['曜印 Studio (Windows)', 'Windows', '180 MB', 'v2.1.0', '#', 1],
  ['曜印 Studio (macOS)', 'macOS', '190 MB', 'v2.1.0', '#', 2],
  ['曜印 Studio (Linux)', 'Linux', '170 MB', 'v2.1.0', '#', 3],
  ['曜印 Handy (iOS)', 'iOS', '85 MB', 'v3.0.2', '#', 4],
  ['曜印 Handy (Android)', 'Android', '60 MB', 'v3.0.2', '#', 5],
  ['曜印 Suite', '全平台', '在线服务', 'v1.0', '#', 6],
].forEach(d => insDl.run(...d));
console.log('  ✔ 写入 6 个下载');

// 设置
const insSt = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
const settings = {
  site_name: '曜印 YAOPRINT',
  site_tagline: '让每一个创意即刻成为实物',
  contact_email: 'hello@yaoprint.com',
  contact_phone: '400-123-4567',
  contact_address: '深圳市南山区高新南一道 88 号',
  icp: '粤ICP备2021138226号-2',
  copyright: '© 2026 曜印科技有限公司 · 曜印 YAOPRINT 版权所有',
  social_wechat: '#',
  social_weibo: '#',
  social_bilibili: '#',
  social_douyin: '#',
  social_youtube: '#',
};
Object.entries(settings).forEach(([k, v]) => insSt.run(k, v));
console.log('  ✔ 写入站点设置');

console.log('✅ 种子数据完成');
