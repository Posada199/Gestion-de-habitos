const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();
      const details = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
      return next(ApiError.badRequest(details[0].message, details));
    },
  ];
}

module.exports = validate;
