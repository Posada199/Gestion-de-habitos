process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_SALT_ROUNDS = '4';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Habit = require('../src/models/Habit');

let mongod;
let token;
let otherToken;

const baseHabit = {
  name: 'Leer',
  description: 'Leer antes de dormir',
  category: 'estudio',
  frequency: 'daily',
  goal: { target: 20, unit: 'páginas' },
};

async function registerUser(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Usuario Prueba', email, password: 'secreto123' });
  return res.body.data.token;
}

function api(method, url, authToken = token) {
  return request(app)[method](url).set('Authorization', `Bearer ${authToken}`);
}

async function createHabit(overrides = {}, authToken = token) {
  const res = await api('post', '/api/habits', authToken).send({ ...baseHabit, ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.habit;
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
});

beforeEach(async () => {
  token = await registerUser('ana@example.com');
  otherToken = await registerUser('otro@example.com');
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Habit.deleteMany({})]);
});

after(async () => {
  await disconnectDB();
  await mongod.stop();
});

describe('Autenticación de /api/habits', () => {
  it('rechaza solicitudes sin token', async () => {
    const res = await request(app).get('/api/habits');
    assert.equal(res.status, 401);
  });

  it('rechaza tokens inválidos', async () => {
    const res = await api('get', '/api/habits', 'token.falso');
    assert.equal(res.status, 401);
  });
});

describe('POST /api/habits', () => {
  it('crea un hábito activo asociado al usuario', async () => {
    const res = await api('post', '/api/habits').send({ ...baseHabit, user: '000000000000000000000000' });

    assert.equal(res.status, 201);
    const { habit } = res.body.data;
    assert.equal(habit.name, 'Leer');
    assert.equal(habit.category, 'estudio');
    assert.equal(habit.frequency, 'daily');
    assert.deepEqual(habit.goal, { target: 20, unit: 'páginas' });
    assert.equal(habit.status, 'active');
    assert.ok(habit.createdAt);
    assert.ok(habit.id);
    assert.notEqual(habit.user, '000000000000000000000000');
  });

  it('usa "veces" como unidad por defecto', async () => {
    const habit = await createHabit({ goal: { target: 3 } });
    assert.equal(habit.goal.unit, 'veces');
  });

  it('valida los campos obligatorios', async () => {
    const res = await api('post', '/api/habits').send({ name: 'L', category: 'x', frequency: 'yearly', goal: { target: 0 } });

    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field);
    assert.ok(fields.includes('name'));
    assert.ok(fields.includes('category'));
    assert.ok(fields.includes('frequency'));
    assert.ok(fields.includes('goal.target'));
  });

  it('rechaza metas no enteras', async () => {
    const res = await api('post', '/api/habits').send({ ...baseHabit, goal: { target: 2.5 } });
    assert.equal(res.status, 400);
    assert.equal(res.body.details[0].field, 'goal.target');
  });
});

