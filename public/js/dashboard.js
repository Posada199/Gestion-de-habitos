const loader = document.getElementById('loader');
const app = document.getElementById('app');

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function logout(message, type) {
  Session.clear();
  if (message) Session.setFlash(message, type);
  window.location.replace('/');
}

function renderUser(user) {
  const firstName = user.name.split(' ')[0];
  document.getElementById('user-avatar').textContent = initials(user.name);
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('welcome-title').textContent = `${greeting()}, ${firstName}`;
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  document.getElementById('member-since').textContent = new Date(user.createdAt).toLocaleDateString('es', {
    month: 'short',
    year: 'numeric',
  });
}

async function initDashboard() {
  if (!Session.getToken()) {
    window.location.replace('/');
    return;
  }

  try {
    const { data } = await AuthAPI.me();
    Session.save({ token: Session.getToken(), user: data.user });
    renderUser(data.user);
    await HabitsModule.init();
    loader.hidden = true;
    app.hidden = false;
  } catch (error) {
    if (error.status === 401) {
      logout('Tu sesión expiró. Inicia sesión de nuevo.', 'warning');
    } else {
      loader.textContent = error.message;
    }
  }
}

document.getElementById('logout-btn').addEventListener('click', () => logout('Sesión cerrada correctamente.'));

initDashboard();
