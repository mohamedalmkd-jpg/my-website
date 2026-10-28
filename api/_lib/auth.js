'use strict';
/*
 * Sitzungsverwaltung über Supabase Auth (GoTrue REST), serverseitig.
 * Tokens liegen ausschließlich in httpOnly-Cookies (Secure, SameSite=Lax).
 * Der Browser sieht nur ein harmloses Hinweis-Cookie "vo_li=1" für die Anzeige "Konto".
 */
const crypto = require('crypto');
const C = require('./core');

const AT = 'vo_at', RT = 'vo_rt', PK = 'vo_pkce', LI = 'vo_li';
const RT_MAX_AGE = 60 * 60 * 24 * 90; // 90 Tage, wird bei jeder Erneuerung verlängert

function cfg() {
  const c = C.config();
  return { url: c.sbUrl, anon: String(process.env.SUPABASE_ANON_KEY || '').trim(), siteUrl: String(process.env.SITE_URL || '').trim().replace(/\/+$/, '') };
}
function enabled() { const a = cfg(); return !!(a.url && a.anon); }

/* ---------- Cookies ---------- */
function parseCookies(req) {
  const out = {};
  String((req.headers || {}).cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) { const k = p.slice(0, i).trim(); try { out[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { out[k] = ''; } }
  });
  return out;
}
function isSecure(req) {
  const h = req.headers || {};
  if (String(h['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') return true;
  return !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(h.host || ''));
}
function cookie(req, name, value, maxAge, httpOnly) {
  let s = name + '=' + encodeURIComponent(value) + '; Path=/; SameSite=Lax; Max-Age=' + Math.max(0, Math.floor(maxAge));
  if (httpOnly !== false) s += '; HttpOnly';
  if (isSecure(req)) s += '; Secure';
  return s;
}
function addCookies(res, list) {
  const prev = res.getHeader ? res.getHeader('Set-Cookie') : (res.headers && res.headers['set-cookie']);
  const arr = [].concat(prev || [], list);
  res.setHeader('Set-Cookie', arr);
}
function setSession(req, res, s) {
  addCookies(res, [
    cookie(req, AT, s.access_token, Math.max(60, (s.expires_in || 3600) - 30)),
    cookie(req, RT, s.refresh_token, RT_MAX_AGE),
    cookie(req, LI, '1', RT_MAX_AGE, false)
  ]);
}
function clearSession(req, res) {
  addCookies(res, [cookie(req, AT, '', 0), cookie(req, RT, '', 0), cookie(req, LI, '', 0, false), cookie(req, PK, '', 0)]);
}

/* ---------- Herkunftsprüfung gegen CSRF ---------- */
function sameOrigin(req) {
  const h = req.headers || {};
  const origin = h.origin || h.referer || '';
  if (!origin) return true; // z. B. serverseitige Aufrufe; Browser senden Origin bei POST immer mit
  try {
    const o = new URL(origin);
    return o.host === String(h['x-forwarded-host'] || h.host || '');
  } catch (e) { return false; }
}

/* ---------- Basis-URL der Website ---------- */
function baseUrl(req) {
  const a = cfg();
  if (a.siteUrl) return a.siteUrl;
  const h = req.headers || {};
  return (isSecure(req) ? 'https://' : 'http://') + String(h['x-forwarded-host'] || h.host || 'localhost');
}

/* ---------- PKCE ---------- */
function b64url(buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function pkcePair() {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}
function setPkce(req, res, verifier) { addCookies(res, [cookie(req, PK, verifier, 60 * 60)]); }

/* ---------- GoTrue ---------- */
async function gotrue(path, opts) {
  opts = opts || {};
  const a = cfg();
  if (!a.url || !a.anon) throw Object.assign(new Error('auth_not_configured'), { status: 503 });
  const headers = { apikey: a.anon, 'Content-Type': 'application/json', Accept: 'application/json' };
  headers.Authorization = 'Bearer ' + (opts.token || a.anon);
  const r = await fetch(a.url + '/auth/v1/' + path, {
    method: opts.method || 'GET', headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text.slice(0, 200) }; }
  return { ok: r.ok, status: r.status, data: data || {} };
}

/* Fehlercodes von GoTrue auf stabile, eigene Codes abbilden */
function authError(r) {
  const d = r.data || {};
  const code = String(d.error_code || d.code || d.error || '').toLowerCase();
  const msg = String(d.msg || d.message || d.error_description || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'email_not_confirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'user_exists';
  if (code === 'weak_password' || msg.includes('password should')) return 'weak_password';
  if (code === 'phone_exists' || msg.includes('phone') && msg.includes('already')) return 'phone_exists';
  if (code === 'otp_expired' || msg.includes('expired') || msg.includes('invalid') && msg.includes('otp') || msg.includes('token has expired or is invalid')) return 'otp_invalid';
  if (code === 'over_request_rate_limit' || code === 'over_sms_send_rate_limit' || code === 'over_email_send_rate_limit' || r.status === 429) return 'rate_limited';
  if (code === 'sms_send_failed' || msg.includes('sms') || msg.includes('twilio') || msg.includes('phone provider')) return 'sms_unavailable';
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) return 'signup_disabled';
  if (code === 'same_password') return 'same_password';
  if (code === 'flow_state_not_found' || code === 'bad_code_verifier' || msg.includes('code verifier') || msg.includes('flow state')) return 'link_other_browser';
  if (r.status === 401 || r.status === 403) return 'unauthorized';
  return 'auth_failed';
}

/* ---------- Aktuellen Nutzer ermitteln (mit automatischer Token-Erneuerung) ---------- */
async function currentUser(req, res) {
  if (!enabled()) return null;
  const ck = parseCookies(req);
  if (ck[AT]) {
    const u = await gotrue('user', { token: ck[AT] });
    if (u.ok && u.data && u.data.id) return { user: u.data, token: ck[AT] };
  }
  if (ck[RT]) {
    const r = await gotrue('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ck[RT] } });
    if (r.ok && r.data.access_token) {
      if (res) setSession(req, res, r.data);
      return { user: r.data.user, token: r.data.access_token };
    }
    if (res) clearSession(req, res);
  }
  return null;
}

/* Öffentliche Sicht auf den Nutzer (ohne Interna) */
function publicUser(u) {
  const md = u.user_metadata || {};
  const providers = (u.app_metadata && u.app_metadata.providers) || (u.identities || []).map((i) => i.provider);
  return {
    id: u.id,
    email: u.email || '',
    fullName: md.full_name || md.name || '',
    avatarUrl: md.avatar_url || md.picture || '',
    phone: u.phone ? '+' + String(u.phone).replace(/^\+/, '') : '',
    pendingPhone: u.new_phone ? '+' + String(u.new_phone).replace(/^\+/, '') : '',
    emailConfirmed: !!u.email_confirmed_at,
    phoneConfirmed: !!u.phone_confirmed_at,
    providers: Array.from(new Set(providers || [])),
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null
  };
}

/* Telefonnummer in E.164 bringen; ohne Ländervorwahl wird Deutschland (+49) angenommen */
function normalizePhone(v) {
  let s = String(v || '').replace(/[\s()\/.-]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) s = '+' + s.slice(2);
  else if (s.startsWith('0')) s = '+49' + s.slice(1);
  else if (!s.startsWith('+')) s = '+' + s;
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return '';
  return s;
}

function requirePhone() { return String(process.env.REQUIRE_PHONE_VERIFICATION || 'true').toLowerCase() !== 'false'; }

module.exports = { AT, RT, PK, LI, cfg, enabled, parseCookies, setSession, clearSession, sameOrigin, baseUrl, pkcePair, setPkce, gotrue, authError, currentUser, publicUser, normalizePhone, requirePhone, addCookies, cookie };
