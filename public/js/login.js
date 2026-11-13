redirectIfAuthenticated();

const loginForm = document.getElementById('login-form');
const loginAlert = document.getElementById('form-alert');
const loginButton = loginForm.querySelector('button[type="submit"]');

Form.initPasswordToggles();

const flash = Form.consumeFlash();
if (flash) Form.showAlert(loginAlert, flash.message, flash.type);

function validateLogin({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'El email es obligatorio';
  else if (!Form.isEmail(email)) errors.email = 'El email no es válido';
  if (!password) errors.password = 'La contraseña es obligatoria';
  return errors;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  Form.clearErrors(loginForm);
  Form.hideAlert(loginAlert);

  const payload = {
    email: loginForm.elements.email.value.trim(),
    password: loginForm.elements.password.value,
  };

  const errors = validateLogin(payload);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, msg]) => Form.setFieldError(loginForm, field, msg));
    return;
  }

  Form.setLoading(loginButton, true, 'Ingresando...');
  try {
    const { data } = await AuthAPI.login(payload);
    Session.save(data);
    window.location.replace('/dashboard.html');
  } catch (error) {
    Form.applyServerErrors(loginForm, error);
    Form.showAlert(loginAlert, error.message);
    Form.setLoading(loginButton, false);
  }
});
