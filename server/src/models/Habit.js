const mongoose = require('mongoose');

// Modelo preparado para la fase 2 (CRUD de hábitos y seguimiento).
const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del hábito es obligatorio'],
      trim: true,
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'La descripción no puede superar 300 caracteres'],
      default: '',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    color: {
      type: String,
      match: [/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido'],
      default: '#6366f1',
    },
    completions: [{ type: Date }],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

habitSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Habit', habitSchema);
