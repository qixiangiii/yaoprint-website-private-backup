// 设备库种子数据：市面主流教育/桌面 3D 打印机（参数以各品牌官方页面为准，更新于 2026-10）
const db = require('./db');

const PRINTERS = [
  {
    slug: 'bambu-lab-a1-mini', name: 'A1 mini', brand: '拓竹 Bambu Lab', category: 'FDM 桌面级',
    tagline: '小体积全Auto，宿舍与家庭桌面的多色入门首选',
    image: '/img/education/gen-first-layer.jpg',
    price_text: '约 ¥1,599 起', price_num: 1599,
    build_volume: '180 × 180 × 180 mm', build_volume_l: 5.8,
    max_speed: 500, max_accel: 10000, nozzle_temp: 300, bed_temp: 100, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU / ABS / ASA',
    bed_type: 'PEI 纹理弹簧钢板', leveling: '全自动调平（共振补偿）',
    connectivity: 'Wi-Fi / USB / 蓝牙（App 远程）', screen: '3.5 英寸触摸屏',
    camera: '1', multi_color: 'AMS lite 最多 4 色', noise: '≤ 48 dB', weight: '5.5 kg',
    slicer: 'Bambu Studio（兼容 OrcaSlicer）',
    highlights_json: ['全自动调平免折腾', 'AMS lite 四色打印', 'App 远程监控带摄像头', '静音适合教室'],
    specs_json: { '打印精度': '±0.1 mm', '喷头结构': '一体化快拆喷嘴', '平台最高温': '100℃', '断电续打': '支持', '官方质保': '1 年' },
    official_url: 'https://www.bambulab.com', source_label: 'Bambu Lab 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', featured: 1, sort: 1
  },
  {
    slug: 'bambu-lab-a1', name: 'A1', brand: '拓竹 Bambu Lab', category: 'FDM 桌面级',
    tagline: '256 立方成型空间 + 多色，课堂项目的主力桌面机',
    image: '/img/education/gen-classroom-printing.jpg',
    price_text: '约 ¥2,699 起', price_num: 2699,
    build_volume: '256 × 256 × 256 mm', build_volume_l: 16.8,
    max_speed: 500, max_accel: 10000, nozzle_temp: 300, bed_temp: 100, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU / ABS / ASA / PA（需硬化喷嘴）',
    bed_type: 'PEI 纹理弹簧钢板', leveling: '全自动调平（共振补偿）',
    connectivity: 'Wi-Fi / USB / 蓝牙', screen: '3.5 英寸触摸屏',
    camera: '1', multi_color: 'AMS lite 最多 4 色', noise: '≤ 48 dB', weight: '8.3 kg',
    slicer: 'Bambu Studio（兼容 OrcaSlicer）',
    highlights_json: ['256mm 立方成型空间', 'AMS lite 四色打印', '全自动化程度高', '社团课批量出件快'],
    specs_json: { '打印精度': '±0.1 mm', '喷头结构': '一体化快拆喷嘴', '断电续打': '支持', '官方质保': '1 年' },
    official_url: 'https://www.bambulab.com', source_label: 'Bambu Lab 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', featured: 1, sort: 2
  },
  {
    slug: 'bambu-lab-p1s', name: 'P1S', brand: '拓竹 Bambu Lab', category: 'FDM 封闭机箱',
    tagline: '封闭机箱 + 高速多色，ABS/ASA 工程材料教学友好',
    image: '/img/education/gen-industrial.jpg',
    price_text: '约 ¥4,299 起', price_num: 4299,
    build_volume: '256 × 256 × 256 mm', build_volume_l: 16.8,
    max_speed: 500, max_accel: 20000, nozzle_temp: 300, bed_temp: 110, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / ABS / ASA / PC / PA / 碳纤增强（硬化钢喷嘴）',
    bed_type: 'PEI 纹理板 / 光面可选', leveling: '全自动调平',
    connectivity: 'Wi-Fi / 有线网络 / USB', screen: '2.7 英寸按键屏',
    camera: '1', multi_color: 'AMS 最多 16 色', noise: '≤ 56 dB', weight: '12.35 kg',
    slicer: 'Bambu Studio（兼容 OrcaSlicer）',
    highlights_json: ['封闭机箱打 ABS/ASA 不翘边', 'AMS 最多 16 色', '20000mm/s² 加速度', '适合工程材料课程'],
    specs_json: { '打印精度': '±0.1 mm', '机箱': '全封闭 + 玻璃门', '空气过滤': '可选活性炭', '断电续打': '支持' },
    official_url: 'https://www.bambulab.com', source_label: 'Bambu Lab 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', featured: 1, sort: 3
  },
  {
    slug: 'bambu-lab-x1-carbon', name: 'X1 Carbon', brand: '拓竹 Bambu Lab', category: 'FDM 封闭机箱',
    tagline: '激光雷达自动校准，面向竞赛与工程项目的旗舰',
    image: '/img/education/gen-cad-modeling.jpg',
    price_text: '约 ¥7,999 起', price_num: 7999,
    build_volume: '256 × 256 × 256 mm', build_volume_l: 16.8,
    max_speed: 500, max_accel: 20000, nozzle_temp: 300, bed_temp: 110, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / ABS / ASA / PC / PA / 碳纤 / 玻纤增强',
    bed_type: 'PEI 纹理板 / 高温板', leveling: '激光雷达全自动校准',
    connectivity: 'Wi-Fi / 有线网络 / USB', screen: '5 英寸彩色触摸屏',
    camera: '1', multi_color: 'AMS 最多 16 色', noise: '≤ 56 dB', weight: '14.5 kg',
    slicer: 'Bambu Studio（兼容 OrcaSlicer）',
    highlights_json: ['激光雷达流量/振纹自动校准', '硬化钢喷嘴直接打碳纤', '5 英寸触屏 + AI 失败检测', '竞赛集训队常用'],
    specs_json: { '打印精度': '±0.1 mm', 'AI 功能': ' spaghetti 检测 / 自动暂停', '机箱': '全封闭', '断电续打': '支持' },
    official_url: 'https://www.bambulab.com', source_label: 'Bambu Lab 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 4
  },
  {
    slug: 'creality-ender-3-v3-ke', name: 'Ender-3 V3 KE', brand: '创想三维 Creality', category: 'FDM 桌面级',
    tagline: '经典 Ender 系列高速版，预算有限的机房装机量选择',
    image: '/img/education/gen-remove-print.jpg',
    price_text: '约 ¥1,299 起', price_num: 1299,
    build_volume: '220 × 220 × 240 mm', build_volume_l: 11.6,
    max_speed: 500, max_accel: 8000, nozzle_temp: 260, bed_temp: 100, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU / ABS',
    bed_type: 'PEI 弹簧钢板', leveling: '自动调平（16 点）',
    connectivity: 'Wi-Fi / USB', screen: '4.3 英寸触摸屏',
    camera: '0', multi_color: '0', noise: '≤ 55 dB', weight: '7.8 kg',
    slicer: 'Creality Print（兼容 Cura / OrcaSlicer）',
    highlights_json: ['性价比高适合批量装机', ' sprites 挤出机响应快', '社区教程资源极多'],
    specs_json: { '打印精度': '±0.1 mm', '龙门结构': 'XZ 轴直线导轨', '断电续打': '支持', '官方质保': '1 年' },
    official_url: 'https://www.creality.com', source_label: 'Creality 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 5
  },
  {
    slug: 'creality-k1c', name: 'K1C', brand: '创想三维 Creality', category: 'FDM 封闭机箱',
    tagline: '封闭高速 + 碳纤直打，国产封闭机箱的实力派',
    image: '/img/education/gen-teacher-guiding.jpg',
    price_text: '约 ¥2,999 起', price_num: 2999,
    build_volume: '220 × 220 × 250 mm', build_volume_l: 12.1,
    max_speed: 600, max_accel: 20000, nozzle_temp: 300, bed_temp: 100, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / ABS / ASA / PA / 碳纤增强',
    bed_type: 'PEI 纹理板', leveling: '全自动调平',
    connectivity: 'Wi-Fi / USB / 有线网络', screen: '4.3 英寸触摸屏',
    camera: '1', multi_color: 'CFS 最多 4 色（可选）', noise: '≤ 55 dB', weight: '12.6 kg',
    slicer: 'Creality Print（兼容 OrcaSlicer）',
    highlights_json: ['600mm/s 高速打印', '硬化喷嘴直打碳纤维', '封闭机箱 + 内置摄像头', 'AI 打印失败检测'],
    specs_json: { '打印精度': '±0.1 mm', '预热': '35 秒升温至 300℃', '断电续打': '支持' },
    official_url: 'https://www.creality.com', source_label: 'Creality 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 6
  },
  {
    slug: 'elegoo-neptune-4-pro', name: 'Neptune 4 Pro', brand: '爱乐酷 ELEGOO', category: 'FDM 桌面级',
    tagline: '高速入门守门员，创客社团批量采购热门',
    image: '/img/education/gen-group-showcase.jpg',
    price_text: '约 ¥1,499 起', price_num: 1499,
    build_volume: '225 × 225 × 265 mm', build_volume_l: 13.4,
    max_speed: 500, max_accel: 8000, nozzle_temp: 300, bed_temp: 110, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU / ABS / ASA / PA',
    bed_type: 'PEI 纹理板', leveling: '36 点自动调平',
    connectivity: 'Wi-Fi / USB', screen: '4.3 英寸竖屏',
    camera: '0', multi_color: '0', noise: '≤ 55 dB', weight: '8.0 kg',
    slicer: 'Elegoo Cura（兼容 OrcaSlicer）',
    highlights_json: ['300℃ 高温喷头可打尼龙', '36 点调平精度好', '竖屏操作顺手', '入门价打工程材料'],
    specs_json: { '打印精度': '±0.1 mm', '散热': '模型 + 腔体双风扇', '断电续打': '支持' },
    official_url: 'https://www.elegoo.com', source_label: 'ELEGOO 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 7
  },
  {
    slug: 'anycubic-kobra-3', name: 'Kobra 3', brand: '纵维立方 Anycubic', category: 'FDM 桌面级',
    tagline: 'ACE Pro 主动烘干多色，梅雨季教学出件稳定',
    image: '/img/education/gen-filament-rack.jpg',
    price_text: '约 ¥2,199 起', price_num: 2199,
    build_volume: '250 × 250 × 260 mm', build_volume_l: 16.25,
    max_speed: 600, max_accel: 20000, nozzle_temp: 300, bed_temp: 110, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU / ABS / ASA / PA',
    bed_type: 'PEI 纹理弹簧钢板', leveling: 'LeviQ 3.0 自动调平',
    connectivity: 'Wi-Fi / USB', screen: '4.3 英寸触摸屏',
    camera: '1', multi_color: 'ACE Pro 最多 8 色（带烘干）', noise: '≤ 55 dB', weight: '11 kg',
    slicer: 'Anycubic Slicer（兼容 OrcaSlicer）',
    highlights_json: ['ACE Pro 八色 + 主动烘干', '600mm/s 高速', '250mm 大平台', '潮湿环境出件稳定'],
    specs_json: { '打印精度': '±0.1 mm', '烘干': '55℃ 主动烘干', '断电续打': '支持' },
    official_url: 'https://www.anycubic.com', source_label: 'Anycubic 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 8
  },
  {
    slug: 'elegoo-mars-5-ultra', name: 'Mars 5 Ultra', brand: '爱乐酷 ELEGOO', category: 'LCD 光固化',
    tagline: '9K 高精度光固化，细节控与微缩模型课代表',
    image: '/img/education/gen-finishing.jpg',
    price_text: '约 ¥1,999 起', price_num: 1999,
    build_volume: '153.4 × 87 × 165 mm', build_volume_l: 2.2,
    max_speed: 150, max_accel: 0, nozzle_temp: 0, bed_temp: 0, min_layer: 0.01,
    filament_diameter: '—（405nm 光敏树脂）', materials: '标准 / 水洗 / 类 ABS / 牙模树脂',
    bed_type: '激光雕刻纹理平台', leveling: '一键自动调平',
    connectivity: 'Wi-Fi / USB', screen: '4 英寸彩色触摸屏',
    camera: '1', multi_color: '0', noise: '≤ 45 dB', weight: '7.3 kg',
    slicer: 'ChituBox / Voxeldance Tango',
    highlights_json: ['9K 超高分辨率细节锐利', 'AI 摄像头检测脱落', '内置空气净化', '微缩/手办课程适用'],
    specs_json: { '光学分辨率': '18×24μm', '曝光技术': 'COB + 菲涅尔透镜', '打印精度': '±0.02 mm', '后处理': '需清洗固化（酒精/清洗机）' },
    official_url: 'https://www.elegoo.com', source_label: 'ELEGOO 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 9
  },
  {
    slug: 'anycubic-photon-mono-4', name: 'Photon Mono 4', brand: '纵维立方 Anycubic', category: 'LCD 光固化',
    tagline: '10K 入门光固化，珠宝/牙科原型课程的经济选择',
    image: '/img/education/gen-multicolor-parts.jpg',
    price_text: '约 ¥1,599 起', price_num: 1599,
    build_volume: '153 × 87 × 165 mm', build_volume_l: 2.2,
    max_speed: 120, max_accel: 0, nozzle_temp: 0, bed_temp: 0, min_layer: 0.01,
    filament_diameter: '—（405nm 光敏树脂）', materials: '标准 / 水洗 / 高韧 / 耐高温树脂',
    bed_type: '纹理平台板', leveling: '一键自动调平',
    connectivity: 'USB', screen: '3.5 英寸触摸屏',
    camera: '0', multi_color: '0', noise: '≤ 45 dB', weight: '6.7 kg',
    slicer: 'Anycubic Photon Workshop',
    highlights_json: ['10K 分辨率入门价', '换屏成本低维护简单', '适合小件精细课程'],
    specs_json: { '光学分辨率': '17×17μm', '打印精度': '±0.02 mm', '后处理': '需清洗固化' },
    official_url: 'https://www.anycubic.com', source_label: 'Anycubic 官方产品页', verified_at: '2026-10',
    relationship: '第三方品牌，仅作教学选型参考', sort: 10
  },
  {
    slug: 'qiyuan-classroom-station', name: '星启教学工作站（示例）', brand: '起元星启', category: 'FDM 教育机型',
    tagline: '面向校本课程的教学机型示例位，可在后台替换为实际合作机型',
    image: '/img/education/gen-whiteboard.jpg',
    price_text: '按方案报价', price_num: 0,
    build_volume: '220 × 220 × 250 mm', build_volume_l: 12.1,
    max_speed: 300, max_accel: 5000, nozzle_temp: 260, bed_temp: 100, min_layer: 0.05,
    filament_diameter: '1.75mm', materials: 'PLA / PETG / TPU',
    bed_type: '可拆 PEI 钢板', leveling: '自动调平',
    connectivity: 'Wi-Fi / USB', screen: '4.3 英寸触摸屏',
    camera: '1', multi_color: '0', noise: '≤ 50 dB', weight: '9 kg',
    slicer: '兼容 OrcaSlicer / Cura',
    highlights_json: ['参数占位示例', '后台可编辑替换', '用于学校方案演示'],
    specs_json: { '备注': '示例数据，请在后台完善为实际机型参数' },
    official_url: '', source_label: '站内示例', verified_at: '2026-10',
    relationship: '自有/合作品牌', featured: 1, sort: 11
  }
];

const cols = Object.keys(PRINTERS[0]);
for (const p of PRINTERS) for (const c of cols) if (!(c in p)) p[c] = (c === 'featured' || c === 'sort' || c.endsWith('_num') || c.endsWith('_l')) ? 0 : '';
const insert = db.prepare(`INSERT INTO printers (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
const count = db.prepare('SELECT COUNT(*) c FROM printers').get().c;
if (count === 0) {
  const tx = db.transaction(() => { for (const p of PRINTERS) insert.run(...cols.map(c => { const v = p[c]; return typeof v === 'object' && v !== null ? JSON.stringify(v) : v; })); });
  tx();
  console.log('seeded', PRINTERS.length, 'printers');
} else {
  console.log('printers table already has', count, 'rows, skip seeding');
}
