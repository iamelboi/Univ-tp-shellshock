// Gère les formulaires de connexion et d'inscription (data-endpoint sur le <form>)
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  const form = document.querySelector('form[data-endpoint]');
  const error = document.getElementById('auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    try {
      await api('POST', form.dataset.endpoint, {
        username: form.username.value.trim(),
        password: form.password.value,
      });
      location.href = '/';
    } catch (err) {
      error.textContent = err.message;
    }
  });
});
