const ApiError = require('../utils/ApiError');

// validate({ body, query, params }) -> parsed values on req.valid
module.exports = (schemas) => (req, res, next) => {
  const valid = {};
  const issues = [];
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      for (const i of result.error.issues) {
        issues.push({ path: `${key}.${i.path.join('.')}`.replace(/\.$/, ''), message: i.message });
      }
    } else {
      valid[key] = result.data;
    }
  }
  if (issues.length) return next(ApiError.badRequest('Validation failed', issues));
  req.valid = valid;
  return next();
};
