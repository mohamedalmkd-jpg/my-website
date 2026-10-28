'use strict';
/*
 * /api/auth/<action> – alle Anmelde-Funktionen in einer Serverless-Funktion.
 *
 * GET  config            welche Anmeldewege in Supabase aktiv sind
 * GET  me                aktueller Nutzer (erneuert Tokens automatisch)
 * POST signup            Registrierung mit E-Mail + Passwort (Bestätigungslink per E-Mail)
 * POST login             Anmeldung mit E-Mail + Passwort
 * POST resend            Bestätigungs-E-Mail erneut senden
 * POST forgot            Link zum Zurücksetzen des Passworts senden
 * POST password          neues Passwort setzen (angemeldet, z. B. nach Reset-Link)
 * POST profile           Namen ändern
 * POST logout            Sitzung beenden (auch bei Supabase widerrufen)
 * GET  oauth?provider=   Weiterleitung zu Google / Apple (PKCE)
 * GET  callback          Rückkehr von OAuth / E-Mail-Links, tauscht Code gegen Sitzung
 * POST adopt             Sitzung aus E-Mail-Link (Hash-Fragment) übernehmen
 * POST phone-send        SMS-Code an Telefonnummer senden
 * POST phone-verify      SMS-Code prüfen
 */
const C = require('../_lib/core');
const A = require('../_lib/auth');

const PROVIDERS = ['google', 'apple'];
let settingsCache = { t: 0, v: null };

function safeNext(n) {
  n = String(n || '');
  return /^\/(?!\/)[A-Za-z0-9\-._~\/?=&%#]*$/.test(n) ? n : '/konto';
}
function redirect(res, url) { res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); res.end(); }
function passwordProblem(p) {
  if (typeof p !== 'string' || p.length < 10) return 'password_too_short';
  if (p.length > 128) return 'password_too_long';
  if (!/[A-Za-zÄÖÜäöüß]/.test(p) || !/\d/.test(p)) return 'password_weak';
  return null;
}
function actionOf(req) {
  if (req.query && req.query.action) return String(req.query.action);
  const m = String(req.url || '').match(/\/api\/auth\/([a-z-]+)/);
  return m ? m[1] : '';
}
function query(req) { return new URL(req.url || '/', 'http://x').searchParams; }

async function settings() {
  if (settingsCache.v && Date.now() - settingsCache.t < 60000) return settingsCache.v;
  const r = await A.gotrue('settings');
  if (!r.ok) throw Object.assign(new Error('auth_unavailable'), { status: 502 });
  settingsCache = { t: Date.now(), v: r.data };
  return r.data;
}

async function requireUser(req, res) {
  const s = await A.currentUser(req, res);
  if (!s) { C.send(res, 401, { ok: false, error: 'not_signed_in' }); return null; }
  return s;
}

