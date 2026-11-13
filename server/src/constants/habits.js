const CATEGORIES = {
  salud: 'Salud',
  ejercicio: 'Ejercicio',
  alimentacion: 'Alimentación',
  estudio: 'Estudio',
  trabajo: 'Trabajo',
  finanzas: 'Finanzas',
  mindfulness: 'Mindfulness',
  social: 'Social',
  hogar: 'Hogar',
  otro: 'Otro',
};

const FREQUENCIES = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const STATUSES = {
  active: 'Activo',
  inactive: 'Inactivo',
};

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};

module.exports = { CATEGORIES, FREQUENCIES, STATUSES, SORTS };
