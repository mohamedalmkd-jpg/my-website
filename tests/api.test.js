'use strict';
/*
 * API-Tests ohne Netzwerk: Supabase (PostgREST), Resend und Anthropic werden über
 * einen fetch-Stub simuliert. Ausführen mit:  node --test tests/
 */
const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');

const ENV = {
  SUPABASE_URL: 'https://db.example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_x',
  ANTHROPIC_API_KEY: 'sk-x', ADMIN_KEY: 'admin-secret-123', NOTIFY_EMAIL: 'owner@example.com'
};
function setEnv(over) {
  for (const k of Object.keys(ENV)) delete process.env[k];
  Object.assign(process.env, ENV, over || {});
  for (const [k, v] of Object.entries(over || {})) if (v === null) delete process.env[k];
}

/* ---------- Mini-PostgREST im Speicher ---------- */
let rows = [], mails = [], aiCalls = [], aiReply = 'Eine Landingpage ist oft in ein bis zwei Wochen live.';
function resp(status, body, headers) {
  return new Response(body === undefined ? '' : JSON.stringify(body), { status, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) });
}
function matchFilters(row, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    if (k === 'or') { const t = decodeURIComponent(v).match(/ilike\.\*(.*?)\*/)[1].toLowerCase(); if (!['reference', 'name', 'email', 'company', 'phone'].some((f) => String(row[f] || '').toLowerCase().includes(t))) return false; continue; }
    const [op, val] = [v.slice(0, v.indexOf('.')), decodeURIComponent(v.slice(v.indexOf('.') + 1))];
    if (op === 'eq' && String(row[k]) !== val) return false;
    if (op === 'gte' && !(row[k] >= val)) return false;
  }
  return true;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const u = new URL(url);
  if (u.host === 'db.example.supabase.co') {
    assert.strictEqual(opts.headers.apikey, 'svc');
    const p = [...u.searchParams];
    if (opts.method === 'POST') {
      const b = JSON.parse(opts.body);
      if (rows.some((r) => r.reference === b.reference)) return resp(409, { code: '23505' });
      const row = Object.assign({ id: require('crypto').randomUUID(), status: 'new', created_at: new Date().toISOString(), admin_note: null }, b);
      rows.push(row); return resp(201, [row]);
    }
    if (opts.method === 'PATCH') {
      const hit = rows.filter((r) => matchFilters(r, p));
      hit.forEach((r) => Object.assign(r, JSON.parse(opts.body)));
      return resp(200, hit);
    }
    const hit = rows.filter((r) => matchFilters(r, p)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return resp(200, hit, { 'content-range': '0-' + Math.max(0, hit.length - 1) + '/' + hit.length });
  }
  if (u.host === 'api.resend.com') { const b = JSON.parse(opts.body); mails.push(b); return resp(200, { id: 'm' + mails.length }); }
  if (u.host === 'api.anthropic.com') {
    const b = JSON.parse(opts.body); aiCalls.push(b);
    assert.strictEqual(opts.headers['x-api-key'], 'sk-x');
    return resp(200, { content: [{ type: 'text', text: aiReply }] });
  }
  throw new Error('unexpected fetch ' + url);
};

/* ---------- Request/Response-Attrappen ---------- */
let ipN = 0;
function call(handler, { method = 'POST', body, headers = {}, url = '/', ip } = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    Object.assign(req, { method, url, headers: Object.assign({ 'x-forwarded-for': ip || ('10.0.0.' + (++ipN)), 'user-agent': 'test' }, headers), body });
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(s) { resolve({ status: this.statusCode, headers: this.headers, json: JSON.parse(s) }); } };
    Promise.resolve(handler(req, res));
  });
}
function fresh(path) { delete require.cache[require.resolve(path)]; return require(path); }
function load() {
  for (const k of Object.keys(require.cache)) if (k.includes('/api/')) delete require.cache[k];
  return { inq: require('../api/inquiries'), chat: require('../api/chat'), status: require('../api/status'), admin: require('../api/admin/inquiries') };
}
test.beforeEach(() => { rows = []; mails = []; aiCalls = []; setEnv(); });

const PROJECT = { type: 'project', name: 'Erika Muster', company: 'Muster GmbH', email: 'Erika@Example.com', service: 'UI/UX-Design', budget: '5.000–15.000 €', message: 'Wir brauchen eine neue Website mit 3D.', consent: true, selection: 'Abo: Plus' };

