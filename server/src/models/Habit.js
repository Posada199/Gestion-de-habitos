const mongoose = require('mongoose');
const { CATEGORIES, FREQUENCIES, STATUSES } = require('../constants/habits');

const goalSchema = new mongoose.Schema(
  {
    target: {
      type: Number,
      required: [true, 'La meta es obligatoria'],
      min: [1, 'La meta debe ser al menos 1'],
      max: [1000, 'La meta no puede superar 1000'],
      validate: { validator: Number.isInteger, message: 'La meta debe ser un número entero' },
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [30, 'La unidad no puede superar 30 caracteres'],
      default: 'veces',
    },
  },
  { _id: false }
);

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del hábito es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'La descripción no puede superar 300 caracteres'],
      default: '',
    },
    category: {
      type: String,
      enum: { values: Object.keys(CATEGORIES), message: 'Categoría inválida' },
      required: [true, 'La categoría es obligatoria'],
    },
    frequency: {
      type: String,
      enum: { values: Object.keys(FREQUENCIES), message: 'Frecuencia inválida' },
      required: [true, 'La frecuencia es obligatoria'],
    },
    goal: {
      type: goalSchema,
      required: [true, 'La meta es obligatoria'],
    },
    status: {
      type: String,
      enum: { values: Object.keys(STATUSES), message: 'Estado inválido' },
      default: 'active',
    },
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, createdAt: -1 });
habitSchema.index({ user: 1, status: 1, category: 1, frequency: 1 });

habitSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.user = ret.user.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Habit', habitSchema);
