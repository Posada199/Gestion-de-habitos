const { Router } = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Demasiados intentos, inténtalo de nuevo más tarde' },
});

const registerRules = [
  body('name')
    .isString().withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('email')
    .isString().withMessage('El email es obligatorio')
    .trim()
    .isEmail().withMessage('El email no es válido')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isString().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres')
    .matches(/[A-Za-z]/).withMessage('La contraseña debe contener al menos una letra')
    .matches(/\d/).withMessage('La contraseña debe contener al menos un número')
    // bcrypt ignora todo lo que exceda 72 bytes; con caracteres multibyte 72 caracteres pueden superarlo.
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('La contraseña es demasiado larga'),
];

const loginRules = [
  body('email')
    .isString().withMessage('El email es obligatorio')
    .trim()
    .isEmail().withMessage('El email no es válido')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password').isString().notEmpty().withMessage('La contraseña es obligatoria'),
];

router.post('/register', authLimiter, validate(registerRules), authController.register);
router.post('/login', authLimiter, validate(loginRules), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
