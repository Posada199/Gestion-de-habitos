const mongoose = require('mongoose');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Datos inválidos';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    message = `El ${field} ya está registrado`;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON mal formado';
  }

  if (statusCode >= 500) {
    console.error(err);
    if (env.isProduction) message = 'Error interno del servidor';
  }

  const body = { success: false, message };
  if (details) body.details = details;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
