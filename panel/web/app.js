const { t, getLang, setLang, locale, applyStaticTranslations } = window.PANEL_I18N;

const authShellEl = document.getElementById('auth-shell');
const views = {
  login: document.getElementById('view-login'),
  changePassword: document.getElementById('view-change-password'),
  pin: document.getElementById('view-pin'),
  dashboard: document.getElementById('app'),
};
const userEmailEl = document.getElementById('user-email');
const themeToggleBtns = document.querySelectorAll('.theme-toggle');
const footerClockEls = document.querySelectorAll('.footer-clock');

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

function tickClock() {
  const text = new Date().toLocaleString(locale());
  footerClockEls.forEach((el) => (el.textContent = text));
}
tickClock();
setInterval(tickClock, 1000);

function showView(name) {
  for (const key of Object.keys(views)) {
    views[key].hidden = key !== name;
  }
  authShellEl.hidden = name === 'dashboard';
}

function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const SUN_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function updateThemeToggleIcon() {
  const icon = currentTheme() === 'dark' ? SUN_ICON : MOON_ICON;
  themeToggleBtns.forEach((btn) => (btn.innerHTML = icon));
}

themeToggleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('panel-theme', next);
    } catch (e) {}
    updateThemeToggleIcon();
  });
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
      loadDnsServers();
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
    loadDnsServers();
  }
  if (name === 'settings') loadSettingsInfo();
}

tabs.forEach((tb) => tb.addEventListener('click', () => switchTab(tb.dataset.tab)));

setInterval(() => {
  if (!views.dashboard.hidden && activeTab === 'zones') {
    loadSystemStats();
  }
}, 15000);

async function api(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = [body.error, body.message].filter(Boolean).join(': ');
    const err = new Error(msg || `http_${res.status}`);
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
      .map(
        (z) => `
          <tr>
            <td>${z.name}</td>
            <td>${z.kind || ''}</td>
            <td>${z.serial || ''}</td>
            <td><button type="button" class="secondary zone-edit-btn" data-id="${z.id}" data-name="${z.name}">${t('edit_btn')}</button></td>
          </tr>
        `
      )
      .join('');
    table.hidden = false;
    tbody.querySelectorAll('.zone-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openZoneEditor(btn.dataset.id, btn.dataset.name));
    });
  } catch (err) {
    statusEl.textContent = t('zones_error', { message: err.message });
    table.hidden = true;
  }
}

let currentZoneId = null;

function openZoneEditor(zoneId, zoneName) {
  currentZoneId = zoneId;
  document.getElementById('zones-overview').hidden = true;
  document.getElementById('zone-editor').hidden = false;
  document.getElementById('zone-editor-name').textContent = zoneName;
  document.getElementById('record-form').reset();
  document.getElementById('record-ttl').value = 3600;
  loadZoneRecords();
}

function closeZoneEditor() {
  currentZoneId = null;
  document.getElementById('zone-editor').hidden = true;
  document.getElementById('zones-overview').hidden = false;
}

document.getElementById('zone-editor-close').addEventListener('click', closeZoneEditor);

