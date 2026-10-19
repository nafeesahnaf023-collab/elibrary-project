document.addEventListener('DOMContentLoaded', () => {
  if(isLoggedIn()){ window.location.href = 'dashboard.html'; return; }

  document.getElementById('avatarPlaceholderIcon').innerHTML = ICONS.user;
  document.getElementById('uploadPhotoIcon').innerHTML = ICONS.image;

  const uniSelect = document.getElementById('suUniversity');
  UNIVERSITIES.forEach(u => uniSelect.insertAdjacentHTML('beforeend', `<option value="${u}">${u}</option>`));

  document.getElementById('suDepartment').innerHTML = departmentOptions('', 'Select department');

  const banner = document.getElementById('formBanner');
  function showBanner(msg, type){
    banner.textContent = msg;
    banner.className = 'form-banner show ' + type;
  }

  let uploadedAvatar = null;
  const avatarInput = document.getElementById('avatarInput');
  const avatarImg = document.getElementById('avatarPreviewImg');
  const avatarIcon = document.getElementById('avatarPlaceholderIcon');
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if(!file) return;
    try {
      uploadedAvatar = await resizeImage(file, 256);
      avatarImg.src = uploadedAvatar;
      avatarImg.style.display = 'block';
      avatarIcon.style.display = 'none';
    } catch(err){ avatarInput.value = ''; showBanner(err.message, 'error'); }
  });

  const passInput = document.getElementById('suPassword');
  const strengthBar = document.getElementById('strengthBar');
  passInput.addEventListener('input', () => {
    const v = passInput.value;
    let score = 0;
    if(v.length >= 6) score += 1;
    if(v.length >= 10) score += 1;
    if(/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) score += 1;
    if(/[^a-zA-Z0-9]/.test(v)) score += 1;
    const pct = [0, 30, 55, 80, 100][score];
    const colors = ['var(--red)','var(--red)','var(--amber)','var(--blue)','var(--green)'];
    strengthBar.style.width = pct + '%';
    strengthBar.style.background = colors[score];
  });

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('suName').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    const university = uniSelect.value;
    const department = document.getElementById('suDepartment').value.trim();
    const semester = document.getElementById('suSemester').value;
    const password = passInput.value;
    const confirm = document.getElementById('suConfirmPassword').value;
    const confirmError = document.getElementById('confirmError');

    confirmError.classList.remove('show');
    if(password !== confirm){ confirmError.classList.add('show'); return; }
    if(password.length < 6){ showBanner('Password should be at least 6 characters.', 'error'); return; }

    const btn = e.target.querySelector('[type="submit"]'); if(btn) btn.disabled = true;
    const result = await signupUser({ name, email, university, department, semester, password, avatar: uploadedAvatar });
    if(btn) btn.disabled = false;
    if(!result.ok){ showBanner(result.error, 'error'); return; }

    showBanner('Account created! Redirecting to your dashboard…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  });
});
