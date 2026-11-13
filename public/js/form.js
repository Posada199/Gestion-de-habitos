/* Utilidades de formularios compartidas por login y registro. */
const Form = {
  setFieldError(form, field, message) {
    const input = form.elements[field];
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) errorEl.textContent = message || '';
  },

  clearErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach((el) => {
      Form.setFieldError(form, el.dataset.errorFor, '');
    });
  },

  showAlert(el, message, type = 'error') {
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.hidden = false;
  },

  hideAlert(el) {
    el.hidden = true;
    el.textContent = '';
  },

  setLoading(button, loading, loadingText) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = loading;
    button.textContent = loading ? loadingText : button.dataset.label;
  },

  applyServerErrors(form, error) {
    error.details.forEach(({ field, message }) => Form.setFieldError(form, field, message));
  },

  initPasswordToggles(root = document) {
    root.querySelectorAll('.password-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.target);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.textContent = show ? 'Ocultar' : 'Mostrar';
        button.setAttribute('aria-pressed', String(show));
      });
    });
  },

  consumeFlash() {
    const raw = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
};

/* Si ya hay sesión, las páginas públicas redirigen al dashboard. */
function redirectIfAuthenticated() {
  if (Session.getToken()) window.location.replace('/dashboard.html');
}
