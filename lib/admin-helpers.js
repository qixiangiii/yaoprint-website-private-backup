// 后台通用「改状态 + 删除」路由工厂。
// 后台有十余组结构完全相同的接口：改状态（PUT）与删除（DELETE）都是
// 「UPDATE 表 SET 状态=? WHERE id=?」+「DELETE FROM 表 WHERE id=?」，
// 逐组手写只会让 routes/admin.js 膨胀成样板代码流水账。
//
// 本工厂把「状态字段名 / 默认值 / 404 文案」三处差异收敛为一次声明，
// 路由只表达业务意图，不再重复 SQL 与错误处理。
const { stmt } = require('./store');
const { requireAdmin } = require('./auth');

/**
 * 注册一组后台状态管理接口。
 * @param {object} app            Express 实例
 * @param {string} basePath      例如 '/api/admin/tickets'
 * @param {object} opts
 * @param {string} opts.table       目标表名（来自本文件调用方硬编码，不来自请求）
 * @param {string} [opts.statusField] 状态列名，默认 'status'
 * @param {string} [opts.defaultStatus] PUT 缺省时回落的默认状态，默认 'new'
 * @param {string} [opts.label]    404 提示中的对象名，默认取表名
 * @param {boolean} [opts.skipPut] 为 true 时不注册 PUT（该接口有额外字段，需手写）
 */
function registerStatusRoutes(app, basePath, opts = {}) {
  const { table, statusField = 'status', defaultStatus = 'new', label = table, skipPut = false } = opts;

  if (!skipPut) {
    app.put(`${basePath}/:id`, requireAdmin, (req, res) => {
      const status = String((req.body || {})[statusField] || defaultStatus);
      const result = stmt(`UPDATE ${table} SET ${statusField}=? WHERE id=?`).run(status, req.params.id);
      if (!result.changes) return res.status(404).json({ error: `${label}不存在` });
      res.json({ ok: true });
    });
  }

  app.delete(`${basePath}/:id`, requireAdmin, (req, res) => {
    const result = stmt(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: `${label}不存在` });
    res.json({ ok: true });
  });
}

module.exports = { registerStatusRoutes };
