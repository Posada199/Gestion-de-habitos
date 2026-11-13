# Arquitectura de HabitMaster

## Visión general

HabitMaster es una aplicación monolítica Node.js/Express que expone una API REST bajo `/api` y sirve el frontend estático (HTML, CSS y JavaScript vanilla) desde `public/`. Al compartir origen no se necesita CORS en desarrollo ni en un despliegue simple.

```
┌───────────────────────────┐        fetch (JSON + Bearer JWT)        ┌───────────────────────────────────────────┐
│ Navegador                 │ ───────────────────────────────────────▶ │ Express                                   │
│ index / register /        │                                          │  helmet → json → routes                   │
│ dashboard (HTML/CSS/JS)   │ ◀─────────────────────────────────────── │   └─ middlewares (rate limit, validate,   │
│ localStorage: token, user │              respuestas JSON             │      authenticate) → controllers          │
└───────────────────────────┘                                          │        → services → models (Mongoose)     │
                                                                       │  errorHandler centralizado                │
                                                                       └──────────────────────┬────────────────────┘
                                                                                              │
                                                                                       ┌──────▼──────┐
                                                                                       │  MongoDB    │
                                                                                       └─────────────┘
```

### Capas del backend

| Capa | Responsabilidad |
|---|---|
| `routes/` | Declara endpoints, validaciones (`express-validator`) y middlewares por ruta |
| `middlewares/` | `authenticate` (JWT), `validate`, `notFound`, `errorHandler` |
| `controllers/` | Traducen HTTP ⇄ servicios; no contienen lógica de negocio |
| `services/` | Lógica de negocio (registro, login, emisión de tokens) |
| `models/` | Esquemas Mongoose, hooks (hash de contraseña) y serialización |
| `config/` | Variables de entorno y conexión a la base de datos |
| `utils/` | `ApiError` (errores HTTP tipados) y helpers de JWT |

Express 5 propaga automáticamente los errores de funciones `async` al `errorHandler`, que normaliza errores de validación de Mongoose, claves duplicadas (11000), JSON mal formado y `ApiError`.

## Modelos de datos

### User

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | String | Obligatorio, 2–50 caracteres, `trim` |
| `email` | String | Obligatorio, único, minúsculas, formato email |
| `password` | String | Obligatorio, hash bcrypt, `select: false` |
| `createdAt` / `updatedAt` | Date | `timestamps` |

- Hook `pre('save')`: hashea la contraseña con bcrypt si fue modificada.
- Método `comparePassword(candidate)`.
- `toJSON` expone `id` y elimina `_id`, `__v` y `password`.

### Habit (definido; CRUD en la fase 2)

| Campo | Tipo | Reglas |
|---|---|---|
| `user` | ObjectId → User | Obligatorio, indexado |
| `name` | String | Obligatorio, máx. 80 |
| `description` | String | Máx. 300 |
| `frequency` | String | `daily` \| `weekly` |
| `color` | String | Hex `#rrggbb` |
| `completions` | [Date] | Días completados |
| `archived` | Boolean | `false` por defecto |
| `createdAt` / `updatedAt` | Date | `timestamps` |

Relación: un `User` tiene muchos `Habit` (1:N).

## Endpoints

| Método | Ruta | Auth | Respuesta OK | Errores |
|---|---|---|---|---|
| GET | `/api/health` | No | 200 `{ status, database }` | — |
| POST | `/api/auth/register` | No | 201 `{ data: { user, token } }` | 400 validación, 409 email duplicado, 429 |
| POST | `/api/auth/login` | No | 200 `{ data: { user, token } }` | 400 validación, 401 credenciales, 429 |
| GET | `/api/auth/me` | Bearer | 200 `{ data: { user } }` | 401 sin token / inválido / expirado / usuario eliminado |

Endpoints planificados (fase 2): `GET/POST /api/habits`, `GET/PUT/DELETE /api/habits/:id`, `POST/DELETE /api/habits/:id/complete`.

## Flujos

### Registro
1. El usuario completa `register.html`; `register.js` valida en cliente.
2. `POST /api/auth/register` → validación → `auth.service.register` comprueba email único → `User.create` (bcrypt en `pre('save')`).
3. Se firma un JWT `{ sub: userId }` y se devuelve `{ user, token }`.
4. El frontend guarda token y usuario en `localStorage` y redirige a `dashboard.html`.

### Login
1. `POST /api/auth/login` → busca el usuario con `+password` → `bcrypt.compare`.
2. Si el usuario no existe se compara contra un hash ficticio para que el tiempo de respuesta no revele qué emails están registrados. Mensaje genérico `Credenciales inválidas`.
3. Respuesta `{ user, token }` → mismo manejo que en el registro.

### Acceso a rutas protegidas
1. `dashboard.js` comprueba que haya token; si no, redirige al login.
2. Llama `GET /api/auth/me` con `Authorization: Bearer <token>`.
3. `authenticate` verifica firma y expiración, carga el usuario y lo deja en `req.user`.
4. Si responde 401, el frontend borra la sesión y redirige al login con un aviso.

### Logout
JWT es stateless: el cierre de sesión elimina el token del `localStorage`.

## Seguridad

- Contraseñas con bcrypt (12 rondas por defecto) y nunca devueltas por la API.
- JWT firmado con `JWT_SECRET` (obligatorio en producción) y expiración configurable.
- `helmet` (cabeceras seguras y CSP; el frontend no usa scripts inline).
- Rate limit de 20 peticiones / 15 min por IP en `register` y `login`.
- Límite de 10 KB en el cuerpo JSON.
- Mensajes de error genéricos en login y ocultación de errores 500 en producción.
