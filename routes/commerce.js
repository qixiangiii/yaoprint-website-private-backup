// 消费者账户、选购清单、报价订单、设备与投稿。
// 全部接口要求登录；写入字段统一裁剪长度，与公开表单保持同一套边界。
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { db, stmt } = require('../lib/store');
const { DUMMY_HASH, requireCustomer, loginSession } = require('../lib/auth');
const { registerLimiter, loginLimiter } = require('../lib/limiters');
const { capStrings, limitText, isPhone, isEmail } = require('../lib/validate');
const { CUSTOMER_STATUS, AFTER_SALES_TYPE } = require('../lib/status');

function customerPublic(customer) {
  return {
    id: customer.id, email: customer.email, name: customer.name,
    phone: customer.phone, status: customer.status, created_at: customer.created_at
  };
}

function orderNumber() {
  const now = new Date();
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `YQ${day}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// 购物车数量统一收敛到 1..99
const clampQuantity = value => Math.max(1, Math.min(99, Number(value) || 1));

module.exports = function registerCommerceRoutes(app) {
  // ---------- 账户 ----------
  app.post('/api/account/register', registerLimiter, capStrings(254), (req, res) => {
    const { email, password, name, phone } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: '请输入有效邮箱' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: '密码至少 8 位' });
    if (phone && !isPhone(phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    try {
      const result = stmt('INSERT INTO customers (email,password_hash,name,phone) VALUES (?,?,?,?)')
        .run(String(email).trim().toLowerCase(), bcrypt.hashSync(String(password), 10), limitText(name, 40), limitText(phone, 20));
      const customer = stmt('SELECT * FROM customers WHERE id=?').get(result.lastInsertRowid);
      // 注册即登录，同样重建会话 ID
      loginSession(req, res, { key: 'customer', value: customerPublic(customer), error: '注册成功，请重新登录' });
    } catch (error) {
      // 只有邮箱唯一约束才是“已注册”，其他写入异常不能被伪装成重复邮箱
      if (error && (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(error.message || ''))) {
        return res.status(400).json({ error: '该邮箱已注册，请直接登录' });
      }
      console.error('[register]', error && error.message);
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  });

  app.post('/api/account/login', loginLimiter, (req, res) => {
    const { email, password } = req.body || {};
    const customer = stmt('SELECT * FROM customers WHERE email=?').get(String(email || '').trim().toLowerCase());
    // 账号不存在时也对占位哈希做一次比较，抹平响应时间差异
    const ok = bcrypt.compareSync(String(password || ''), customer?.password_hash || DUMMY_HASH);
    if (!customer || customer.status !== CUSTOMER_STATUS.ACTIVE || !ok) return res.status(401).json({ error: '邮箱或密码错误' });
    loginSession(req, res, { key: 'customer', value: customerPublic(customer), error: '登录失败，请重试' });
  });

  app.post('/api/account/logout', (req, res) => { delete req.session.customer; res.json({ ok: true }); });

  app.get('/api/account/me', (req, res) => {
    if (!req.session.customer) return res.status(401).json({ error: '未登录' });
    res.json(req.session.customer);
  });

  // 部分更新：只改请求体里出现过的字段。
  // 之前是整体覆盖，前端只传 phone 时会把 name 写成空串，返回 200 且无提示。
  app.put('/api/account/profile', requireCustomer, (req, res) => {
    const body = req.body || {};
    const sets = [];
    const values = [];
    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = limitText(body.name, 40);
      if (!name) return res.status(400).json({ error: '请填写姓名' });
      sets.push('name=?'); values.push(name);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
      const phone = limitText(body.phone, 20);
      if (phone && !isPhone(phone)) return res.status(400).json({ error: '请填写有效的联系电话' });
      sets.push('phone=?'); values.push(phone);
    }
    if (!sets.length) return res.status(400).json({ error: '没有需要更新的字段' });
    stmt(`UPDATE customers SET ${sets.join(',')} WHERE id=?`).run(...values, req.session.customer.id);
    const customer = stmt('SELECT * FROM customers WHERE id=?').get(req.session.customer.id);
    req.session.customer = customerPublic(customer);
    res.json({ ok: true, customer: req.session.customer });
  });

  // ---------- 地址 ----------
  app.get('/api/account/addresses', requireCustomer, (req, res) => {
    res.json(stmt('SELECT * FROM customer_addresses WHERE customer_id=? ORDER BY is_default DESC,id DESC').all(req.session.customer.id));
  });

  app.post('/api/account/addresses', requireCustomer, (req, res) => {
    const { recipient, phone, province, city, district, detail, is_default } = req.body || {};
    if (!recipient || !detail) return res.status(400).json({ error: '收件人和详细地址必填' });
    const trimmedPhone = limitText(phone, 20);
    if (trimmedPhone && !isPhone(trimmedPhone)) return res.status(400).json({ error: '请填写有效的联系电话' });
    const customerId = req.session.customer.id;
    if (is_default) stmt('UPDATE customer_addresses SET is_default=0 WHERE customer_id=?').run(customerId);
    const result = stmt('INSERT INTO customer_addresses (customer_id,recipient,phone,province,city,district,detail,is_default) VALUES (?,?,?,?,?,?,?,?)')
      .run(customerId, limitText(recipient, 40), trimmedPhone, limitText(province, 40), limitText(city, 40), limitText(district, 40), limitText(detail, 200), is_default ? 1 : 0);
    res.json({ ok: true, id: result.lastInsertRowid });
  });

  app.delete('/api/account/addresses/:id', requireCustomer, (req, res) => {
    stmt('DELETE FROM customer_addresses WHERE id=? AND customer_id=?').run(req.params.id, req.session.customer.id);
    res.json({ ok: true });
  });

  // ---------- 选购清单 ----------
  app.get('/api/shop/skus', (req, res) => {
    res.json(stmt("SELECT s.*,p.slug AS product_slug FROM catalog_skus s LEFT JOIN products p ON p.id=s.product_id WHERE s.status='published' ORDER BY s.sort,id").all());
  });

  app.get('/api/cart', requireCustomer, (req, res) => {
    const cart = stmt('SELECT * FROM carts WHERE customer_id=?').get(req.session.customer.id);
    if (!cart) return res.json([]);
    res.json(stmt('SELECT i.id,i.quantity,s.id AS sku_id,s.slug,s.name,s.variant,s.price,s.cover FROM cart_items i JOIN catalog_skus s ON s.id=i.sku_id WHERE i.cart_id=? ORDER BY i.id DESC').all(cart.id));
  });

  app.post('/api/cart/items', requireCustomer, (req, res) => {
    const skuId = Number((req.body || {}).sku_id);
    const quantity = clampQuantity((req.body || {}).quantity);
    const sku = stmt("SELECT id FROM catalog_skus WHERE id=? AND status='published'").get(skuId);
    if (!sku) return res.status(404).json({ error: '选购项目不存在' });
    const customerId = req.session.customer.id;
    stmt('INSERT OR IGNORE INTO carts (customer_id) VALUES (?)').run(customerId);
    const cart = stmt('SELECT * FROM carts WHERE customer_id=?').get(customerId);
    stmt('INSERT INTO cart_items (cart_id,sku_id,quantity) VALUES (?,?,?) ON CONFLICT(cart_id,sku_id) DO UPDATE SET quantity=MIN(99, quantity+excluded.quantity)').run(cart.id, skuId, quantity);
    stmt("UPDATE carts SET updated_at=datetime('now','localtime') WHERE id=?").run(cart.id);
    res.json({ ok: true });
  });

  app.put('/api/cart/items/:id', requireCustomer, (req, res) => {
    const quantity = clampQuantity((req.body || {}).quantity);
    const result = stmt('UPDATE cart_items SET quantity=? WHERE id=? AND cart_id IN (SELECT id FROM carts WHERE customer_id=?)').run(quantity, req.params.id, req.session.customer.id);
    if (!result.changes) return res.status(404).json({ error: '选购项不存在' });
    res.json({ ok: true });
  });

  app.delete('/api/cart/items/:id', requireCustomer, (req, res) => {
    const result = stmt('DELETE FROM cart_items WHERE id=? AND cart_id IN (SELECT id FROM carts WHERE customer_id=?)').run(req.params.id, req.session.customer.id);
    if (!result.changes) return res.status(404).json({ error: '选购项不存在' });
    res.json({ ok: true });
  });

  // ---------- 报价订单 ----------
  app.post('/api/orders', requireCustomer, capStrings(4000), (req, res) => {
    const customerId = req.session.customer.id;
    const { address_id, note } = req.body || {};
    const cart = stmt('SELECT * FROM carts WHERE customer_id=?').get(customerId);
    const items = cart
      ? stmt('SELECT i.quantity,s.id AS sku_id,s.name,s.variant,s.price FROM cart_items i JOIN catalog_skus s ON s.id=i.sku_id WHERE i.cart_id=?').all(cart.id)
      : [];
    if (!items.length) return res.status(400).json({ error: '购物袋为空' });
    if (address_id && !stmt('SELECT id FROM customer_addresses WHERE id=? AND customer_id=?').get(address_id, customerId)) {
      return res.status(400).json({ error: '地址不属于当前账户' });
    }
    const orderNo = orderNumber();
    const totalText = items.map(item => `${item.name} × ${item.quantity}`).join('；');
    const createOrder = db.transaction(() => {
      const result = stmt('INSERT INTO orders (order_no,customer_id,address_id,note,total_text) VALUES (?,?,?,?,?)')
        .run(orderNo, customerId, address_id || null, limitText(note, 500), totalText);
      for (const item of items) {
        stmt('INSERT INTO order_items (order_id,sku_id,name,variant,price,quantity) VALUES (?,?,?,?,?,?)')
          .run(result.lastInsertRowid, item.sku_id, item.name, item.variant, item.price, item.quantity);
      }
      stmt('DELETE FROM cart_items WHERE cart_id=?').run(cart.id);
    });
    createOrder();
    res.json({ ok: true, order_no: orderNo });
  });

  app.get('/api/orders', requireCustomer, (req, res) => {
    res.json(stmt('SELECT * FROM orders WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id));
  });

  app.get('/api/orders/:no', requireCustomer, (req, res) => {
    const order = stmt('SELECT * FROM orders WHERE order_no=? AND customer_id=?').get(req.params.no, req.session.customer.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    order.items = stmt('SELECT * FROM order_items WHERE order_id=?').all(order.id);
    res.json(order);
  });

  app.post('/api/after-sales', requireCustomer, (req, res) => {
    const { order_no, type, reason } = req.body || {};
    const order = stmt('SELECT id FROM orders WHERE order_no=? AND customer_id=?').get(order_no, req.session.customer.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    // 服务类型对应前台三个选项，其余取值统一回落到维修咨询，避免脏数据进库
    const serviceType = [AFTER_SALES_TYPE.REPAIR, AFTER_SALES_TYPE.REPLACEMENT, AFTER_SALES_TYPE.REFUND].includes(String(type))
      ? String(type)
      : AFTER_SALES_TYPE.REPAIR;
    if (!String(reason || '').trim()) return res.status(400).json({ error: '请填写问题说明' });
    stmt('INSERT INTO after_sales (order_id,customer_id,type,reason) VALUES (?,?,?,?)')
      .run(order.id, req.session.customer.id, serviceType, limitText(reason, 1000));
    res.json({ ok: true });
  });

  // ---------- 设备 ----------
  app.post('/api/devices/register', requireCustomer, capStrings(4000), (req, res) => {
    const { serial_no, product_name, purchase_date, channel } = req.body || {};
    if (!serial_no || !product_name) return res.status(400).json({ error: '序列号和设备型号必填' });
    const serial = limitText(serial_no, 60);
    let device = stmt('SELECT * FROM devices WHERE serial_no=?').get(serial);
    // 同一账户重复登记应视为幂等成功；只有被别的账户占用时才拒绝
    const binding = device ? stmt('SELECT customer_id FROM device_bindings WHERE device_id=?').get(device.id) : null;
    if (binding && binding.customer_id !== req.session.customer.id) {
      return res.status(400).json({ error: '该设备已绑定其他账户' });
    }
    if (!device) {
      const result = stmt("INSERT INTO devices (serial_no,product_name,purchase_date,channel,warranty_until) VALUES (?,?,?,?,date('now','+365 days'))")
        .run(serial, limitText(product_name, 120), limitText(purchase_date, 20), limitText(channel, 40));
      device = stmt('SELECT * FROM devices WHERE id=?').get(result.lastInsertRowid);
    }
    // device_bindings 没有 (device_id, customer_id) 唯一约束，先查再插避免重复绑定行
    if (!binding) stmt('INSERT INTO device_bindings (device_id,customer_id) VALUES (?,?)').run(device.id, req.session.customer.id);
    res.json({ ok: true, device });
  });

  app.get('/api/devices', requireCustomer, (req, res) => {
    res.json(stmt('SELECT d.* FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE b.customer_id=? ORDER BY b.id DESC').all(req.session.customer.id));
  });

  app.get('/api/devices/:sn', requireCustomer, (req, res) => {
    const device = stmt('SELECT d.* FROM devices d JOIN device_bindings b ON b.device_id=d.id WHERE d.serial_no=? AND b.customer_id=?').get(req.params.sn, req.session.customer.id);
    if (!device) return res.status(404).json({ error: '设备不存在' });
    device.tickets = stmt('SELECT * FROM service_tickets WHERE device_id=? AND customer_id=? ORDER BY id DESC').all(device.id, req.session.customer.id);
    res.json(device);
  });

  // ---------- 创作投稿 ----------
  app.post('/api/submissions', requireCustomer, capStrings(4000), (req, res) => {
    const { title, description, license } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ error: '作品标题必填' });
    const result = stmt('INSERT INTO creator_submissions (customer_id,title,description,license) VALUES (?,?,?,?)')
      .run(req.session.customer.id, limitText(title, 120), limitText(description, 1000), limitText(license, 40));
    res.json({ ok: true, id: result.lastInsertRowid });
  });

  app.get('/api/submissions', requireCustomer, (req, res) => {
    res.json(stmt('SELECT * FROM creator_submissions WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id));
  });

  app.get('/api/tickets/mine', requireCustomer, (req, res) => {
    res.json(stmt('SELECT * FROM service_tickets WHERE customer_id=? ORDER BY id DESC').all(req.session.customer.id));
  });
};
