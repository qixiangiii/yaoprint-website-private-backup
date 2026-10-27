// 通用 CRUD 路由工厂：为结构一致的内容表批量注册前台只读 + 后台增删改查接口。
const { stmt } = require('./store');
const { requireAdmin } = require('./auth');
const { safeLink } = require('./validate');

function registerCrud(app, table, fields, options = {}) {
  const required = options.required || [];
  const validate = options.validate || (() => null);
  const publicOrder = options.publicOrder || 'sort, id';
  const publicWhere = options.publicWhere || '';
  const adminOrder = options.adminOrder || 'sort, id DESC';
  // 前台输出前需要净化的链接字段（相对路径或 HTTPS 保留，其余置空）。
  // 存量数据可能含历史脏值或 "#" 占位符，统一在这里兜底，避免把 javascript:/data: 渲染成可点击链接。
  const linkFields = options.linkFields || [];
  const publicTransform = options.publicTransform || (row => {
    for (const field of linkFields) row[field] = safeLink(row[field]);
    return row;
  });
  const MAX_LIMIT = 200;

  // table / fields / order 均来自本文件的硬编码常量，不来自请求，故可直接内插
  const selectAll = `SELECT * FROM ${table}`;
  const publicSql = `${selectAll}${publicWhere ? ` WHERE ${publicWhere}` : ''} ORDER BY ${publicOrder}`;
  const insertFor = columns => `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
  const updateFor = columns => `UPDATE ${table} SET ${columns.map(column => `${column}=?`).join(',')} WHERE id=?`;

  // 只处理请求体里实际出现的字段：缺失的列交给数据库默认值，
  // 既避免把 INTEGER 列（如 sort）写成空字符串，也避免部分更新覆盖其他列。
  const submitted = body => fields.filter(field => Object.prototype.hasOwnProperty.call(body, field));

  // 前台列表的条数：只有显式正整数才生效。SQLite 把 LIMIT -1 当作“不限制”，
  // 负数必须回落到上限，否则等于绕过条数保护。
  const pageLimit = raw => {
    const value = raw === undefined || raw === null ? '' : String(raw).trim();
    if (value === '') return 0; // 未传：返回全部（内容表体量小）
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num === 0) return 0;
    return num > 0 ? Math.min(Math.trunc(num), MAX_LIMIT) : MAX_LIMIT;
  };

  app.get(`/api/${table}`, (req, res) => {
    const limit = pageLimit(req.query.limit);
    const rows = limit ? stmt(`${publicSql} LIMIT ?`).all(limit) : stmt(publicSql).all();
    res.json(rows.map(publicTransform));
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
      if (!String(body[key] ?? '').trim()) return res.status(400).json({ error: `${key} 必填` });
    }
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const columns = submitted(body);
    if (!columns.length) return res.status(400).json({ error: '没有可写入的字段' });
    try {
      const result = stmt(insertFor(columns)).run(...columns.map(field => body[field] ?? null));
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.put(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const body = req.body || {};
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });
    const columns = submitted(body);
    if (!columns.length) return res.status(400).json({ error: '没有可更新的字段' });
    // 只校验本次提交的必填项：部分更新不应因未提交字段而失败
    for (const key of required) {
      if (columns.includes(key) && !String(body[key] ?? '').trim()) return res.status(400).json({ error: `${key} 必填` });
    }
    try {
      const result = stmt(updateFor(columns)).run(...columns.map(field => body[field] ?? null), req.params.id);
      // 记录不存在时明确返回 404，避免前端把“保存成功”误判为已生效
      if (!result.changes) return res.status(404).json({ error: '记录不存在' });
      res.json({ ok: true });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.delete(`/api/admin/${table}/:id`, requireAdmin, (req, res) => {
    const result = stmt(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  });
}

module.exports = { registerCrud };
