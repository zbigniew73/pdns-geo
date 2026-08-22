(function () {
  'use strict';

  var DICT = {
    pl: {
      login_email_label: 'E-mail',
      login_password_label: 'Haslo',
      login_btn: 'Zaloguj',
      login_error: 'Nieprawidlowy e-mail lub haslo.',

      change_password_title: 'Wymagana zmiana hasla',
      change_password_hint: 'To pierwsze logowanie na tymczasowym hasle — ustaw nowe, zeby kontynuowac.',
      current_password_label: 'Obecne haslo',
      new_password_label: 'Nowe haslo (min. 8 znakow)',
      change_password_btn: 'Zmien haslo',
      change_password_error_wrong: 'Obecne haslo jest nieprawidlowe.',
      change_password_error_generic: 'Nie udalo sie zmienic hasla.',

      theme_toggle_title: 'Zmien motyw',
      logout_btn: 'Wyloguj',

      nav_main: 'Glowne',
      tab_zones: 'Strefy DNS',
      tab_settings: 'Ustawienia',

      cpu: 'CPU',
      ram: 'RAM',
      swap: 'SWAP',
      swap_none: 'brak',
      disk: 'DYSK',
      cores_suffix: 'rdzeni',
      stats_error: 'Blad pobierania statystyk systemu.',

      zones_title: 'Strefy DNS',
      zones_not_configured: 'Polaczenie z PowerDNS API nie jest jeszcze skonfigurowane.',
      zones_empty: 'Brak stref.',
      zones_error: 'Blad pobierania stref: {message}',
      th_name: 'Nazwa',
      th_type: 'Typ',
      th_serial: 'Serial',

      dns_servers_title: 'Serwery DNS',
      dns_servers_empty: 'Brak skonfigurowanych serwerow (edytuj panel/server/config/dns-servers.json).',
      dns_servers_error: 'Blad pobierania listy serwerow.',
      role_primary: 'primary',
      role_secondary: 'secondary',
      address_unset: 'adres nieustawiony',

      admin_info_title: 'Informacje Administratora',
      current_email_label: 'Aktualny e-mail',
      save_email_btn: 'Zapisz e-mail',
      email_error_wrong_password: 'Obecne haslo jest nieprawidlowe.',
      email_error_taken: 'Ten e-mail jest juz uzywany przez inne konto.',
      email_error_generic: 'Nie udalo sie zmienic e-mail.',
      email_success: 'E-mail zmieniony.',
      save_password_btn: 'Zmien haslo',
      settings_password_success: 'Haslo zmienione.',

      account_info_title: 'Konto',
      role_label: 'Rola',
      created_label: 'Utworzono',
    },
    en: {
      login_email_label: 'Email',
      login_password_label: 'Password',
      login_btn: 'Log in',
      login_error: 'Invalid email or password.',

      change_password_title: 'Password change required',
      change_password_hint: 'This is your first login with a temporary password — set a new one to continue.',
      current_password_label: 'Current password',
      new_password_label: 'New password (min. 8 characters)',
      change_password_btn: 'Change password',
      change_password_error_wrong: 'Current password is incorrect.',
      change_password_error_generic: 'Failed to change password.',

      theme_toggle_title: 'Toggle theme',
      logout_btn: 'Log out',

      nav_main: 'Main',
      tab_zones: 'DNS zones',
      tab_settings: 'Settings',

      cpu: 'CPU',
      ram: 'RAM',
      swap: 'SWAP',
      swap_none: 'none',
      disk: 'DISK',
      cores_suffix: 'cores',
      stats_error: 'Failed to load system stats.',

      zones_title: 'DNS zones',
      zones_not_configured: 'Connection to the PowerDNS API is not configured yet.',
      zones_empty: 'No zones.',
      zones_error: 'Error loading zones: {message}',
      th_name: 'Name',
      th_type: 'Type',
      th_serial: 'Serial',

      dns_servers_title: 'DNS Servers',
      dns_servers_empty: 'No servers configured (edit panel/server/config/dns-servers.json).',
      dns_servers_error: 'Failed to load the server list.',
      role_primary: 'primary',
      role_secondary: 'secondary',
      address_unset: 'address not set',

      admin_info_title: 'Administrator Information',
      current_email_label: 'Current email',
      save_email_btn: 'Save email',
      email_error_wrong_password: 'Current password is incorrect.',
      email_error_taken: 'This email is already used by another account.',
      email_error_generic: 'Failed to change email.',
      email_success: 'Email changed.',
      save_password_btn: 'Change password',
      settings_password_success: 'Password changed.',

      account_info_title: 'Account',
      role_label: 'Role',
      created_label: 'Created',
    },
  };

  function getLang() {
    try {
      var saved = localStorage.getItem('panel-lang');
      return saved === 'en' ? 'en' : 'pl';
    } catch (e) {
      return 'pl';
    }
  }

  function setLang(lang) {
    try {
      localStorage.setItem('panel-lang', lang === 'en' ? 'en' : 'pl');
    } catch (e) {}
  }

  function locale() {
    return getLang() === 'en' ? 'en-US' : 'pl-PL';
  }

  function t(key, params) {
    var lang = getLang();
    var str =
      DICT[lang] && DICT[lang][key] !== undefined
        ? DICT[lang][key]
        : DICT.pl[key] !== undefined
        ? DICT.pl[key]
        : key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        str = str.split('{' + k + '}').join(params[k]);
      });
    }
    return str;
  }

  function applyStaticTranslations() {
    document.documentElement.setAttribute('lang', getLang());
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  window.PANEL_I18N = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    locale: locale,
    applyStaticTranslations: applyStaticTranslations,
  };
})();
