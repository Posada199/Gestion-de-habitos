# HabitMaster

Sistema web de gestión de hábitos. Permite a cada usuario registrarse, iniciar sesión y gestionar sus hábitos (crear, editar, eliminar, consultar, buscar, filtrar y activar/desactivar). El seguimiento diario y las rachas llegan en la siguiente fase.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript vanilla (servido por Express desde `public/`) |
| Backend | Node.js (>= 20.19) + Express 5 |
| Base de datos | MongoDB + Mongoose |
| Autenticación | JWT (`jsonwebtoken`) + `bcrypt` |
| Seguridad | `helmet`, `express-validator`, `express-rate-limit`, CORS configurable |
| Pruebas | `node:test` + Supertest + `mongodb-memory-server` |

## Requisitos

- Node.js 20.19 o superior y npm
- MongoDB 6+ en local, en Docker o en MongoDB Atlas

## Puesta en marcha

```bash
git clone https://github.com/Posada199/Gestion-de-habitos.git
cd Gestion-de-habitos
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# edita .env (MONGODB_URI y JWT_SECRET)
npm run dev                  # o: npm start
```

Abre http://localhost:3000.

Si no tienes MongoDB instalado puedes levantarlo con Docker:

```bash
docker run -d --name habitmaster-mongo -p 27017:27017 mongo:7
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor |
| `npm run dev` | Inicia el servidor con recarga automática (nodemon) |
| `npm test` | Ejecuta las pruebas de integración (usa una MongoDB en memoria, no necesita BD local) |

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Descripción | Por defecto |
|---|---|---|
| `NODE_ENV` | `development`, `production` o `test` | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/habitmaster` |
| `JWT_SECRET` | Secreto para firmar tokens (obligatorio en producción) | — |
| `JWT_EXPIRES_IN` | Expiración del token | `7d` |
| `BCRYPT_SALT_ROUNDS` | Rondas de sal de bcrypt | `12` |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma (vacío = mismo origen) | — |

## Estructura del proyecto

```
Gestion-de-habitos/
├── server/
│   ├── src/
│   │   ├── config/        # env.js (variables), db.js (conexión Mongoose)
│   │   ├── constants/     # habits.js (categorías, frecuencias, estados, orden)
│   │   ├── models/        # User.js, Habit.js
│   │   ├── controllers/   # Capa HTTP: lee req, responde res
│   │   ├── services/      # Lógica de negocio
│   │   ├── routes/        # Definición de endpoints y validaciones
│   │   ├── middlewares/   # auth (JWT), validate, notFound, errorHandler
│   │   ├── utils/         # ApiError, jwt
│   │   ├── app.js         # Configuración de Express
│   │   └── server.js      # Arranque: conexión a BD + listen
│   └── tests/             # Pruebas de integración
├── public/                # Frontend estático
│   ├── index.html         # Login
│   ├── register.html      # Registro
│   ├── dashboard.html     # Dashboard (protegido)
│   ├── css/styles.css
│   └── js/                # api.js, form.js, login.js, register.js, dashboard.js, habits.js
├── docs/ARCHITECTURE.md   # Arquitectura, modelos, endpoints y flujos
├── .env.example
└── package.json
```

## API

Todas las respuestas son JSON con la forma `{ success, message?, data?, details? }`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Estado del servidor y de la base de datos |
| POST | `/api/auth/register` | No | Registro. Body: `{ name, email, password }` |
| POST | `/api/auth/login` | No | Login. Body: `{ email, password }` |
| GET | `/api/auth/me` | Bearer JWT | Datos del usuario autenticado |
| GET | `/api/habits` | Bearer JWT | Lista paginada. Query: `search`, `category`, `frequency`, `status`, `sort` (`newest`\|`oldest`\|`name`), `page`, `limit` (máx. 50) |
| POST | `/api/habits` | Bearer JWT | Crear. Body: `{ name, description?, category, frequency, goal: { target, unit? }, status? }` |
| GET | `/api/habits/:id` | Bearer JWT | Consultar un hábito |
| PUT | `/api/habits/:id` | Bearer JWT | Editar (mismo body que crear) |
| PATCH | `/api/habits/:id/status` | Bearer JWT | Activar/desactivar. Body: `{ status: "active" \| "inactive" }` |
| DELETE | `/api/habits/:id` | Bearer JWT | Eliminar |
| GET | `/api/habits/stats` | Bearer JWT | Totales, activos, inactivos y conteo por categoría |
| GET | `/api/habits/options` | Bearer JWT | Categorías, frecuencias y estados disponibles (con etiquetas) |

Cada usuario solo ve y modifica sus propios hábitos: un hábito de otro usuario responde `404`.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"secreto123"}'

curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

Reglas de validación:

- Usuario: nombre de 2 a 50 caracteres, email válido y único, contraseña de 8 a 72 caracteres con al menos una letra y un número.
- Hábito: nombre de 2 a 80 caracteres, descripción de hasta 300, categoría (`salud`, `ejercicio`, `alimentacion`, `estudio`, `trabajo`, `finanzas`, `mindfulness`, `social`, `hogar`, `otro`), frecuencia (`daily`, `weekly`, `monthly`), meta entera de 1 a 1000 con unidad opcional de hasta 30 caracteres (por defecto `veces`) y estado (`active`, `inactive`).

Más detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Hoja de ruta

- [x] Fase 1: arquitectura, configuración, autenticación (registro, login, JWT, bcrypt, middleware) e interfaces de login, registro y dashboard
- [x] Fase 2: gestión de hábitos (CRUD, búsqueda, filtros, activar/desactivar)
- [ ] Fase 3: seguimiento diario, rachas y estadísticas
