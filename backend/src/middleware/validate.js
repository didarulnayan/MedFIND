const ApiError = require('../utils/ApiError');

/**
 * Validates req[source] against a zod schema and replaces it with the parsed (coerced) value.
 * Express 5 makes req.query a getter, so parsed query values are stored on req.validatedQuery.
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      throw ApiError.badRequest('Validation failed', errors);
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}

module.exports = validate;