async function loadZoneRecords() {
  const statusEl = document.getElementById('zone-editor-status');
  const table = document.getElementById('zone-records-table');
  const tbody = document.getElementById('zone-records-body');
  statusEl.hidden = true;
  try {
    const zone = await api(`/zones/${encodeURIComponent(currentZoneId)}`);
    const rrsets = zone.rrsets || [];
    if (!rrsets.length) {
      statusEl.textContent = t('zone_records_empty');
      statusEl.hidden = false;
      table.hidden = true;
      return;
    }
    tbody.innerHTML = rrsets
      .map((rr) => {
        const allContent = (rr.records || []).map((r) => r.content).join(', ');
        const editContent = (rr.records || []).map((r) => r.content).join('\n');
        return `
          <tr>
            <td>${rr.name}</td>
            <td>${rr.type}</td>
            <td>${rr.ttl}</td>
            <td>${allContent}</td>
            <td>
              <button type="button" class="secondary record-edit-btn" data-name="${rr.name}" data-type="${rr.type}" data-ttl="${rr.ttl}" data-content="${escapeAttr(editContent)}">${t('edit_btn')}</button>
              <button type="button" class="secondary danger record-delete-btn" data-name="${rr.name}" data-type="${rr.type}">${t('delete_btn')}</button>
            </td>
          </tr>
        `;
      })
      .join('');
    table.hidden = false;

    tbody.querySelectorAll('.record-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('record-name').value = btn.dataset.name;
        document.getElementById('record-type').value = btn.dataset.type;
        document.getElementById('record-ttl').value = btn.dataset.ttl;
        document.getElementById('record-content').value = btn.dataset.content;
      });
    });
    tbody.querySelectorAll('.record-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('delete_record_confirm'))) return;
        try {
          await api(`/zones/${encodeURIComponent(currentZoneId)}/rrset`, {
            method: 'DELETE',
            body: JSON.stringify({ name: btn.dataset.name, type: btn.dataset.type }),
          });
          loadZoneRecords();
        } catch (err) {
          alert(`${t('record_error')}: ${err.message}`);
        }
      });
    });
  } catch (err) {
    statusEl.textContent = t('zone_records_error', { message: err.message });
    statusEl.hidden = false;
    table.hidden = true;
  }
}

document.getElementById('record-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('record-name').value;
  const type = document.getElementById('record-type').value;
  const ttl = document.getElementById('record-ttl').value;
  const records = document
    .getElementById('record-content')
    .value.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const errorEl = document.getElementById('record-error');
  const successEl = document.getElementById('record-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  try {
    await api(`/zones/${encodeURIComponent(currentZoneId)}/rrset`, {
      method: 'PUT',
      body: JSON.stringify({ name, type, ttl, records }),
    });
    successEl.textContent = t('record_saved');
    successEl.hidden = false;
    loadZoneRecords();
  } catch (err) {
    errorEl.textContent = `${t('record_error')}: ${err.message}`;
    errorEl.hidden = false;
  }
});

async function loadDnsServers() {
  const statusEl = document.getElementById('dns-servers-status');
  const listEl = document.getElementById('dns-servers-list');
  try {
    const result = await api('/dns-servers');
    if (!result.servers.length) {
      const key = result.error ? `dns_servers_${result.error}` : 'dns_servers_empty';
      statusEl.textContent = t(key, result.message ? { message: result.message } : undefined);
      statusEl.hidden = false;
      listEl.innerHTML = '';
      return;
    }
    statusEl.hidden = true;
    listEl.innerHTML = result.servers
      .map((s) => {
        const roleLabel = s.role === 'primary' ? t('role_primary') : t('role_secondary');
        const address = s.address || t('address_unset');
        const address6Text = s.address6 ? ` / ${s.address6}` : '';
        const flagImg = s.countryIso
          ? `<img class="flag-icon" src="/flags/${s.countryIso.toLowerCase()}.svg" alt="${s.countryIso}" />`
          : '';
        const locationText = s.location
          ? ` <span class="server-address">${flagImg}(${s.location})</span>`
          : '';
        const statusBadge = s.status
          ? `<span class="badge ${s.status}">${t('status_' + s.status)}</span>`
          : '';
        return `
          <div class="server-row">
            <span class="server-name">${s.name}${locationText} <span class="badge ${s.role}">${roleLabel}</span> ${statusBadge}</span>
            <span class="server-address">${address}${address6Text}</span>
          </div>
        `;
      })
      .join('');
  } catch {
    statusEl.textContent = t('dns_servers_error');
    statusEl.hidden = false;
    listEl.innerHTML = '';
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
  loadPowerdnsSettings();
  loadPinSettings();
}

async function loadPowerdnsSettings() {
  const hintEl = document.getElementById('powerdns-api-key-hint');
  try {
    const result = await api('/settings/powerdns');
    document.getElementById('powerdns-address').value = result.address;
    document.getElementById('powerdns-port').value = result.port;
    document.getElementById('powerdns-zone').value = result.zone || '';
    hintEl.textContent = t('powerdns_api_key_hint_set');
    hintEl.hidden = !result.apiKeySet;
  } catch {
    // sesja wygasla - jak wyzej
  }
}

document.getElementById('powerdns-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const address = document.getElementById('powerdns-address').value;
  const port = document.getElementById('powerdns-port').value;
  const apiKey = document.getElementById('powerdns-api-key').value;
  const zone = document.getElementById('powerdns-zone').value;
  const errorEl = document.getElementById('powerdns-error');
  const successEl = document.getElementById('powerdns-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  try {
    const result = await api('/settings/powerdns', {
      method: 'PUT',
      body: JSON.stringify({ address, port, apiKey, zone }),
    });
    document.getElementById('powerdns-api-key').value = '';
    document.getElementById('powerdns-api-key-hint').hidden = !result.apiKeySet;
    successEl.textContent = t('powerdns_save_success');
    successEl.hidden = false;
  } catch (err) {
    const detail = [err.status, err.message].filter(Boolean).join(' ');
    errorEl.textContent = detail ? `${t('powerdns_save_error')} (${detail})` : t('powerdns_save_error');
    errorEl.hidden = false;
  }
});

