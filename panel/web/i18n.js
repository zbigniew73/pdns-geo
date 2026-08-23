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
      th_actions: 'Akcje',
      edit_btn: 'Edytuj',
      delete_btn: 'Usun',
      close_btn: 'Zamknij',

      zone_editor_title: 'Rekordy strefy',
      zone_records_empty: 'Strefa nie ma jeszcze rekordow.',
      zone_records_error: 'Blad pobierania rekordow: {message}',
      th_record_name: 'Nazwa',
      th_ttl: 'TTL',
      th_content: 'Tresc',
      add_record_title: 'Dodaj / edytuj rekord',
      record_fqdn_hint: 'Nazwa oraz cele rekordow typu CNAME/MX/NS musza konczyc sie kropka, np. www.example.com.',
      record_multiline_hint: 'Jesli rekord ma kilka wartosci (np. kilka NS, kilka A/AAAA przy round-robin), wpisz kazda w osobnej linii.',
      save_record_btn: 'Zapisz rekord',
      record_saved: 'Rekord zapisany.',
      record_error: 'Blad zapisu rekordu',
      delete_record_confirm: 'Usunac ten rekord?',

      dns_servers_title: 'Serwery DNS',
      dns_servers_empty: 'Brak skonfigurowanych serwerow (edytuj panel/server/config/dns-servers.json).',
      dns_servers_error: 'Blad pobierania listy serwerow.',
      role_primary: 'primary',
      role_secondary: 'secondary',
      address_unset: 'adres nieustawiony',
      status_online: 'online',
      status_offline: 'offline',
      status_unknown: 'nieznany',

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

      save_btn: 'Zapisz',
      powerdns_conn_title: 'Polaczenie z PowerDNS API',
      powerdns_address_label: 'Adres (ns1)',
      powerdns_port_label: 'Port',
      powerdns_api_key_label: 'API Key',
      powerdns_api_key_hint_set: 'Klucz jest juz ustawiony - zostaw puste, zeby go nie zmieniac.',
      powerdns_save_error: 'Nie udalo sie zapisac ustawien.',
      powerdns_save_success: 'Zapisano.',
      powerdns_test_title: 'Test polaczenia',
      powerdns_test_btn: 'Testuj polaczenie',
      powerdns_test_running: 'Testowanie...',
      powerdns_test_not_configured: 'Najpierw zapisz adres, port i klucz API.',
      powerdns_test_ok: 'Polaczono - PowerDNS {version}.',
      powerdns_test_error: 'Blad polaczenia: {error}',
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
      th_actions: 'Actions',
      edit_btn: 'Edit',
      delete_btn: 'Delete',
      close_btn: 'Close',

      zone_editor_title: 'Zone records',
      zone_records_empty: 'This zone has no records yet.',
      zone_records_error: 'Error loading records: {message}',
      th_record_name: 'Name',
      th_ttl: 'TTL',
      th_content: 'Content',
      add_record_title: 'Add / edit record',
      record_fqdn_hint: 'The name and targets of CNAME/MX/NS records must end with a dot, e.g. www.example.com.',
      record_multiline_hint: 'If a record has multiple values (e.g. multiple NS, or round-robin A/AAAA), put each one on its own line.',
      save_record_btn: 'Save record',
      record_saved: 'Record saved.',
      record_error: 'Failed to save record',
      delete_record_confirm: 'Delete this record?',

      dns_servers_title: 'DNS Servers',
      dns_servers_empty: 'No servers configured (edit panel/server/config/dns-servers.json).',
      dns_servers_error: 'Failed to load the server list.',
      role_primary: 'primary',
      role_secondary: 'secondary',
      address_unset: 'address not set',
      status_online: 'online',
      status_offline: 'offline',
      status_unknown: 'unknown',

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

      save_btn: 'Save',
      powerdns_conn_title: 'PowerDNS API connection',
      powerdns_address_label: 'Address (ns1)',
      powerdns_port_label: 'Port',
      powerdns_api_key_label: 'API Key',
      powerdns_api_key_hint_set: 'A key is already set - leave blank to keep it unchanged.',
      powerdns_save_error: 'Failed to save settings.',
      powerdns_save_success: 'Saved.',
      powerdns_test_title: 'Connection test',
      powerdns_test_btn: 'Test connection',
      powerdns_test_running: 'Testing...',
      powerdns_test_not_configured: 'Save the address, port and API key first.',
      powerdns_test_ok: 'Connected - PowerDNS {version}.',
      powerdns_test_error: 'Connection error: {error}',
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
