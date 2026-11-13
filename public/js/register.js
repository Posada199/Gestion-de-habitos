redirectIfAuthenticated();

const registerForm = document.getElementById('register-form');
const registerAlert = document.getElementById('form-alert');
const registerButton = registerForm.querySelector('button[type="submit"]');

Form.initPasswordToggles();

function validateRegister({ name, email, password, confirmPassword }) {
  const errors = {};
  if (name.length < 2 || name.length > 50) errors.name = 'El nombre debe tener entre 2 y 50 caracteres';
  if (!email) errors.email = 'El email es obligatorio';
  else if (!Form.isEmail(email)) errors.email = 'El email no es válido';
  if (password.length < 8 || password.length > 72) {
    errors.password = 'La contraseña debe tener entre 8 y 72 caracteres';
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'La contraseña debe contener letras y números';
  }
  if (confirmPassword !== password) errors.confirmPassword = 'Las contraseñas no coinciden';
  return errors;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  Form.clearErrors(registerForm);
  Form.hideAlert(registerAlert);

  const values = {
    name: registerForm.elements.name.value.trim(),
    email: registerForm.elements.email.value.trim(),
    password: registerForm.elements.password.value,
    confirmPassword: registerForm.elements.confirmPassword.value,
  };

  const errors = validateRegister(values);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, msg]) => Form.setFieldError(registerForm, field, msg));
    return;
  }

  Form.setLoading(registerButton, true, 'Creando cuenta...');
  try {
    const { name, email, password } = values;
    const { data } = await AuthAPI.register({ name, email, password });
    Session.save(data);
    window.location.replace('/dashboard.html');
  } catch (error) {
    Form.applyServerErrors(registerForm, error);
    Form.showAlert(registerAlert, error.message);
    Form.setLoading(registerButton, false);
  }
});
