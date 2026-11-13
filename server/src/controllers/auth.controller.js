const authService = require('../services/auth.service');

async function register(req, res) {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Usuario registrado correctamente', data: { user, token } });
}

async function login(req, res) {
  const { user, token } = await authService.login(req.body);
  res.json({ success: true, message: 'Inicio de sesión exitoso', data: { user, token } });
}

function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { register, login, me };
