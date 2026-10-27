// SEO 出口：sitemap.xml 与 robots.txt。
const { getSetting } = require('../lib/store');

// 前台需要被收录的静态页面（排除账户/选购/模板等非内容页与已标记 noindex 的页面）
const SEO_PAGES = [
  '/', '/courses/index.html', '/works.html', '/trial.html', '/printers.html', '/products.html',
  '/compare.html', '/printer-types.html', '/solutions/school.html', '/solutions/education.html',
  '/solutions/industrial.html', '/solutions/creative.html', '/solutions/healthcare.html', '/solutions.html',
  '/teachers.html', '/knowledge.html', '/learning.html', '/news.html', '/competition.html',
  '/about.html', '/about/careers.html', '/about/partners.html', '/about/media-kit.html',
  '/contact.html', '/materials.html', '/filament.html', '/filament/materials.html',
  '/filament/selector.html', '/software.html', '/software/releases.html', '/software/status.html',
  '/explore.html', '/explore/models.html', '/explore/ecosystem.html',
  '/support.html', '/support/knowledge-base.html', '/support/manuals.html', '/support/warranty.html',
  '/support/service-network.html', '/support/academy.html', '/partners/find.html', '/partners/guide.html',
  '/image-credits.html'
];

function siteBaseUrl() {
  return String(getSetting('site_url', '')).trim().replace(/\/+$/, '');
}

module.exports = function registerSeoRoutes(app) {
  // lastmod 用本地日期。toISOString() 是 UTC，北京时间 00:00–08:00 会写成"昨天"，
  // 站点按 Asia/Shanghai 运行（订单号也依赖本地日期），这里必须保持一致。
  const localDate = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  app.get('/sitemap.xml', (req, res) => {
    const base = siteBaseUrl() || `${req.protocol}://${req.get('host')}`;
    const today = localDate();
    const urls = SEO_PAGES.map(page => {
      const loc = page === '/' ? `${base}/` : base + page;
      const priority = page === '/' ? '1.0' : '0.7';
      return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
    }).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  });

  app.get('/robots.txt', (req, res) => {
    const base = siteBaseUrl() || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /account/\nDisallow: /shop/\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`
    );
  });
};