describe('GET /api/habits/:id', () => {
  it('devuelve el hábito del usuario', async () => {
    const habit = await createHabit();
    const res = await api('get', `/api/habits/${habit.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.habit.id, habit.id);
  });

  it('responde 404 para hábitos de otro usuario', async () => {
    const habit = await createHabit({}, otherToken);
    const res = await api('get', `/api/habits/${habit.id}`);
    assert.equal(res.status, 404);
  });

  it('responde 400 para identificadores inválidos', async () => {
    const res = await api('get', '/api/habits/abc');
    assert.equal(res.status, 400);
  });
});

describe('PUT /api/habits/:id', () => {
  it('actualiza el hábito', async () => {
    const habit = await createHabit();
    const res = await api('put', `/api/habits/${habit.id}`).send({
      ...baseHabit,
      name: 'Leer novelas',
      frequency: 'weekly',
      goal: { target: 100, unit: 'páginas' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.habit.name, 'Leer novelas');
    assert.equal(res.body.data.habit.frequency, 'weekly');
    assert.equal(res.body.data.habit.goal.target, 100);
    assert.equal(res.body.data.habit.createdAt, habit.createdAt);
  });

  it('no permite editar hábitos de otro usuario', async () => {
    const habit = await createHabit({}, otherToken);
    const res = await api('put', `/api/habits/${habit.id}`).send({ ...baseHabit, name: 'Hackeado' });
    assert.equal(res.status, 404);
    assert.equal((await Habit.findById(habit.id)).name, 'Leer');
  });
});

describe('PATCH /api/habits/:id/status', () => {
  it('desactiva y activa el hábito', async () => {
    const habit = await createHabit();

    let res = await api('patch', `/api/habits/${habit.id}/status`).send({ status: 'inactive' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.habit.status, 'inactive');
    assert.equal(res.body.message, 'Hábito desactivado');

    res = await api('patch', `/api/habits/${habit.id}/status`).send({ status: 'active' });
    assert.equal(res.body.data.habit.status, 'active');
  });

  it('rechaza estados inválidos', async () => {
    const habit = await createHabit();
    const res = await api('patch', `/api/habits/${habit.id}/status`).send({ status: 'paused' });
    assert.equal(res.status, 400);
  });
});

describe('DELETE /api/habits/:id', () => {
  it('elimina el hábito', async () => {
    const habit = await createHabit();
    const res = await api('delete', `/api/habits/${habit.id}`);
    assert.equal(res.status, 200);
    assert.equal(await Habit.countDocuments(), 0);
  });

  it('no elimina hábitos de otro usuario', async () => {
    const habit = await createHabit({}, otherToken);
    const res = await api('delete', `/api/habits/${habit.id}`);
    assert.equal(res.status, 404);
    assert.equal(await Habit.countDocuments(), 1);
  });
});

describe('GET /api/habits (búsqueda, filtros y paginación)', () => {
  beforeEach(async () => {
    await createHabit({ name: 'Leer', category: 'estudio', frequency: 'daily' });
    await createHabit({ name: 'Correr', description: 'Salir a correr al parque', category: 'ejercicio', frequency: 'weekly' });
    await createHabit({ name: 'Meditar', description: 'Respirar', category: 'mindfulness', frequency: 'daily', status: 'inactive' });
    await createHabit({ name: 'Ahorrar', category: 'finanzas', frequency: 'monthly' }, otherToken);
  });

  it('lista solo los hábitos del usuario, del más reciente al más antiguo', async () => {
    const res = await api('get', '/api/habits');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Meditar', 'Correr', 'Leer']);
    assert.equal(res.body.data.pagination.total, 3);
  });

  it('busca por nombre o descripción sin distinguir mayúsculas', async () => {
    let res = await api('get', '/api/habits?search=LEE');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Leer']);

    res = await api('get', '/api/habits?search=parque');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Correr']);
  });

  it('escapa caracteres especiales de expresiones regulares', async () => {
    const res = await api('get', `/api/habits?search=${encodeURIComponent('.*')}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.habits.length, 0);
  });

  it('filtra por categoría, frecuencia y estado combinados', async () => {
    let res = await api('get', '/api/habits?frequency=daily&status=active');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Leer']);

    res = await api('get', '/api/habits?category=ejercicio');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Correr']);

    res = await api('get', '/api/habits?status=inactive');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Meditar']);
  });

  it('ordena por nombre y pagina resultados', async () => {
    const res = await api('get', '/api/habits?sort=name&limit=2&page=2');
    assert.deepEqual(res.body.data.habits.map((h) => h.name), ['Meditar']);
    assert.deepEqual(res.body.data.pagination, { page: 2, limit: 2, total: 3, pages: 2 });
  });

  it('rechaza filtros inválidos', async () => {
    const res = await api('get', '/api/habits?category=deportes');
    assert.equal(res.status, 400);
  });

  it('calcula estadísticas del usuario', async () => {
    const res = await api('get', '/api/habits/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 3);
    assert.equal(res.body.data.active, 2);
    assert.equal(res.body.data.inactive, 1);
    assert.equal(res.body.data.byCategory.estudio, 1);
    assert.equal(res.body.data.byCategory.finanzas, 0);
  });

  it('expone las opciones de categorías, frecuencias y estados', async () => {
    const res = await api('get', '/api/habits/options');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.some((c) => c.value === 'estudio' && c.label === 'Estudio'));
    assert.deepEqual(res.body.data.frequencies.map((f) => f.value), ['daily', 'weekly', 'monthly']);
  });
});
