// PM2 启动配置：宝塔「Node 项目」或命令行 `pm2 start ecosystem.config.js` 均可使用。
// 配置项通过项目根目录的 .env 提供（参考 .env.example），这里只放与代码强相关的运行参数。
module.exports = {
  apps: [
    {
      name: 'yaoprint',
      script: 'server.js',
      cwd: __dirname,
      // SQLite 单文件写入，不能开 cluster 多进程，否则会出现数据库锁冲突
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      max_memory_restart: '512M',
      // 日期与订单号依赖本地时区，固定为北京时间，避免服务器默认 UTC 造成跨天错位
      env: {
        TZ: 'Asia/Shanghai',
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
