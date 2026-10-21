// 起元星启原创课纲。教学节奏参考行业常见的「先出件再创造、项目制、学科联动」路径，
// 课名、项目与文案均为本站原创，不构成与任何第三方品牌的官方课程合作。
const DISCLAIMER = '本课纲为起元星启原创教学设计，参考公开可见的项目制建模教学节奏编写；第三方品牌、软件与模型平台的商标归其权利人所有，本站不镜像其课包或模型文件。';

const juniorFoundation = {
  code: 'JH-3D-01',
  slug: 'junior-3d-foundation',
  title: '3D 建模与打印基础',
  subtitle: '先摸到作品，再学会把想法做成模型',
  category: '基础入门',
  grade_min: 7,
  grade_max: 9,
  target_audience: '零基础或只接触过积木、手工的学习者',
  level: '简单',
  delivery_mode: 'offline',
  total_sessions: 12,
  total_hours: 24,
  price_text: '课程咨询',
  description: '从安全出件建立成就感，再学积木式建模、改模型、切片与生活物件设计，最后完成一件可活动的小机构和课堂展示。每课都有看得见的成果，强调安全、尺寸意识和动手迭代。',
  seo_title: '3D 建模与打印基础课｜起元星启',
  seo_description: '12 课 24 课时：安全出件、积木式建模、切片、生活物件与简单机构，完成可展示的三维作品。',
  cover: '/img/education/course-junior-modeling.webp',
  gallery: ['/img/education/course-junior-modeling.webp', '/img/education/robotic-fair-01.webp'],
  sort: 1,
  outcomes: [
    '能独立完成一次安全的课堂出件',
    '掌握积木式建模的组合、对齐与简单布尔',
    '读懂层高、填充、支撑等基础切片参数',
    '完成姓名牌、收纳件、支架等生活物件',
    '做出一件带卡扣或旋转结构的小机构',
    '能用照片和简短说明介绍自己的作品'
  ],
  syllabus: [
    { session: 1, stage: '认识与出件', title: '走进三维课堂：打印机、材料与安全', project: '观察层纹样件，完成安全三原则卡片', hours: 2, skill: '安全与观察', software: '无需建模', print: '教师演示出件，学生触摸层纹' },
    { session: 2, stage: '认识与出件', title: '第一次出件：从现成模型到可触摸成果', project: '课堂小徽章 / 姓名吊牌首打', hours: 2, skill: '流程体验', software: '切片软件（教师带练）', print: '20–40 分钟可见小件' },
    { session: 3, stage: '建模基础', title: '空间坐标与几何体：长宽高如何变成实体', project: '积木姓名牌 1.0', hours: 2, skill: '空间思维', software: '积木式建模', print: '姓名牌草模' },
    { session: 4, stage: '建模基础', title: '积木式建模：组合、对齐与布尔运算', project: '桌面笔筒 / 收纳盒', hours: 2, skill: '实体组合', software: '积木式建模', print: '收纳盒主体' },
    { session: 5, stage: '建模基础', title: '从下载到改模型：尺寸、文字与个性化', project: '校园徽章改版', hours: 2, skill: '改模型', software: '积木式建模 + 第三方模型灵感跳转', print: '个性化徽章' },
    { session: 6, stage: '建模基础', title: '切片与层纹：层高、填充、支撑怎么选', project: '切片对比样件（密实 / 中空 / 有支撑）', hours: 2, skill: '切片判断', software: '切片软件', print: '对比样条' },
    { session: 7, stage: '生活项目', title: '生活物件：功能、尺寸与装配间隙', project: '手机或平板支架', hours: 2, skill: '尺寸意识', software: '积木式建模', print: '支架并实测角度' },
    { session: 8, stage: '生活项目', title: '浮雕与图案：把平面图形变成可打印表面', project: '浮雕小夜灯罩 / 书签', hours: 2, skill: '浮雕造型', software: '积木式建模', print: '灯罩或书签' },
    { session: 9, stage: '机构与展示', title: '简单机构：旋转、卡扣与可活动结构', project: '指尖陀螺或关节钥匙扣', hours: 2, skill: '机构直觉', software: '积木式建模', print: '可转动小件' },
    { session: 10, stage: '机构与展示', title: '分类与收纳：斜面、滑道与分拣逻辑', project: '桌面分拣盒 / 硬币滑道', hours: 2, skill: '功能逻辑', software: '积木式建模', print: '分拣盒并测试' },
    { session: 11, stage: '机构与展示', title: '作品迭代：根据打印问题改模型', project: '自选作品第二版', hours: 2, skill: '失败复盘', software: '建模 + 切片', print: '迭代件' },
    { session: 12, stage: '机构与展示', title: '展示与表达：说明、照片与课堂答辩', project: '个人作品集与一分钟介绍', hours: 2, skill: '表达', software: '作品记录表', print: '精修件展示' }
  ]
};

