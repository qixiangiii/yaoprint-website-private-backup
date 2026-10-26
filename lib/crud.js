// 通用 CRUD 路由工厂：为结构一致的内容表批量注册前台只读 + 后台增删改查接口。
const { stmt } = require('./store');
const { requireAdmin } = require('./auth');
const { clampInt } = require('./validate');

function registerCrud(app, table, fields, options = {}) {
  const required = options.required || [];
  const validate = options.validate || (() => null);
  const publicOrder = options.publicOrder || 'sort, id';
  const publicWhere = options.publicWhere || '';
  const adminOrder = options.adminOrder || 'sort, id DESC';

  // table / fields / order 均来自本文件的硬编码常量，不来自请求，故可直接内插
  const selectAll = `SELECT * FROM ${table}`;
  const publicSql = `${selectAll}${publicWhere ? ` WHERE ${publicWhere}` : ''} ORDER BY ${publicOrder}`;
  const insertSql = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`;
  const updateSql = `UPDATE ${table} SET ${fields.map(field => `${field}=?`).join(',')} WHERE id=?`;

  app.get(`/api/${table}`, (req, res) => {
    // 限制单次返回条数，避免被用于一次性拖取整表
    const limit = clampInt(req.query.limit, { min: 0, max: 200, fallback: 0 });
    res.json(limit ? stmt(`${publicSql} LIMIT ?`).all(limit) : stmt(publicSql).all());
  });

  app.get(`/api/admin/${table}`, requireAdmin, (req, res) => {
    res.json(stmt(`${selectAll} ORDER BY ${adminOrder}`).all());
  });

  app.get(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const row = stmt(`${selectAll} WHERE id=?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  app.post(`/api/admin/${table}`, requireAdmin, (req, res) => {
    const body = req.body || {};
    for (const key of required) {
      if (!String(body[key] || '').trim()) return res.status(400).json({ error: `${key} 必填` });
    }
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const values = fields.map(field => body[field] == null ? '' : body[field]);
    try {
      const result = stmt(insertSql).run(...values);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const body = req.body || {};
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const values = fields.map(field => body[field] == null ? '' : body[field]);
    const result = stmt(updateSql).run(...values, req.params.id);
    // 记录不存在时明确返回 404，避免前端把“保存成功”误判为已生效
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });

  app.delete(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const result = stmt(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });
}

module.exports = { registerCrud };
