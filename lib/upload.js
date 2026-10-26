// 图片上传：类型/扩展名白名单 + 大小限制 + 文件头魔数校验。
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { isValidImageBuffer } = require('./validate');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + safeExt);
  }
});

const uploader = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error('仅支持 jpg / png / webp / gif 图片，且不超过 5MB'));
  }
});

// 只读文件头 12 字节做签名判断，避免把整张图读进内存
function hasImageSignature(filePath) {
  let buffer = null;
  try {
    const fd = fs.openSync(filePath, 'r');
    buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
  } catch { return false; }
  return isValidImageBuffer(buffer);
}

// 上传中间件：成功后 req.file 可用，校验失败时删除落盘文件并返回 400
function uploadImage(req, res, next) {
  uploader.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '请选择图片文件（jpg/png/webp/gif，最大 5MB）' });
    if (!hasImageSignature(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* 清理失败忽略 */ }
      return res.status(400).json({ error: '文件内容不是有效图片，请上传 jpg / png / webp / gif' });
    }
    next();
  });
}

module.exports = { uploadImage, uploadDir };
