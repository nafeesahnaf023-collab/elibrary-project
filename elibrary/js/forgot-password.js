document.addEventListener('DOMContentLoaded', () => {
  if(isLoggedIn()){ window.location.href = 'dashboard.html'; return; }

  const banner = document.getElementById('formBanner');
  function showBanner(msg, type){ banner.textContent = msg; banner.className = 'form-banner show ' + type; }
  const form = document.getElementById('forgotForm');
  const token = new URLSearchParams(window.location.search).get('token');

  /* Step 2: user opened the reset link -> choose a new password (reuses the same form styling) */
  if(token){
    if(!AuthService.checkResetToken(token)){
      showBanner('This reset link is invalid or has expired. Please request a new one.', 'error');
    } else {
      form.innerHTML = `
        <div class="field"><label>New password</label><input type="password" id="newPass" placeholder="At least 6 characters" required></div>
        <div class="field"><label>Confirm new password</label><input type="password" id="newPass2" placeholder="Repeat password" required></div>
        <button class="btn btn-primary btn-block" type="submit">Reset password</button>`;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p1 = document.getElementById('newPass').value, p2 = document.getElementById('newPass2').value;
        if(p1 !== p2){ showBanner("Passwords don't match.", 'error'); return; }
        const r = await AuthService.resetPassword(token, p1);
        if(!r.ok){ showBanner(r.error, 'error'); return; }
        showBanner('Password updated! Redirecting to log in…', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
      });
      return;
    }
  }

  /* Step 1: request a reset link */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const result = await requestPasswordReset(email);
    if(!result.ok){ showBanner(result.error, 'error'); return; }
    showBanner('If that email has an account, a reset link is on its way.', 'success');
    if(result.demoLink){
      // Demo only: there is no mail server, so show the link the email would contain.
      const a = document.createElement('a');
      a.href = result.demoLink; a.textContent = 'Demo mode — open your reset link (valid 15 min)';
      a.style.cssText = 'display:block; margin-top:8px; font-weight:600; color:var(--indigo);';
      banner.appendChild(a);
    }
    e.target.reset();
  });
});
