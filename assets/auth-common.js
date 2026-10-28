/* Gemeinsame Helfer für /anmelden und /konto. Keine Tokens im Browser: die Sitzung liegt in httpOnly-Cookies. */
(function () {
  'use strict';
  var MSG = {
    invalid_credentials: 'E-Mail-Adresse oder Passwort ist nicht korrekt.',
    email_not_confirmed: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Den Link haben wir Ihnen geschickt.',
    user_exists: 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melden Sie sich an.',
    weak_password: 'Dieses Passwort ist zu schwach. Bitte wählen Sie ein längeres Passwort.',
    password_too_short: 'Mindestens 10 Zeichen.',
    password_too_long: 'Höchstens 128 Zeichen.',
    password_weak: 'Bitte verwenden Sie Buchstaben und mindestens eine Ziffer.',
    same_password: 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
    rate_limited: 'Zu viele Versuche. Bitte warten Sie einige Minuten.',
    wait: 'Bitte warten Sie kurz, bevor Sie einen neuen Code anfordern.',
    signup_disabled: 'Neue Registrierungen sind derzeit deaktiviert.',
    phone_exists: 'Diese Telefonnummer gehört bereits zu einem anderen Konto.',
    otp_invalid: 'Der Code ist falsch oder abgelaufen. Bitte prüfen Sie ihn oder fordern Sie einen neuen an.',
    sms_unavailable: 'Die SMS konnte nicht gesendet werden. Der SMS-Versand ist möglicherweise noch nicht eingerichtet.',
    auth_not_configured: 'Die Anmeldung wird gerade eingerichtet und ist noch nicht verfügbar.',
    provider: 'Unbekannter Anmeldeweg.',
    provider_disabled: 'Dieser Anmeldeweg ist noch nicht freigeschaltet.',
    link_other_browser: 'Der Link wurde in einem anderen Browser geöffnet. Ihre E-Mail-Adresse ist bestätigt, bitte melden Sie sich hier an.',
    access_denied: 'Die Anmeldung wurde abgebrochen.',
    not_signed_in: 'Bitte melden Sie sich an.',
    bad_origin: 'Die Anfrage wurde aus Sicherheitsgründen abgelehnt. Bitte laden Sie die Seite neu.',
    network: 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.',
    server_error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    auth_failed: 'Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'
  };
  function msg(code) { return MSG[code] || MSG.auth_failed; }

  function api(path, body) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    return fetch(path, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined, signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
    }).catch(function () { return { ok: false, status: 0, error: 'network' }; })
      .then(function (j) { if (t) clearTimeout(t); return j; });
  }

  /* Button sperren, solange eine Anfrage läuft (keine Doppel-Absendung) */
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.querySelector('.lbl').textContent; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); if (label) btn.querySelector('.lbl').textContent = label; }
    else { btn.disabled = false; btn.setAttribute('aria-busy', 'false'); if (btn.dataset.label) btn.querySelector('.lbl').textContent = btn.dataset.label; }
  }
  function note(el, kind, text) {
    if (!el) return;
    if (!text) { el.className = 'note'; el.textContent = ''; return; }
    el.className = 'note on ' + kind; el.textContent = text;
    el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  }
  function fieldErr(input, text) {
    if (!input) return;
    var box = document.getElementById(input.id + '-err');
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (box) box.textContent = text || '';
  }
  function hasSessionHint() { return /(?:^|;\s*)vo_li=1/.test(document.cookie); }

  window.VO = { api: api, msg: msg, busy: busy, note: note, fieldErr: fieldErr, hasSessionHint: hasSessionHint };
})();
