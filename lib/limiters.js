// 全站限流策略集中定义：窗口、次数与提示语一处维护，路由只引用实例。
const { makeLimiter } = require('./security');

const MINUTE = 60 * 1000;

const pageviewLimiter = makeLimiter({ windowMs: MINUTE, max: 120, error: '请求过于频繁' });
const loginLimiter = makeLimiter({ windowMs: 15 * MINUTE, max: 30, error: '登录尝试过于频繁，请稍后再试' });
const submitLimiter = makeLimiter({ windowMs: 10 * MINUTE, max: 20, error: '提交过于频繁，请稍后再试' });
const registerLimiter = makeLimiter({ windowMs: 60 * MINUTE, max: 10, error: '注册过于频繁，请稍后再试' });
const subsLimiter = makeLimiter({ windowMs: 10 * MINUTE, max: 5, error: '订阅提交过于频繁，请稍后再试' });

module.exports = { pageviewLimiter, loginLimiter, submitLimiter, registerLimiter, subsLimiter };
