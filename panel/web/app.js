const views = {
  login: document.getElementById('view-login'),
  changePassword: document.getElementById('view-change-password'),
  dashboard: document.getElementById('app'),
};
const userEmailEl = document.getElementById('user-email');
const themeToggleBtn = document.getElementById('theme-toggle');

function showView(name) {
  for (const key of Object.keys(views)) {
    views[key].hidden = key !== name;
  }
}

function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function updateThemeToggleIcon() {
  // Pokazujemy motyw, na ktory kliknięcie przelaczy - ksiezyc gdy jasno, slonko gdy ciemno.
  themeToggleBtn.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('panel-theme', next);
  } catch (e) {}
  updateThemeToggleIcon();
});

updateThemeToggleIcon();

async function api(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `http_${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function loadZones() {
  const statusEl = document.getElementById('zones-status');
  const table = document.getElementById('zones-table');
  const tbody = document.getElementById('zones-body');
  try {
    const result = await api('/zones');
    if (!result.configured) {
      statusEl.textContent = 'Polaczenie z PowerDNS API nie jest jeszcze skonfigurowane.';
      table.hidden = true;
      return;
    }
    if (!result.zones.length) {
      statusEl.textContent = 'Brak stref.';
      table.hidden = true;
      return;
    }
    statusEl.textContent = '';
    tbody.innerHTML = result.zones
      .map((z) => `<tr><td>${z.name}</td><td>${z.kind || ''}</td><td>${z.serial || ''}</td></tr>`)
      .join('');
    table.hidden = false;
  } catch (err) {
    statusEl.textContent = `Blad pobierania stref: ${err.message}`;
    table.hidden = true;
  }
}

async function afterLogin(mustChangePassword, email) {
  userEmailEl.textContent = email;
  if (mustChangePassword) {
    showView('changePassword');
    return;
  }
  showView('dashboard');
  loadZones();
}

async function checkSession() {
  try {
    const me = await api('/auth/me');
    await afterLogin(me.mustChangePassword, me.email);
  } catch {
    showView('login');
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  try {
    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await afterLogin(result.mustChangePassword, result.email);
  } catch {
    errorEl.textContent = 'Nieprawidlowy e-mail lub haslo.';
    errorEl.hidden = false;
  }
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const errorEl = document.getElementById('change-password-error');
  errorEl.hidden = true;
  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    showView('dashboard');
    loadZones();
  } catch (err) {
    errorEl.textContent =
      err.status === 401 ? 'Obecne haslo jest nieprawidlowe.' : 'Nie udalo sie zmienic hasla.';
    errorEl.hidden = false;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  showView('login');
});

checkSession();