document.getElementById('powerdns-test-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('powerdns-test-status');
  statusEl.textContent = t('powerdns_test_running');
  try {
    const result = await api('/settings/powerdns/test', { method: 'POST' });
    if (result.ok) {
      statusEl.textContent = t('powerdns_test_ok', { version: result.version || '' });
    } else if (result.error === 'not_configured') {
      statusEl.textContent = t('powerdns_test_not_configured');
    } else {
      statusEl.textContent = t('powerdns_test_error', { error: result.error });
    }
  } catch (err) {
    statusEl.textContent = t('powerdns_test_error', { error: err.message });
  }
});

async function loadPinSettings() {
  const statusEl = document.getElementById('pin-status');
  const enableBtn = document.getElementById('pin-enable-btn');
  const disableBtn = document.getElementById('pin-disable-btn');
  const codeInput = document.getElementById('pin-settings-code');
  try {
    const result = await api('/settings/pin');
    statusEl.textContent = result.enabled ? t('pin_status_on') : t('pin_status_off');
    enableBtn.hidden = result.enabled;
    disableBtn.hidden = !result.enabled;
    codeInput.required = !result.enabled;
  } catch {
    statusEl.textContent = '';
  }
}

document.getElementById('pin-settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('pin-settings-password').value;
  const pin = document.getElementById('pin-settings-code').value;
  const errorEl = document.getElementById('pin-settings-error');
  const successEl = document.getElementById('pin-settings-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  try {
    await api('/settings/pin', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, enabled: true, pin }),
    });
    document.getElementById('pin-settings-password').value = '';
    document.getElementById('pin-settings-code').value = '';
    successEl.textContent = t('pin_save_success');
    successEl.hidden = false;
    loadPinSettings();
  } catch (err) {
    errorEl.textContent = err.status === 401 ? t('pin_error_wrong_password') : t('pin_error_generic');
    errorEl.hidden = false;
  }
});

document.getElementById('pin-disable-btn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('pin-settings-password').value;
  const errorEl = document.getElementById('pin-settings-error');
  const successEl = document.getElementById('pin-settings-success');
  errorEl.hidden = true;
  successEl.hidden = true;
  if (!currentPassword) {
    errorEl.textContent = t('pin_error_need_password');
    errorEl.hidden = false;
    return;
  }
  try {
    await api('/settings/pin', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, enabled: false }),
    });
    document.getElementById('pin-settings-password').value = '';
    successEl.textContent = t('pin_save_success');
    successEl.hidden = false;
    loadPinSettings();
  } catch (err) {
    errorEl.textContent = err.status === 401 ? t('pin_error_wrong_password') : t('pin_error_generic');
    errorEl.hidden = false;
  }
});

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
    if (result.pinRequired) {
      document.getElementById('pin-code').value = '';
      showView('pin');
      return;
    }
    await afterLogin(result.mustChangePassword, result.email);
  } catch {
    errorEl.textContent = t('login_error');
    errorEl.hidden = false;
  }
});

document.getElementById('pin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = document.getElementById('pin-code').value;
  const errorEl = document.getElementById('pin-error');
  errorEl.hidden = true;
  try {
    const result = await api('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    await afterLogin(result.mustChangePassword, result.email);
  } catch {
    errorEl.textContent = t('pin_error_invalid');
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