const juniorStem = {
  code: 'JH-3D-02',
  slug: 'junior-stem-modeling',
  title: '学科融合三维课',
  subtitle: '把数学、地理、生物里的抽象概念做成可触摸教具',
  category: '普通进阶',
  grade_min: 7,
  grade_max: 9,
  target_audience: '已完成基础入门或有简单建模经验的学习者',
  level: '普通',
  delivery_mode: 'offline',
  total_sessions: 8,
  total_hours: 16,
  price_text: '课程咨询',
  description: '在会建模、会出件之后，用三维作品服务课堂学科：立体几何教具、地形与等高线、细胞结构简化模型、公开领域纹样。训练的是「把概念翻译成可打印结构」，而不是堆砌装饰件。',
  seo_title: '学科融合 3D 建模课｜起元星启',
  seo_description: '8 课：立体几何、地形等高线、生物结构与公开领域造型，把学科概念做成可打印教具。',
  cover: '/img/education/case-creative-project.webp',
  gallery: ['/img/education/case-creative-project.webp', '/img/education/course-junior-modeling.webp'],
  sort: 2,
  outcomes: [
    '能把几何概念转成可拆装教具',
    '理解比例、剖面与简化建模',
    '完成一件服务课堂讲解的学科模型',
    '用作品说明概念，而不是只展示外形'
  ],
  syllabus: [
    { session: 1, stage: '几何可视化', title: '立体几何教具：截面、展开与组合体', project: '可拆装正方体 / 棱柱截面盒', hours: 2, skill: '几何表达', software: '积木式建模', print: '可拆几何教具' },
    { session: 2, stage: '几何可视化', title: '比例与测量：把图纸尺寸落到可打印件', project: '课堂量具或比例尺模型', hours: 2, skill: '比例', software: '积木式建模', print: '量具并校核' },
    { session: 3, stage: '空间与地球', title: '地形与等高线：从平面图到起伏表面', project: '校园或公开地图局部地形块', hours: 2, skill: '地形简化', software: '积木式建模', print: '地形块' },
    { session: 4, stage: '空间与地球', title: '剖面与地层：切开才能讲清楚的结构', project: '简化地层 / 山体剖面', hours: 2, skill: '剖面思维', software: '积木式建模', print: '剖面件' },
    { session: 5, stage: '生命科学', title: '细胞与组织：复杂结构如何合理简化', project: '细胞器积木套件', hours: 2, skill: '科学简化', software: '积木式建模', print: '可拼细胞套件' },
    { session: 6, stage: '生命科学', title: '骨骼与关节：活动结构服务讲解', project: '简化关节或骨骼局部', hours: 2, skill: '活动结构', software: '积木式建模', print: '可活动教具' },
    { session: 7, stage: '文化造型', title: '公开领域造型：纹样、对称与浮雕', project: '传统纹样书签 / 脸谱浮雕（原创简化）', hours: 2, skill: '纹样与对称', software: '积木式建模', print: '浮雕件' },
    { session: 8, stage: '文化造型', title: '学科作品答辩：一页说明讲清一个概念', project: '学科教具发布会', hours: 2, skill: '学科表达', software: '作品说明模板', print: '精修教具展示' }
  ]
};

