const { t, getLang, setLang, locale, applyStaticTranslations } = window.PANEL_I18N;

const views = {
  login: document.getElementById('view-login'),
  changePassword: document.getElementById('view-change-password'),
  dashboard: document.getElementById('app'),
};
const userEmailEl = document.getElementById('user-email');
const themeToggleBtn = document.getElementById('theme-toggle');
const footerClockEl = document.getElementById('footer-clock');

function tickClock() {
  footerClockEl.textContent = new Date().toLocaleString(locale());
}
tickClock();
setInterval(tickClock, 1000);

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

function updateLangSwitchUI() {
  const lang = getLang();
  document.querySelectorAll('.lang-switch[data-lang]').forEach((el) => {
    el.classList.toggle('active', el.dataset.lang === lang);
  });
}

document.querySelectorAll('.lang-switch[data-lang]').forEach((el) => {
  el.addEventListener('click', () => {
    if (getLang() === el.dataset.lang) return;
    setLang(el.dataset.lang);
    applyStaticTranslations();
    updateThemeToggleIcon();
    updateLangSwitchUI();
    if (!views.dashboard.hidden && activeTab === 'zones') {
      loadSystemStats();
      loadZones();
    }
  });
});

applyStaticTranslations();
updateLangSwitchUI();

const tabs = document.querySelectorAll('.tab[data-tab]');
const contentPanels = {
  zones: document.getElementById('content-zones'),
  settings: document.getElementById('content-settings'),
};
let activeTab = 'zones';

function switchTab(name) {
  activeTab = name;
  tabs.forEach((tb) => tb.classList.toggle('active', tb.dataset.tab === name));
  Object.keys(contentPanels).forEach((key) => {
    contentPanels[key].hidden = key !== name;
  });
  if (name === 'zones') {
    loadSystemStats();
    loadZones();
  }
  if (name === 'settings') loadSettingsInfo();
}

tabs.forEach((tb) => tb.addEventListener('click', () => switchTab(tb.dataset.tab)));

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

function fmtBytes(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return v.toFixed(1) + ' ' + units[i];
}

function severity(percent) {
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'warning';
  return 'good';
}

function meterTile(label, percent, detail) {
  const pct = Math.min(100, Math.max(0, percent || 0));
  return `
    <div class="stat-tile">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${pct}%</div>
      <div class="meter-track"><div class="meter-fill ${severity(pct)}" style="width:${pct}%"></div></div>
      ${detail ? `<div class="stat-detail">${detail}</div>` : ''}
    </div>
  `;
}

function valueTile(label, value) {
  return `
    <div class="stat-tile">
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="font-size:18px;">${value}</div>
    </div>
  `;
}

async function loadSystemStats() {
  const grid = document.getElementById('system-grid');
  try {
    const info = await api('/stats');
    const cpuDetail = info.cpu ? `${info.cpu.model || '-'} (${info.cpu.cores} ${t('cores_suffix')})` : '';
    const ramDetail = info.memory ? `${fmtBytes(info.memory.usedBytes)} / ${fmtBytes(info.memory.totalBytes)}` : '';
    const swapDetail = info.swap ? `${fmtBytes(info.swap.usedBytes)} / ${fmtBytes(info.swap.totalBytes)}` : '';
    const diskDetail = info.disk ? `${fmtBytes(info.disk.usedBytes)} / ${fmtBytes(info.disk.totalBytes)}` : '';

    grid.innerHTML = `
      ${meterTile(t('cpu'), info.cpu ? info.cpu.usagePercent : 0, cpuDetail)}
      ${meterTile(t('ram'), info.memory ? info.memory.usedPercent : 0, ramDetail)}
      ${info.swap ? meterTile(t('swap'), info.swap.usedPercent, swapDetail) : valueTile(t('swap'), t('swap_none'))}
      ${info.disk ? meterTile(t('disk'), info.disk.usedPercent, diskDetail) : valueTile(t('disk'), '-')}
    `;
  } catch {
    grid.innerHTML = `<p class="error-msg">${t('stats_error')}</p>`;
  }
}

async function loadZones() {
  const statusEl = document.getElementById('zones-status');
  const table = document.getElementById('zones-table');
  const tbody = document.getElementById('zones-body');
  try {
    const result = await api('/zones');
    if (!result.configured) {
      statusEl.textContent = t('zones_not_configured');
      table.hidden = true;
      return;
    }
    if (!result.zones.length) {
      statusEl.textContent = t('zones_empty');
      table.hidden = true;
      return;
    }
    statusEl.textContent = '';
    tbody.innerHTML = result.zones
      .map((z) => `<tr><td>${z.name}</td><td>${z.kind || ''}</td><td>${z.serial || ''}</td></tr>`)
      .join('');
    table.hidden = false;
  } catch (err) {
    statusEl.textContent = t('zones_error', { message: err.message });
    table.hidden = true;
  }
}

async function loadSettingsInfo() {
  const emailInput = document.getElementById('settings-email');
  const roleEl = document.getElementById('info-role');
  const createdEl = document.getElementById('info-created');
  try {
    const me = await api('/auth/me');
    emailInput.value = me.email;
    roleEl.textContent = me.role;
    createdEl.textContent = new Date(me.createdAt.replace(' ', 'T') + 'Z').toLocaleString(locale());
  } catch {
    // sesja wygasla - checkSession przy nastepnej akcji i tak przekieruje do logowania
  }
}

document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newEmail = document.getElementById('settings-email').value;
  const errorEl = document.getElementById('email-error');
  const successEl = document.getElementById('email-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  const currentPassword = document.getElementById('settings-email-password').value;
  try {
    const result = await api('/auth/email', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newEmail }),
    });
    userEmailEl.textContent = result.email;
    document.getElementById('settings-email-password').value = '';
    successEl.textContent = t('email_success');
    successEl.hidden = false;
  } catch (err) {
    if (err.status === 401) errorEl.textContent = t('email_error_wrong_password');
    else if (err.status === 409) errorEl.textContent = t('email_error_taken');
    else errorEl.textContent = t('email_error_generic');
    errorEl.hidden = false;
  }
});

document.getElementById('settings-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('settings-current-password').value;
  const newPassword = document.getElementById('settings-new-password').value;
  const errorEl = document.getElementById('settings-password-error');
  const successEl = document.getElementById('settings-password-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    e.target.reset();
    successEl.textContent = t('settings_password_success');
    successEl.hidden = false;
  } catch (err) {
    errorEl.textContent = err.status === 401 ? t('change_password_error_wrong') : t('change_password_error_generic');
    errorEl.hidden = false;
  }
});

async function afterLogin(mustChangePassword, email) {
  userEmailEl.textContent = email;
  if (mustChangePassword) {
    showView('changePassword');
    return;
  }
  showView('dashboard');
  switchTab('zones');
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
    errorEl.textContent = t('login_error');
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
    errorEl.textContent = err.status === 401 ? t('change_password_error_wrong') : t('change_password_error_generic');
    errorEl.hidden = false;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  showView('login');
});

checkSession();
