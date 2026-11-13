const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Token no proporcionado'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return next(ApiError.unauthorized(message));
  }

  const user = await User.findById(payload.sub);
  if (!user) return next(ApiError.unauthorized('El usuario del token ya no existe'));

  req.user = user;
  return next();
}

module.exports = authenticate;
