// 数据行 → 接口响应 的字段展开层。
// 前后台多处重复「把 *_json 字符串展开成对象，再删掉原始字符串」，
// 以及「竞赛链接只留 HTTPS」的净化逻辑。集中到这里，避免两处实现漂移。

const { parseJSON, httpsOnly } = require('./validate');

// content_items：meta_json → meta
function parseContent(item) {
  item.meta = parseJSON(item.meta_json, {});
  delete item.meta_json;
  return item;
}

// courses：syllabus_json / outcomes_json / gallery_json → 数组
// 注意：沿用原实现的语义——只「新增」展开字段，保留原始 *_json 列，
// 保证接口返回与历史版本逐字段一致（前端可能仍读取 *_json）。
function parseCourse(course) {
  course.syllabus = parseJSON(course.syllabus_json, []);
  course.outcomes = parseJSON(course.outcomes_json, []);
  course.gallery = parseJSON(course.gallery_json, []);
  return course;
}

// teachers：specialties_json / grade_bands_json → 数组
function parseTeacher(teacher) {
  teacher.specialties = parseJSON(teacher.specialties_json, []);
  teacher.grade_bands = parseJSON(teacher.grade_bands_json, []);
  return teacher;
}

// campuses：facilities_json → 数组
function parseCampus(campus) {
  campus.facilities = parseJSON(campus.facilities_json, []);
  return campus;
}

// education_cases：outcomes_json / gallery_json → 数组
function parseEducationCase(item) {
  item.outcomes = parseJSON(item.outcomes_json, []);
  item.gallery = parseJSON(item.gallery_json, []);
  return item;
}

// competitions：三个外链字段统一只保留 HTTPS，屏蔽 javascript:/data: 等伪协议
function parseCompetition(row) {
  return {
    ...row,
    official_url: httpsOnly(row.official_url),
    registration_url: httpsOnly(row.registration_url),
    notice_url: httpsOnly(row.notice_url)
  };
}

module.exports = {
  parseContent, parseCourse, parseTeacher, parseCampus, parseEducationCase, parseCompetition
};
