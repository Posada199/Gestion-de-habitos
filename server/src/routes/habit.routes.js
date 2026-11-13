const { Router } = require('express');
const { body, param, query } = require('express-validator');

const habitController = require('../controllers/habit.controller');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { CATEGORIES, FREQUENCIES, STATUSES, SORTS } = require('../constants/habits');

const router = Router();

const categoryValues = Object.keys(CATEGORIES);
const frequencyValues = Object.keys(FREQUENCIES);
const statusValues = Object.keys(STATUSES);

const idRule = param('id').isMongoId().withMessage('Identificador de hábito inválido');

const habitBodyRules = [
  body('name')
    .isString().withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('El nombre debe tener entre 2 y 80 caracteres'),
  body('description')
    .optional({ values: 'null' })
    .isString().withMessage('La descripción debe ser texto')
    .trim()
    .isLength({ max: 300 }).withMessage('La descripción no puede superar 300 caracteres'),
  body('category').isIn(categoryValues).withMessage('Selecciona una categoría válida'),
  body('frequency').isIn(frequencyValues).withMessage('Selecciona una frecuencia válida'),
  body('goal.target')
    .isInt({ min: 1, max: 1000 }).withMessage('La meta debe ser un número entero entre 1 y 1000')
    .toInt(),
  body('goal.unit')
    .optional({ values: 'falsy' })
    .isString().withMessage('La unidad debe ser texto')
    .trim()
    .isLength({ max: 30 }).withMessage('La unidad no puede superar 30 caracteres'),
  body('status').optional().isIn(statusValues).withMessage('Estado inválido'),
];

const listRules = [
  query('search')
    .optional()
    .isString().withMessage('La búsqueda debe ser texto')
    .trim()
    .isLength({ max: 80 }).withMessage('La búsqueda no puede superar 80 caracteres'),
  query('category').optional({ values: 'falsy' }).isIn(categoryValues).withMessage('Categoría inválida'),
  query('frequency').optional({ values: 'falsy' }).isIn(frequencyValues).withMessage('Frecuencia inválida'),
  query('status').optional({ values: 'falsy' }).isIn(statusValues).withMessage('Estado inválido'),
  query('sort').optional({ values: 'falsy' }).isIn(Object.keys(SORTS)).withMessage('Orden inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('El límite debe estar entre 1 y 50').toInt(),
];

router.use(authenticate);

router.get('/options', habitController.options);
router.get('/stats', habitController.stats);
router.get('/', validate(listRules), habitController.list);
router.post('/', validate(habitBodyRules), habitController.create);
router.get('/:id', validate([idRule]), habitController.getOne);
router.put('/:id', validate([idRule, ...habitBodyRules]), habitController.update);
router.patch(
  '/:id/status',
  validate([idRule, body('status').isIn(statusValues).withMessage('El estado debe ser active o inactive')]),
  habitController.setStatus
);
router.delete('/:id', validate([idRule]), habitController.remove);

module.exports = router;
