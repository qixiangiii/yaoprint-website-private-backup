// 极简 .env 加载：不引入 dotenv 依赖，只在变量未设置时填充。
// 目的：宝塔等面板上部署时，把配置写在项目根 .env 里即可，避免到 PM2 面板逐项填环境变量。
// 已有环境变量优先（面板里显式设置的值不会被文件覆盖）。
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '.env');

if (fs.existsSync(file)) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    text = '';
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    // 去掉成对引号，保留值里的空格
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
