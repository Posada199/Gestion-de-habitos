const bcrypt = require('bcrypt');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Qpx5kNU3gh4BQ6aG1qkIu1Wqk9zKZq';

async function register({ name, email, password }) {
  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('El email ya está registrado');

  const user = await User.create({ name, email, password });
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  // Compara contra un hash ficticio si el usuario no existe para no revelar emails por tiempo de respuesta.
  const valid = user ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !valid) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }
  return { user, token: signToken(user) };
}

module.exports = { register, login };
