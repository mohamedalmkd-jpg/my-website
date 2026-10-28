'use strict';
/*
 * Gemeinsame Server-Logik für alle API-Routen.
 * Keine externen Abhängigkeiten: Supabase (REST), Resend (E-Mail) und Anthropic (KI)
 * werden per fetch angesprochen. Alle Schlüssel kommen ausschließlich aus Umgebungsvariablen.
 */
const crypto = require('crypto');

function env(k) { return String(process.env[k] || '').trim(); }

function config() {
  return {
    sbUrl: env('SUPABASE_URL').replace(/\/+$/, ''),
    sbKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    resendKey: env('RESEND_API_KEY'),
    mailFrom: env('MAIL_FROM') || 'VONUMO <onboarding@resend.dev>',
    notifyTo: env('NOTIFY_EMAIL') || 'almoakedmohammad@gmail.com',
    aiKey: env('ANTHROPIC_API_KEY'),
    aiModel: env('ANTHROPIC_MODEL') || 'claude-haiku-5-5',
    adminKey: env('ADMIN_KEY'),
    salt: env('IP_HASH_SALT') || env('ADMIN_KEY') || 'vonumo'
  };
}

function features() {
  const c = config();
  return { db: !!(c.sbUrl && c.sbKey), email: !!c.resendKey, ai: !!c.aiKey, admin: !!c.adminKey };
}

/* ---------- HTTP ---------- */
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readBody(req, limit) {
  limit = limit || 32 * 1024;
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else {
    raw = await new Promise((resolve, reject) => {
      let data = '', size = 0;
      req.on('data', (ch) => { size += ch.length; if (size > limit) { reject(Object.assign(new Error('too_large'), { status: 413 })); req.destroy(); } else data += ch; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }
  if (raw.length > limit) throw Object.assign(new Error('too_large'), { status: 413 });
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { throw Object.assign(new Error('bad_json'), { status: 400 }); }
}

function clientIp(req) {
  const h = req.headers || {};
  const xf = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || String(h['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function ipHash(req) {
  return crypto.createHash('sha256').update(config().salt + '|' + clientIp(req)).digest('hex').slice(0, 32);
}

/* Einfache Begrenzung pro Instanz (zusätzlich zur Prüfung in der Datenbank). */
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now); buckets.set(key, arr);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/* ---------- Validierung ---------- */
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, max);
}
function oneLine(v, max) { return clean(v, max).replace(/\s+/g, ' '); }

function reference() {
  const d = new Date();
  const ymd = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(5);
  let s = '';
  for (let i = 0; i < 5; i++) s += abc[bytes[i] % abc.length];
  return 'VO-' + ymd + '-' + s;
}

/* ---------- Supabase REST ---------- */
async function sb(path, opts) {
  opts = opts || {};
  const c = config();
  if (!c.sbUrl || !c.sbKey) throw Object.assign(new Error('db_not_configured'), { status: 503 });
  const headers = {
    apikey: c.sbKey,
    Authorization: 'Bearer ' + c.sbKey,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (opts.prefer) headers.Prefer = opts.prefer;
  const r = await fetch(c.sbUrl + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) {
    const err = new Error('db_error');
    err.status = 502; err.dbStatus = r.status; err.detail = data;
    throw err;
  }
  return { data, headers: r.headers };
}

/* ---------- E-Mail über Resend ---------- */
async function sendMail(to, subject, text, replyTo) {
  const c = config();
  if (!c.resendKey || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + c.resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: c.mailFrom, to: [to], subject, text, reply_to: replyTo || undefined }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) { log('mail_failed', { status: r.status, body: (await r.text()).slice(0, 300) }); return false; }
    return true;
  } catch (e) { log('mail_error', { msg: e.message }); return false; }
}

function log(event, data) {
  try { console.log(JSON.stringify(Object.assign({ t: new Date().toISOString(), event }, data || {}))); } catch (e) { /* ignore */ }
}

function fail(res, e) {
  const status = e && e.status ? e.status : 500;
  const code = e && e.message ? e.message : 'server_error';
  if (status >= 500) log('error', { code, dbStatus: e && e.dbStatus, detail: e && e.detail });
  send(res, status, { ok: false, error: status >= 500 && code !== 'db_not_configured' ? 'server_error' : code });
}

module.exports = { config, features, send, readBody, clientIp, ipHash, rateLimit, safeEqual, EMAIL_RE, clean, oneLine, reference, sb, sendMail, log, fail };