const seniorEngineering = {
  code: 'GX-3D-01',
  slug: 'senior-3d-engineering',
  title: '三维设计与工程创新',
  subtitle: '从需求拆解到功能原型，把创意做成可测试的结构',
  category: '项目进阶',
  grade_min: 10,
  grade_max: 12,
  target_audience: '已有基础建模经验，想做功能结构或科创项目的学习者',
  level: '进阶',
  delivery_mode: 'offline',
  total_sessions: 16,
  total_hours: 32,
  price_text: '课程咨询',
  description: '完整的工程化路径：问题定义、参数化与公差、结构强度、材料与切片策略、功能件测试、学科教具，以及项目日志与答辩。强调测量、失败分析和可复现，而不是一次性出件。',
  seo_title: '三维设计与工程创新课｜起元星启',
  seo_description: '16 课 32 课时：参数化建模、结构与材料、功能原型迭代、工程日志与科创答辩。',
  cover: '/img/education/course-senior-engineering.webp',
  gallery: ['/img/education/course-senior-engineering.webp', '/img/education/makerspace-commons.webp'],
  sort: 3,
  outcomes: [
    '能把模糊想法写成可验证的需求与约束',
    '掌握壁厚、肋板、圆角与配合公差',
    '会根据受力方向选择层向、填充和材料',
    '完成至少两轮功能原型测试',
    '留下可复现的工程日志与切片参数',
    '能在 5 分钟内讲清问题、方案与证据'
  ],
  syllabus: [
    { session: 1, stage: '工程思维', title: '工程问题拆解：需求、约束与成功标准', project: '课题一页纸：用户 / 约束 / 验收', hours: 2, skill: '问题定义', software: '草图与需求表', print: '无' },
    { session: 2, stage: '工程思维', title: '草图到三维：从手绘到可测量模型', project: '功能件草模', hours: 2, skill: '建模转译', software: '参数化 / 实体建模', print: '草模' },
    { session: 3, stage: '工程思维', title: '参数化与尺寸链：公差、配合与可装配性', project: '轴孔 / 卡扣配合件', hours: 2, skill: '公差', software: '参数化建模', print: '配合测试件' },
    { session: 4, stage: '结构与材料', title: '结构强度：壁厚、肋板、圆角与应力集中', project: '悬臂或支架加强版', hours: 2, skill: '结构', software: '实体建模', print: '破坏对比件（课堂可控测试）' },
    { session: 5, stage: '结构与材料', title: '材料与打印策略：PLA、PETG、层向与强度', project: '同模型不同层向对比', hours: 2, skill: '材料判断', software: '切片软件', print: '层向对比条' },
    { session: 6, stage: '结构与材料', title: '切片进阶：支撑、桥接、填充图案与时间成本', project: '切片策略报告', hours: 2, skill: '工艺权衡', software: '切片软件', print: '策略样件' },
    { session: 7, stage: '功能原型', title: '功能件原型一：传动、承载或夹持结构', project: '简易夹具 / 连杆 / 轮轴', hours: 2, skill: '功能设计', software: '参数化建模', print: '原型 1' },
    { session: 8, stage: '功能原型', title: '测试与失败分析：测量、记录、改一处再打', project: '测试记录表 + 原型 1.1', hours: 2, skill: '实验记录', software: '建模 + 测量', print: '修订件' },
    { session: 9, stage: '功能原型', title: '机构专题：连杆、凸轮或简易车辆底盘', project: '气球车或连杆机构（课堂主题）', hours: 2, skill: '机构', software: '参数化建模', print: '机构套件' },
    { session: 10, stage: '功能原型', title: '学科联动教具：把高中概念做成可演示结构', project: '物理装置 / 分子结构 / 机械原理教具', hours: 2, skill: '跨学科', software: '参数化建模', print: '学科教具' },
    { session: 11, stage: '项目表达', title: '校园议题立项：选题、调研与可行性', project: '项目计划书', hours: 2, skill: '立项', software: '文档 + 草模', print: '概念件' },
    { session: 12, stage: '项目表达', title: '方案评审：材料、工期、风险与备用方案', project: '评审修订稿', hours: 2, skill: '评审', software: '参数化建模', print: '关键件试打' },
    { session: 13, stage: '项目表达', title: '迭代打印与装配：把零件变成可演示系统', project: '系统装配', hours: 2, skill: '装配', software: '建模 + 切片', print: '套件装配' },
    { session: 14, stage: '项目表达', title: '工程日志：参数、版本、失败与改进', project: '可复现日志包', hours: 2, skill: '过程管理', software: '日志模板', print: '最终件补打' },
    { session: 15, stage: '项目表达', title: '科创表达：展板、演示与答辩', project: '5 分钟项目答辩', hours: 2, skill: '答辩', software: '展板模板', print: '展示件' },
    { session: 16, stage: '项目表达', title: '复盘与归档：作品、参数与下一步', project: '个人项目档案', hours: 2, skill: '复盘', software: '档案清单', print: '无' }
  ]
};

