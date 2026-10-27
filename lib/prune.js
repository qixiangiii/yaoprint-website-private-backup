// 数据保留策略：定期清理会无限增长的历史数据，避免拖慢统计聚合。
const db = require('../db');

// page_views 是访问量最高的写表，每访问一次插一行。
// 无保留策略时表体量线性增长，看板聚合（COUNT DISTINCT visitor）会越来越慢。
const PAGEVIEW_RETENTION_DAYS = 90;

// 首次启动立即清理一次（进程往往长期驻留），之后每天凌晨 04:00 清理。
function prunePageViews() {
  try {
    const result = db.prepare(
      "DELETE FROM page_views WHERE datetime(created_at) < datetime('now','localtime', ?)"
    ).run(`-${PAGEVIEW_RETENTION_DAYS} days`);
    if (result.changes > 0) console.log(`🧹 已清理 ${result.changes} 条 ${PAGEVIEW_RETENTION_DAYS} 天前的访问记录`);
  } catch (error) {
    console.error('[prune] page_views 清理失败:', error && error.message);
  }
}

// 计算距下一个本地 04:00 的毫秒数，用于对齐定时器
function msUntilNext4am() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function startPruneScheduler() {
  prunePageViews();
  // 先对齐到凌晨 04:00 触发一次，之后固定 24h 间隔
  const first = setTimeout(() => {
    prunePageViews();
    setInterval(prunePageViews, 24 * 60 * 60 * 1000);
  }, msUntilNext4am());
  // 不阻止进程退出（unref 让定时器不成为存活引用）
  first.unref?.();
}

module.exports = { startPruneScheduler, prunePageViews, PAGEVIEW_RETENTION_DAYS };
