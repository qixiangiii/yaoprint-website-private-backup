// 商品数据的产品化视图：字段清单集中一处，避免前台/后台两处 SELECT 漂移。
const { parseJSON } = require('./validate');

// 顺序即接口返回顺序，改动需与前端渲染字段保持一致
const PRODUCT_FIELDS = [
  'id', 'slug', 'name', 'subtitle', 'tag', 'price', 'description', 'image_svg', 'hero_image', 'card_image',
  'spec_json', 'gallery_json', 'colors_json', 'kits_json', 'feature_json', 'relationship', 'official_url',
  'source_label', 'relationship_disclaimer', 'spec_source', 'spec_verified_at', 'featured_home', 'status', 'sort'
];

const PRODUCT_PUBLIC_SELECT = PRODUCT_FIELDS.map(field => `p.${field}`).join(', ');

// 后台编辑需要 category_id 回填分类下拉框，其余字段与前台共用同一份清单
const PRODUCT_ADMIN_SELECT = (() => {
  const columns = PRODUCT_FIELDS.map(field => `p.${field}`);
  columns.splice(4, 0, 'p.category_id');
  return columns.join(', ');
})();

// 把 *_json 列就地展开为对象/数组，返回值不再包含原始 JSON 字符串
function parseProduct(product) {
  product.spec = parseJSON(product.spec_json, {});
  product.gallery = parseJSON(product.gallery_json, []);
  product.colors = parseJSON(product.colors_json, []);
  product.kits = parseJSON(product.kits_json, []);
  product.features = parseJSON(product.feature_json, []);
  delete product.spec_json;
  delete product.gallery_json;
  delete product.colors_json;
  delete product.kits_json;
  delete product.feature_json;
  return product;
}

module.exports = { PRODUCT_FIELDS, PRODUCT_PUBLIC_SELECT, PRODUCT_ADMIN_SELECT, parseProduct };