const seniorChallenge = {
  code: 'GX-3D-02',
  slug: 'senior-maker-challenge',
  title: '科创竞赛项目营',
  subtitle: '用一套完整项目走通选题、原型、证据和答辩',
  category: '项目实践',
  grade_min: 10,
  grade_max: 12,
  target_audience: '准备参加科创、创客活动或需要作品集的学习者',
  level: '项目',
  delivery_mode: 'offline',
  total_sessions: 10,
  total_hours: 20,
  price_text: '课程咨询',
  description: '以竞赛或公开展示为目标的短周期项目营：聚焦一个真实问题，完成调研、功能定义、两轮原型、测试证据、展板与答辩。课程训练项目表达与工程证据，不承诺任何赛事成绩，也不使用第三方品牌的官方赛题包。',
  seo_title: '科创竞赛项目营｜起元星启',
  seo_description: '10 课：选题调研、功能原型、测试证据、展板与答辩，完成一件可公开说明的科创作品。',
  cover: '/img/education/robotic-fair-01.webp',
  gallery: ['/img/education/robotic-fair-01.webp', '/img/education/course-senior-engineering.webp'],
  sort: 4,
  outcomes: [
    '完成一份问题清晰的项目计划',
    '交付可演示的功能原型',
    '用测试数据而不是感觉说明改进',
    '准备展板、演示稿与答辩问答'
  ],
  syllabus: [
    { session: 1, stage: '选题', title: '问题发现：校园、生活或学科中的真实痛点', project: '问题清单与筛选矩阵', hours: 2, skill: '选题', software: '调研表', print: '无' },
    { session: 2, stage: '选题', title: '用户与场景：谁用、何时用、怎样算成功', project: '用户故事与验收标准', hours: 2, skill: '场景定义', software: '文档', print: '无' },
    { session: 3, stage: '原型', title: '方案草模：先做最小可验证结构', project: '最小原型', hours: 2, skill: 'MVP', software: '参数化建模', print: '最小件' },
    { session: 4, stage: '原型', title: '关键功能验证：只测最容易失败的那一处', project: '关键测试件', hours: 2, skill: '验证', software: '建模 + 测量', print: '测试件' },
    { session: 5, stage: '原型', title: '系统集成：外壳、连接与可维护性', project: '集成原型', hours: 2, skill: '系统', software: '参数化建模', print: '集成件' },
    { session: 6, stage: '证据', title: '第二轮迭代：改结构、改参数、改工艺', project: '原型 2.0', hours: 2, skill: '迭代', software: '建模 + 切片', print: '改进件' },
    { session: 7, stage: '证据', title: '测试证据：对照、重复与失败案例', project: '测试报告', hours: 2, skill: '证据', software: '记录表', print: '对照件' },
    { session: 8, stage: '表达', title: '展板与演示：一图讲清问题—方案—证据', project: '展板初稿', hours: 2, skill: '视觉表达', software: '展板模板', print: '展示件精修' },
    { session: 9, stage: '表达', title: '模拟答辩：评委提问与限时陈述', project: '答辩彩排', hours: 2, skill: '答辩', software: '演示稿', print: '无' },
    { session: 10, stage: '表达', title: '发布与归档：作品说明、开源边界与致谢', project: '项目档案包', hours: 2, skill: '发布', software: '档案清单', print: '最终展示件' }
  ]
};

