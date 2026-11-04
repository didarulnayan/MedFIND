const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}: ${JSON.stringify(err.value)}`;
    errors = undefined;
  } else if (err && err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for ${fields || 'a unique field'}`;
    errors = undefined;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB)' : err.message;
    errors = undefined;
  } else if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
    errors = undefined;
  } else if (!(err instanceof ApiError)) {
    errors = undefined;
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }

  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}

module.exports = { notFound, errorHandler };