const handlers = {
  async config(req, res) {
    if (!A.enabled()) return C.send(res, 200, { ok: true, enabled: false });
    const s = await settings();
    const ext = s.external || {};
    return C.send(res, 200, {
      ok: true, enabled: true,
      email: ext.email !== false, google: !!ext.google, apple: !!ext.apple,
      phone: !!ext.phone, signupDisabled: !!s.disable_signup,
      requirePhone: A.requirePhone()
    });
  },

  async me(req, res) {
    const s = await requireUser(req, res);
    if (!s) return;
    const u = A.publicUser(s.user);
    return C.send(res, 200, { ok: true, user: u, needsPhone: A.requirePhone() && !u.phoneConfirmed });
  },

  async signup(req, res, b) {
    const ip = C.ipHash(req);
    if (!C.rateLimit('signup:' + ip, 5, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const email = C.oneLine(b.email, 254).toLowerCase();
    const fullName = C.oneLine(b.fullName, 120);
    const fields = {};
    if (!C.EMAIL_RE.test(email)) fields.email = 'invalid';
    if (fullName.length < 2) fields.fullName = 'required';
    const pp = passwordProblem(b.password);
    if (pp) fields.password = pp;
    if (Object.keys(fields).length) return C.send(res, 400, { ok: false, error: 'validation', fields });
    const pk = A.pkcePair();
    A.setPkce(req, res, pk.verifier);
    const redirectTo = A.baseUrl(req) + '/api/auth/callback?next=' + encodeURIComponent('/konto?willkommen=1');
    const r = await A.gotrue('signup?redirect_to=' + encodeURIComponent(redirectTo), {
      method: 'POST',
      body: { email, password: b.password, data: { full_name: fullName }, code_challenge: pk.challenge, code_challenge_method: 's256' }
    });
    if (!r.ok) return C.send(res, r.status === 429 ? 429 : 400, { ok: false, error: A.authError(r) });
    if (r.data.access_token) { A.setSession(req, res, r.data); return C.send(res, 200, { ok: true, signedIn: true }); }
    C.log('signup', { confirm: true });
    return C.send(res, 200, { ok: true, confirmEmail: true });
  },

  async login(req, res, b) {
    const email = C.oneLine(b.email, 254).toLowerCase();
    const ip = C.ipHash(req);
    if (!C.rateLimit('login:' + ip, 20, 15 * 60 * 1000) || !C.rateLimit('login:' + email, 8, 15 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    if (!C.EMAIL_RE.test(email) || typeof b.password !== 'string' || !b.password) return C.send(res, 400, { ok: false, error: 'invalid_credentials' });
    const r = await A.gotrue('token?grant_type=password', { method: 'POST', body: { email, password: b.password } });
    if (!r.ok || !r.data.access_token) return C.send(res, r.status === 429 ? 429 : 400, { ok: false, error: A.authError(r) });
    A.setSession(req, res, r.data);
    const u = A.publicUser(r.data.user);
    return C.send(res, 200, { ok: true, user: u, needsPhone: A.requirePhone() && !u.phoneConfirmed });
  },

  async resend(req, res, b) {
    const email = C.oneLine(b.email, 254).toLowerCase();
    if (!C.rateLimit('resend:' + C.ipHash(req), 4, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    if (!C.EMAIL_RE.test(email)) return C.send(res, 400, { ok: false, error: 'validation', fields: { email: 'invalid' } });
    const redirectTo = A.baseUrl(req) + '/konto?willkommen=1';
    const r = await A.gotrue('resend?redirect_to=' + encodeURIComponent(redirectTo), { method: 'POST', body: { type: 'signup', email } });
    if (!r.ok && r.status === 429) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    return C.send(res, 200, { ok: true }); // keine Auskunft, ob die Adresse existiert
  },

  async forgot(req, res, b) {
    const email = C.oneLine(b.email, 254).toLowerCase();
    if (!C.rateLimit('forgot:' + C.ipHash(req), 5, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    if (!C.EMAIL_RE.test(email)) return C.send(res, 400, { ok: false, error: 'validation', fields: { email: 'invalid' } });
    const pk = A.pkcePair();
    A.setPkce(req, res, pk.verifier);
    const redirectTo = A.baseUrl(req) + '/api/auth/callback?next=' + encodeURIComponent('/konto?passwort=neu');
    const r = await A.gotrue('recover?redirect_to=' + encodeURIComponent(redirectTo), { method: 'POST', body: { email, code_challenge: pk.challenge, code_challenge_method: 's256' } });
    if (!r.ok && r.status === 429) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    return C.send(res, 200, { ok: true }); // keine Auskunft, ob die Adresse existiert
  },

  async password(req, res, b) {
    const s = await requireUser(req, res); if (!s) return;
    const pp = passwordProblem(b.password);
    if (pp) return C.send(res, 400, { ok: false, error: 'validation', fields: { password: pp } });
    const r = await A.gotrue('user', { method: 'PUT', token: s.token, body: { password: b.password } });
    if (!r.ok) return C.send(res, 400, { ok: false, error: A.authError(r) });
    C.log('password_changed', { user: s.user.id });
    return C.send(res, 200, { ok: true });
  },

  async profile(req, res, b) {
    const s = await requireUser(req, res); if (!s) return;
    const fullName = C.oneLine(b.fullName, 120);
    if (fullName.length < 2) return C.send(res, 400, { ok: false, error: 'validation', fields: { fullName: 'required' } });
    const r = await A.gotrue('user', { method: 'PUT', token: s.token, body: { data: { full_name: fullName } } });
    if (!r.ok) return C.send(res, 400, { ok: false, error: A.authError(r) });
    return C.send(res, 200, { ok: true, user: A.publicUser(r.data) });
  },

  async logout(req, res) {
    const ck = A.parseCookies(req);
    if (ck[A.AT]) { try { await A.gotrue('logout?scope=local', { method: 'POST', token: ck[A.AT] }); } catch (e) { C.log('logout_revoke_failed', {}); } }
    else if (ck[A.RT]) {
      const r = await A.gotrue('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ck[A.RT] } });
      if (r.ok && r.data.access_token) await A.gotrue('logout?scope=local', { method: 'POST', token: r.data.access_token });
    }
    A.clearSession(req, res);
    return C.send(res, 200, { ok: true });
  },

  async oauth(req, res) {
    const q = query(req);
    const provider = String(q.get('provider') || '');
    if (PROVIDERS.indexOf(provider) < 0) return redirect(res, '/anmelden?fehler=provider');
    if (!A.enabled()) return redirect(res, '/anmelden?fehler=auth_not_configured');
    const s = await settings();
    if (!(s.external || {})[provider]) return redirect(res, '/anmelden?fehler=provider_disabled');
    const pk = A.pkcePair();
    A.setPkce(req, res, pk.verifier);
    const next = safeNext(q.get('next') || '/konto');
    const redirectTo = A.baseUrl(req) + '/api/auth/callback?next=' + encodeURIComponent(next);
    const url = A.cfg().url + '/auth/v1/authorize?provider=' + provider + '&redirect_to=' + encodeURIComponent(redirectTo) +
      '&code_challenge=' + pk.challenge + '&code_challenge_method=s256' + (provider === 'apple' ? '&scopes=' + encodeURIComponent('name email') : '');
    return redirect(res, url);
  },

  async callback(req, res) {
    const q = query(req);
    const next = safeNext(q.get('next'));
    const err = q.get('error_code') || q.get('error');
    if (err) return redirect(res, '/anmelden?fehler=' + encodeURIComponent(String(err).slice(0, 40)));
    const code = q.get('code');
    if (!code) return redirect(res, next); // Hash-Fragment-Fluss: die Seite übernimmt die Sitzung per /api/auth/adopt
    const verifier = A.parseCookies(req)[A.PK];
    if (!verifier) return redirect(res, '/anmelden?fehler=link_other_browser');
    const r = await A.gotrue('token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: verifier } });
    A.addCookies(res, [A.cookie(req, A.PK, '', 0)]);
    if (!r.ok || !r.data.access_token) return redirect(res, '/anmelden?fehler=' + A.authError(r));
    A.setSession(req, res, r.data);
    C.log('callback_ok', { user: r.data.user && r.data.user.id });
    return redirect(res, next);
  },

  async adopt(req, res, b) {
    const at = String(b.access_token || ''), rt = String(b.refresh_token || '');
    if (!at || !rt || at.length > 4000 || rt.length > 500) return C.send(res, 400, { ok: false, error: 'invalid_session' });
    const u = await A.gotrue('user', { token: at });
    if (!u.ok || !u.data.id) return C.send(res, 401, { ok: false, error: 'invalid_session' });
    const r = await A.gotrue('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: rt } });
    if (!r.ok || !r.data.access_token || !r.data.user || r.data.user.id !== u.data.id) return C.send(res, 401, { ok: false, error: 'invalid_session' });
    A.setSession(req, res, r.data);
    return C.send(res, 200, { ok: true });
  },

  async 'phone-send'(req, res, b) {
    const s = await requireUser(req, res); if (!s) return;
    const phone = A.normalizePhone(b.phone);
    if (!phone) return C.send(res, 400, { ok: false, error: 'validation', fields: { phone: 'invalid' } });
    const uid = s.user.id;
    if (!C.rateLimit('otp60:' + uid, 1, 60 * 1000)) return C.send(res, 429, { ok: false, error: 'wait', retryAfter: 60 });
    if (!C.rateLimit('otph:' + uid, 5, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const r = await A.gotrue('user', { method: 'PUT', token: s.token, body: { phone } });
    if (!r.ok) { C.log('otp_send_failed', { status: r.status, code: A.authError(r) }); return C.send(res, r.status === 429 ? 429 : 400, { ok: false, error: A.authError(r) }); }
    return C.send(res, 200, { ok: true, phone, retryAfter: 60 });
  },

  async 'phone-verify'(req, res, b) {
    const s = await requireUser(req, res); if (!s) return;
    const phone = A.normalizePhone(b.phone);
    const code = String(b.code || '').replace(/\D/g, '');
    if (!phone || code.length !== 6) return C.send(res, 400, { ok: false, error: 'validation', fields: { code: 'invalid' } });
    if (!C.rateLimit('otpv:' + s.user.id, 5, 10 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const r = await A.gotrue('verify', { method: 'POST', token: s.token, body: { type: 'phone_change', phone, token: code } });
    if (!r.ok) return C.send(res, r.status === 429 ? 429 : 400, { ok: false, error: A.authError(r) });
    if (r.data.access_token) A.setSession(req, res, r.data);
    const user = r.data.user || (await A.gotrue('user', { token: r.data.access_token || s.token })).data;
    C.log('phone_verified', { user: s.user.id });
    return C.send(res, 200, { ok: true, user: A.publicUser(user) });
  }
};

const GET_ONLY = { config: 1, me: 1, oauth: 1, callback: 1 };

module.exports = async function handler(req, res) {
  const action = actionOf(req);
  const h = handlers[action];
  if (!h) return C.send(res, 404, { ok: false, error: 'not_found' });
  const wantGet = !!GET_ONLY[action];
  if ((wantGet && req.method !== 'GET') || (!wantGet && req.method !== 'POST')) {
    res.setHeader('Allow', wantGet ? 'GET' : 'POST');
    return C.send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  try {
    if (action !== 'config' && !A.enabled()) {
      if (action === 'oauth' || action === 'callback') return redirect(res, '/anmelden?fehler=auth_not_configured');
      return C.send(res, 503, { ok: false, error: 'auth_not_configured' });
    }
    let body = {};
    if (!wantGet) {
      if (!A.sameOrigin(req)) return C.send(res, 403, { ok: false, error: 'bad_origin' });
      body = await C.readBody(req, 8 * 1024);
    }
    return await h(req, res, body);
  } catch (e) {
    if (action === 'oauth' || action === 'callback') { C.log('auth_redirect_error', { action, msg: e.message }); return redirect(res, '/anmelden?fehler=auth_failed'); }
    return C.fail(res, e);
  }
};
module.exports.passwordProblem = passwordProblem;
module.exports.safeNext = safeNext;
