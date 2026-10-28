'use strict';
/*
 * GET /api/account/inquiries – eigene Anfragen des angemeldeten Nutzers.
 * Abfrage mit dem Nutzer-Token: Row Level Security in der Datenbank sorgt dafür,
 * dass nur eigene Zeilen und nur freigegebene Spalten lesbar sind.
 */
const C = require('../_lib/core');
const A = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return C.send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  try {
    if (!A.enabled()) return C.send(res, 503, { ok: false, error: 'auth_not_configured' });
    const s = await A.currentUser(req, res);
    if (!s) return C.send(res, 401, { ok: false, error: 'not_signed_in' });
    if (A.requirePhone() && !s.user.phone_confirmed_at) return C.send(res, 403, { ok: false, error: 'phone_unverified' });
    const a = A.cfg();
    const r = await fetch(a.url + '/rest/v1/inquiries?select=reference,type,status,service,budget,website,selection,message,created_at,updated_at&order=created_at.desc&limit=100', {
      headers: { apikey: a.anon, Authorization: 'Bearer ' + s.token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(data)) { C.log('account_inquiries_failed', { status: r.status }); return C.send(res, 502, { ok: false, error: 'server_error' }); }
    return C.send(res, 200, { ok: true, items: data });
  } catch (e) {
    return C.fail(res, e);
  }
};
