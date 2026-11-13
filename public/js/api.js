/* Cliente HTTP y manejo de sesión compartido por todas las páginas. */
const TOKEN_KEY = 'habitmaster_token';
const USER_KEY = 'habitmaster_user';
const FLASH_KEY = 'habitmaster_flash';

const Session = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  save({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setFlash(message, type = 'success') {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Session.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || 'Error inesperado', response.status, data.details);
  }
  return data;
}

const AuthAPI = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  me: () => apiRequest('/auth/me', { auth: true }),
};

function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

const HabitsAPI = {
  options: () => apiRequest('/habits/options', { auth: true }),
  stats: () => apiRequest('/habits/stats', { auth: true }),
  list: (params = {}) => apiRequest(`/habits${toQueryString(params)}`, { auth: true }),
  get: (id) => apiRequest(`/habits/${encodeURIComponent(id)}`, { auth: true }),
  create: (payload) => apiRequest('/habits', { method: 'POST', body: payload, auth: true }),
  update: (id, payload) => apiRequest(`/habits/${encodeURIComponent(id)}`, { method: 'PUT', body: payload, auth: true }),
  setStatus: (id, status) =>
    apiRequest(`/habits/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status }, auth: true }),
  remove: (id) => apiRequest(`/habits/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
};