test('Projektanfrage wird gespeichert, bekommt Referenz und löst E-Mails aus', async () => {
  const { inq } = load();
  const r = await call(inq, { body: PROJECT });
  assert.strictEqual(r.status, 201);
  assert.match(r.json.reference, /^VO-\d{6}-[A-Z2-9]{5}$/);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].email, 'erika@example.com');
  assert.strictEqual(rows[0].reference, r.json.reference);
  assert.ok(rows[0].ip_hash && rows[0].ip_hash.length === 32 && !rows[0].ip_hash.includes('10.0.0'));
  assert.strictEqual(mails.length, 2);
  assert.deepStrictEqual(mails[0].to, ['owner@example.com']);
  assert.deepStrictEqual(mails[1].to, ['erika@example.com']);
  assert.ok(mails[1].text.includes(r.json.reference));
  assert.strictEqual(rows[0].notified_owner, true);
  assert.strictEqual(r.json.confirmationSent, true);
});

test('Validierung: fehlende Pflichtfelder liefern 400 mit Feldern, nichts wird gespeichert', async () => {
  const { inq } = load();
  const r = await call(inq, { body: { type: 'project', name: '', email: 'kaputt', message: 'kurz', consent: false } });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(Object.keys(r.json.fields).sort(), ['consent', 'email', 'message', 'name']);
  assert.strictEqual(rows.length, 0);
});

test('Website-Check und Rückruf werden mit eigenem Typ gespeichert', async () => {
  const { inq } = load();
  const a = await call(inq, { body: { type: 'website_check', website: 'beispiel.de', email: 'a@b.de' } });
  const b = await call(inq, { body: { type: 'callback', name: 'Max', phone: '+49 151 2345678', preferred_time: 'Nachmittags' } });
  assert.strictEqual(a.status, 201); assert.strictEqual(b.status, 201);
  assert.deepStrictEqual(rows.map((r) => r.type), ['website_check', 'callback']);
  const bad = await call(inq, { body: { type: 'callback', phone: 'abc' } });
  assert.strictEqual(bad.status, 400);
});

test('Honeypot, falsche Methode und unbekannter Typ werden abgelehnt', async () => {
  const { inq } = load();
  assert.strictEqual((await call(inq, { body: Object.assign({ hp: 'x' }, PROJECT) })).status, 400);
  assert.strictEqual((await call(inq, { method: 'GET' })).status, 405);
  assert.strictEqual((await call(inq, { body: { type: 'hack' } })).status, 400);
  assert.strictEqual(rows.length, 0);
});

test('Rate-Limit: höchstens 5 Anfragen pro 10 Minuten und Adresse', async () => {
  const { inq } = load();
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await call(inq, { body: PROJECT, ip: '9.9.9.9' })).status);
  assert.deepStrictEqual(codes, [201, 201, 201, 201, 201, 429, 429]);
});

test('Ohne Datenbank: ehrliche 503-Antwort statt Scheinerfolg', async () => {
  setEnv({ SUPABASE_URL: null });
  const { inq, status } = load();
  const r = await call(inq, { body: PROJECT });
  assert.strictEqual(r.status, 503);
  assert.strictEqual(r.json.error, 'db_not_configured');
  const s = await call(status, { method: 'GET' });
  assert.deepStrictEqual(s.json, { ok: true, db: false, ai: true, email: true });
});

test('Ohne E-Mail-Dienst: Anfrage wird trotzdem gespeichert, keine Bestätigung behauptet', async () => {
  setEnv({ RESEND_API_KEY: null });
  const { inq } = load();
  const r = await call(inq, { body: PROJECT });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.json.confirmationSent, false);
  assert.strictEqual(mails.length, 0);
});

