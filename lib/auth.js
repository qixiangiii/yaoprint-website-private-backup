// 会话守卫：后台管理员与消费者账户的鉴权中间件。
const bcrypt = require('bcryptjs');

// 登录失败路径也执行一次哈希比较，避免用响应时间枚举有效账号
const DUMMY_HASH = bcrypt.hashSync('qiyuan-timing-guard', 10);

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: '未登录' });
}

function requireCustomer(req, res, next) {
  if (req.session && req.session.customer) return next();
  return res.status(401).json({ error: '请先登录起元星启账户' });
}

// 登录/注册成功后重建会话 ID，防止会话固定攻击。
// key 决定写入会话的字段名，也直接复用为响应体的字段名。
function loginSession(req, res, { key, value, error }) {
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error });
    req.session[key] = value;
    req.session.save(() => res.json({ ok: true, [key]: value }));
  });
}

module.exports = { DUMMY_HASH, requireAdmin, requireCustomer, loginSession };