const holidayCamp = {
  code: 'VAC-3D-01',
  slug: 'holiday-creative-camp',
  title: '假期三维创意主题营',
  subtitle: '五天走完构思、建模、打印、迭代与展示',
  category: '寒暑假营',
  grade_min: 7,
  grade_max: 12,
  target_audience: '零基础至有基础的学习者；可按机械、建筑、校园改造选题',
  level: '简单 / 项目',
  delivery_mode: 'offline',
  total_sessions: 5,
  total_hours: 15,
  price_text: '班期咨询',
  description: '寒暑假短周期主题营。每天都有明确交付：方案、模型、首打件、迭代件和展示。主题在创意机械、建筑模型、环保设计、校园改造中轮换，按学习基础调整任务深度。',
  seo_title: '假期三维创意主题营｜起元星启',
  seo_description: '五天 15 课时：主题构思、三维建模、切片打印、迭代装配与成果展示。',
  cover: '/img/education/course-holiday-project.webp',
  gallery: ['/img/education/course-holiday-project.webp', '/img/education/robotic-fair-01.webp'],
  sort: 5,
  outcomes: [
    '五天内完成一件可展示主题作品',
    '体验完整项目流程而不是单次体验课',
    '学会根据首打问题做一次有效修改',
    '在营期展示中介绍自己的设计决定'
  ],
  syllabus: [
    { session: 1, stage: '主题日', title: '主题与草图：选定问题、约束和成功标准', project: '创意方案与手绘三视图', hours: 3, skill: '选题', software: '草图', print: '教师演示件' },
    { session: 2, stage: '建模日', title: '三维建模冲刺：从草图到可切片模型', project: '模型初稿', hours: 3, skill: '建模', software: '积木式或参数化（按分班）', print: '无，完成可切片文件' },
    { session: 3, stage: '出件日', title: '切片与首打：安全、参数与现场排错', project: '第一版打印件', hours: 3, skill: '打印实践', software: '切片软件', print: '首打件' },
    { session: 4, stage: '迭代日', title: '迭代与装配：改尺寸、改结构、再出件', project: '第二版作品与装配', hours: 3, skill: '迭代', software: '建模 + 切片', print: '迭代件' },
    { session: 5, stage: '展示日', title: '成果展示：作品墙、一分钟陈述与评选', project: '主题营作品发布', hours: 3, skill: '表达', software: '展示卡片', print: '精修件上墙' }
  ]
};

const schoolProgram = {
  code: 'SCH-3D-01',
  slug: 'school-maker-program',
  title: '学校创客社团与校本课程',
  subtitle: '课纲、社团、师资、空间与成果展示一体化支持',
  category: '学校合作',
  grade_min: 7,
  grade_max: 12,
  target_audience: '学校、信息/通用技术/科学教师、社团指导教师',
  level: '定制',
  delivery_mode: 'hybrid',
  total_sessions: 6,
  total_hours: 0,
  price_text: '学校合作咨询',
  description: '为学校把三维建模与打印落成可执行的校本课或社团：学期课纲、课堂任务单、教师带练、设备与安全规范、学生项目与公开成果展。可按课后服务、社团或正式校本课时定制，不绑定特定品牌设备。',
  seo_title: '学校创客社团与校本课程｜起元星启',
  seo_description: '面向学校的三维建模校本课、创客社团、教师培训与创客空间建议。',
  cover: '/img/education/course-school-space.webp',
  gallery: ['/img/education/course-school-space.webp', '/img/education/makerspace-commons.webp'],
  sort: 6,
  outcomes: [
    '拿到可按学期执行的课纲与任务单',
    '教师能独立组织一节安全的出件课',
    '社团形成可展示的学生项目',
    '设备与材料服务于课程目标',
    '建立作品评价与公开展示机制'
  ],
  syllabus: [
    { session: 1, stage: '课纲', title: '学期课纲共创：学段目标、课时与评价', project: '校本课纲草案（初中基础 / 高中项目）', hours: 0, skill: '课程设计', software: '课纲模板', print: '样课出件' },
    { session: 2, stage: '课堂', title: '课堂任务单：一课一成果的教学节奏', project: '6–12 课时任务包', hours: 0, skill: '课堂组织', software: '任务单', print: '样课作品' },
    { session: 3, stage: '社团', title: '创客社团工坊：真实校园议题项目', project: '学期社团项目清单', hours: 0, skill: '项目管理', software: '项目看板', print: '社团原型' },
    { session: 4, stage: '师资', title: '教师培训：安全、切片、课堂巡视与评价', project: '教师实操工作坊', hours: 0, skill: '师资', software: '切片 + 建模带练', print: '教师样件' },
    { session: 5, stage: '空间', title: '创客空间建议：动线、通风、耗材与值守', project: '空间与设备配置建议书', hours: 0, skill: '空间安全', software: '配置清单', print: '无' },
    { session: 6, stage: '成果', title: '成果展与评价量表：公开、授权与归档', project: '校园三维作品展方案', hours: 0, skill: '评价与展示', software: '评价量表', print: '展陈件' }
  ]
};

const courses = [juniorFoundation, juniorStem, seniorEngineering, seniorChallenge, holidayCamp, schoolProgram];

function toRow(course) {
  return {
    ...course,
    syllabus_json: JSON.stringify(course.syllabus),
    outcomes_json: JSON.stringify(course.outcomes),
    gallery_json: JSON.stringify(course.gallery)
  };
}

module.exports = { DISCLAIMER, courses, toRow };
