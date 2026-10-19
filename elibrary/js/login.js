document.addEventListener('DOMContentLoaded', () => {
  if(isLoggedIn()){ window.location.href = 'dashboard.html'; return; }
  const passEl = document.getElementById('loginPassword');

  const banner = document.getElementById('formBanner');
  function showBanner(msg, type){
    banner.textContent = msg;
    banner.className = 'form-banner show ' + type;
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;

    const btn = e.target.querySelector('[type="submit"]'); if(btn) btn.disabled = true;
    const result = await loginUser(email, password, remember);
    if(btn) btn.disabled = false;
    if(!result.ok){ showBanner(result.error, 'error'); return; }

    showBanner('Welcome back, ' + result.user.name.split(' ')[0] + '! Redirecting…', 'success');
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('redirect') || '';
    const redirect = /^[a-z0-9-]+\.html([?#][^\s]*)?$/i.test(wanted) ? wanted : 'dashboard.html';
    setTimeout(() => { window.location.href = redirect; }, 500);
  });
});
