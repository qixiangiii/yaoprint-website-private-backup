// 状态枚举单一来源：业务实体的状态机取值集中在此定义，
// 避免 'new'/'active'/'published' 等魔法字符串散落各处导致漂移。
// 新增或调整状态时只改这里，路由层与文档统一引用。
Object.freeze = Object.freeze; // 保持默认行为，仅作语义标注

// 通用「处理进度」状态（工单/询价/咨询/伙伴申请等）
const TICKET_STATUS = Object.freeze({
  NEW: 'new',
  CONTACTED: 'contacted',
  COMPLETED: 'completed',
});

// 客户账号状态
const CUSTOMER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

// 订单状态
const ORDER_STATUS = Object.freeze({
  PENDING_REVIEW: 'pending_review',
  // 其余取值由业务流程扩展，此处仅列出当前实际使用的键
});

// 内容/商品的发布状态
const PUBLISH_STATUS = Object.freeze({
  PUBLISHED: 'published',
  DRAFT: 'draft',
  SOON: 'soon',
});

// 投稿审核状态
const SUBMISSION_STATUS = Object.freeze({
  PENDING: 'pending',
});

// 班期开课状态
const SESSION_STATUS = Object.freeze({
  OPEN: 'open',
});

// 内容的可见范围
const VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

// 产品与品牌的关系定位
const RELATIONSHIP = Object.freeze({
  TRAINING_REFERENCE: 'training_reference',
});

// 咨询/预约的来源类型
const LEAD_TYPE = Object.freeze({
  TRIAL: 'trial',
  SCHOOL: 'school',
  COMPETITION: 'competition',
});

// 售后类型
const AFTER_SALES_TYPE = Object.freeze({
  REPAIR: 'repair',
  REPLACEMENT: 'replacement',
  REFUND: 'refund',
});

module.exports = {
  TICKET_STATUS,
  CUSTOMER_STATUS,
  ORDER_STATUS,
  PUBLISH_STATUS,
  SUBMISSION_STATUS,
  SESSION_STATUS,
  VISIBILITY,
  RELATIONSHIP,
  LEAD_TYPE,
  AFTER_SALES_TYPE,
};
