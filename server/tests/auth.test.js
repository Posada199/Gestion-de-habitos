process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_SALT_ROUNDS = '4';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

let mongod;

const validUser = { name: 'Ana Pérez', email: 'Ana@Example.com', password: 'secreto123' };

before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await disconnectDB();
  await mongod.stop();
});

describe('GET /api/health', () => {
  it('responde ok con la base de datos conectada', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
  });
});

describe('POST /api/auth/register', () => {
  it('registra un usuario, hashea la contraseña y devuelve un JWT', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.name, 'Ana Pérez');
    assert.equal(res.body.data.user.email, 'ana@example.com');
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(jwt.verify(res.body.data.token, 'test_secret').sub, res.body.data.user.id);

    const stored = await User.findOne({ email: 'ana@example.com' }).select('+password');
    assert.notEqual(stored.password, validUser.password);
    assert.match(stored.password, /^\$2[aby]\$/);
  });

  it('rechaza emails duplicados con 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('valida los campos con 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'no-es-email', password: 'corta' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ['email', 'name', 'password']);
  });

  it('exige letras y números en la contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'solotexto' });
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('inicia sesión con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: validUser.password });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.token, 'string');
    assert.equal(res.body.data.user.email, 'ana@example.com');
  });

  it('rechaza contraseña incorrecta con 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'incorrecta1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Credenciales inválidas');
  });

  it('rechaza usuario inexistente con 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: 'secreto123' });
    assert.equal(res.status, 401);
  });
});

describe('GET /api/auth/me (middleware de autenticación)', () => {
  it('devuelve el usuario autenticado con un token válido', async () => {
    const { body } = await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.data.token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'ana@example.com');
  });

  it('rechaza peticiones sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Token no proporcionado');
  });

  it('rechaza tokens inválidos', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Token inválido');
  });

  it('rechaza tokens expirados', async () => {
    const { body } = await request(app).post('/api/auth/register').send(validUser);
    const expired = jwt.sign({ sub: body.data.user.id }, 'test_secret', { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Token expirado');
  });

  it('rechaza tokens de usuarios eliminados', async () => {
    const { body } = await request(app).post('/api/auth/register').send(validUser);
    await User.deleteMany({});
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.data.token}`);
    assert.equal(res.status, 401);
  });
});