test('KI-Chat: echte API wird serverseitig mit Wissensbasis aufgerufen', async () => {
  const { chat } = load();
  aiReply = 'Für ein Angebot sprechen Sie uns am besten direkt an. [KONTAKT]';
  const r = await call(chat, { body: { messages: [{ role: 'assistant', content: 'Hallo!' }, { role: 'user', content: 'Was kostet eine Website?' }] } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.handoff, true);
  assert.ok(!r.json.reply.includes('[KONTAKT]'));
  assert.strictEqual(aiCalls.length, 1);
  assert.strictEqual(aiCalls[0].messages[0].role, 'user');
  assert.ok(aiCalls[0].system.includes('Premium-Unternehmenswebsites'));
  assert.ok(aiCalls[0].system.includes('150 €'));
});

test('KI-Chat ohne Schlüssel: 503, kein simulierter KI-Text', async () => {
  setEnv({ ANTHROPIC_API_KEY: null });
  const { chat } = load();
  const r = await call(chat, { body: { messages: [{ role: 'user', content: 'Hallo' }] } });
  assert.strictEqual(r.status, 503);
  assert.strictEqual(aiCalls.length, 0);
});

test('Admin: ohne/mit falschem Schlüssel gesperrt, mit Schlüssel Liste, Suche und Statuswechsel', async () => {
  const { inq, admin } = load();
  await call(inq, { body: PROJECT });
  await call(inq, { body: { type: 'callback', name: 'Max', phone: '0151 1234567' } });
  assert.strictEqual((await call(admin, { method: 'GET', url: '/api/admin/inquiries' })).status, 401);
  assert.strictEqual((await call(admin, { method: 'GET', url: '/api/admin/inquiries', headers: { authorization: 'Bearer falsch' } })).status, 401);
  const auth = { authorization: 'Bearer admin-secret-123' };
  const all = await call(admin, { method: 'GET', url: '/api/admin/inquiries', headers: auth });
  assert.strictEqual(all.status, 200); assert.strictEqual(all.json.total, 2);
  const cb = await call(admin, { method: 'GET', url: '/api/admin/inquiries?type=callback', headers: auth });
  assert.strictEqual(cb.json.items.length, 1);
  const q = await call(admin, { method: 'GET', url: '/api/admin/inquiries?q=muster', headers: auth });
  assert.strictEqual(q.json.items[0].name, 'Erika Muster');
  const id = rows[0].id;
  const up = await call(admin, { method: 'PATCH', headers: auth, body: { id, status: 'in_progress', admin_note: 'Rückruf Montag' } });
  assert.strictEqual(up.status, 200);
  assert.strictEqual(rows[0].status, 'in_progress');
  assert.strictEqual((await call(admin, { method: 'PATCH', headers: auth, body: { id, status: 'deleted' } })).status, 400);
  assert.strictEqual((await call(admin, { method: 'PATCH', headers: auth, body: { id: 'x', status: 'won' } })).status, 400);
});

test('Admin ohne ADMIN_KEY ist komplett deaktiviert', async () => {
  setEnv({ ADMIN_KEY: null });
  const { admin } = load();
  const r = await call(admin, { method: 'GET', url: '/api/admin/inquiries', headers: { authorization: 'Bearer ' } });
  assert.strictEqual(r.status, 503);
});

/* ---------- Anmeldung ---------- */
test('Auth: Telefonnummern werden korrekt nach E.164 normalisiert', () => {
  const A = fresh('../api/_lib/auth');
  assert.strictEqual(A.normalizePhone('0151 234 56789'), '+4915123456789');
  assert.strictEqual(A.normalizePhone('+49 (151) 234-56789'), '+4915123456789');
  assert.strictEqual(A.normalizePhone('0049 30 1234567'), '+49301234567');
  assert.strictEqual(A.normalizePhone('+1 415 555 0100'), '+14155550100');
  assert.strictEqual(A.normalizePhone('12'), '');
  assert.strictEqual(A.normalizePhone('abc'), '');
});

test('Auth: Passwortregeln und sichere Weiterleitungsziele', () => {
  const H = fresh('../api/auth/[action].js');
  assert.strictEqual(H.passwordProblem('kurz1'), 'password_too_short');
  assert.strictEqual(H.passwordProblem('nurbuchstabenlang'), 'password_weak');
  assert.strictEqual(H.passwordProblem('Sicher2026Passwort'), null);
  assert.strictEqual(H.safeNext('/konto?x=1'), '/konto?x=1');
  assert.strictEqual(H.safeNext('//evil.example'), '/konto');
  assert.strictEqual(H.safeNext('https://evil.example'), '/konto');
  assert.strictEqual(H.safeNext('/\\evil'), '/konto');
});

test('Auth: ohne Supabase-Schlüssel ehrlich deaktiviert, fremde Herkunft abgelehnt', async () => {
  setEnv({ SUPABASE_ANON_KEY: null });
  const H = fresh('../api/auth/[action].js');
  const c = await call(H, { method: 'GET', url: '/api/auth/config' });
  assert.deepStrictEqual(c.json, { ok: true, enabled: false });
  const l = await call(H, { url: '/api/auth/login', body: { email: 'a@b.de', password: 'x' } });
  assert.strictEqual(l.status, 503);
  setEnv({ SUPABASE_ANON_KEY: 'anon' });
  const H2 = fresh('../api/auth/[action].js');
  const o = await call(H2, { url: '/api/auth/login', headers: { origin: 'https://evil.example', host: 'vonumo.vercel.app' }, body: { email: 'a@b.de', password: 'x' } });
  assert.strictEqual(o.status, 403);
  const m = await call(H2, { method: 'GET', url: '/api/auth/me', headers: { host: 'vonumo.vercel.app' } });
  assert.strictEqual(m.status, 401);
});
