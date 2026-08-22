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

      zones_title: 'Strefy DNS',
      zones_not_configured: 'Polaczenie z PowerDNS API nie jest jeszcze skonfigurowane.',
      zones_empty: 'Brak stref.',
      zones_error: 'Blad pobierania stref: {message}',
      th_name: 'Nazwa',
      th_type: 'Typ',
      th_serial: 'Serial',
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

      zones_title: 'DNS zones',
      zones_not_configured: 'Connection to the PowerDNS API is not configured yet.',
      zones_empty: 'No zones.',
      zones_error: 'Error loading zones: {message}',
      th_name: 'Name',
      th_type: 'Type',
      th_serial: 'Serial',
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
