// 企业微信机器人通知：Webhook 优先级为环境变量 > 后台「站点设置 → 通知设置」。
const { getSetting } = require('./store');
const { isSafeWebhook } = require('./security');

function notifyWeCom(title, fields) {
  const webhook = String(process.env.WECOM_WEBHOOK_URL || '').trim() || String(getSetting('wecom_webhook_url', '')).trim();
  if (!webhook) return;
  if (!isSafeWebhook(webhook)) { console.error('[wecom notify] 已拒绝不安全的 Webhook 地址'); return; }
  const lines = fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `**${key}：**${String(value).trim()}`);
  const content = `### ${title}\n${lines.join('\n')}\n> 提交时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`;
  // 通知失败不影响主流程，仅记录日志；加超时避免 Webhook 无响应时长期占用连接
  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
    signal: AbortSignal.timeout(5000)
  }).then(response => response.json()).then(result => {
    if (result.errcode) console.error('[wecom notify]', result.errcode, result.errmsg);
  }).catch(error => console.error('[wecom notify]', error.message));
}

module.exports = { notifyWeCom };
