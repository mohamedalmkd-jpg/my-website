'use strict';
/*
 * /api/account/<action> – Daten des angemeldeten Nutzers.
 * GET  inquiries   eigene Anfragen            (Telefon bestätigt)
 * GET  settings    eigene Einstellungen        (Telefon bestätigt)
 * POST settings    Einstellungen speichern     (Telefon bestätigt)
 * GET  activity    eigenes Aktivitätsprotokoll (Telefon bestätigt)
 * GET  export      alle eigenen Daten als JSON (DSGVO Art. 15/20, immer erlaubt)
 * POST delete      Konto und Daten löschen     (DSGVO Art. 17, immer erlaubt)
 * Lesen/Schreiben läuft mit dem Nutzer-Token: Row Level Security schützt fremde Daten.
 */
const C = require('../_lib/core');
const A = require('../_lib/auth');
const M = require('../_lib/migrate');

const SETTINGS_COLS = 'language,notify_email,notify_sms,marketing_opt_in,marketing_opt_in_at,show_activity,updated_at';
const LANGS = ['de', 'en', 'ar'];
const PHONE_GATED = { inquiries: 1, settings: 1, activity: 1 };
const METHODS = { inquiries: 'GET', activity: 'GET', export: 'GET', delete: 'POST', settings: 'GET|POST' };

function actionOf(req) {
  if (req.query && req.query.action) return String(req.query.action);
  const m = String(req.url || '').match(/\/api\/account\/([a-z-]+)/);
  return m ? m[1] : '';
}

async function readSettings(s) {
  let r = await A.userRest(s.token, 'user_settings?select=' + SETTINGS_COLS + '&user_id=eq.' + s.user.id);
  if (r.ok && Array.isArray(r.data) && !r.data.length) {
    // Konto älter als die Einstellungs-Tabelle: Standardzeile serverseitig anlegen
    await C.sb('user_settings', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { user_id: s.user.id } });
    r = await A.userRest(s.token, 'user_settings?select=' + SETTINGS_COLS + '&user_id=eq.' + s.user.id);
  }
  if (!r.ok || !Array.isArray(r.data)) throw Object.assign(new Error('server_error'), { status: 502, dbStatus: r.status });
  return r.data[0] || null;
}

const handlers = {
  async inquiries(req, res, s) {
    const r = await A.userRest(s.token, 'inquiries?select=reference,type,status,service,budget,website,selection,message,created_at,updated_at&order=created_at.desc&limit=100');
    if (!r.ok || !Array.isArray(r.data)) { C.log('account_inquiries_failed', { status: r.status }); return C.send(res, 502, { ok: false, error: 'server_error' }); }
    return C.send(res, 200, { ok: true, items: r.data });
  },

  async settings(req, res, s, b) {
    if (req.method === 'GET') return C.send(res, 200, { ok: true, settings: await readSettings(s) });
    const patch = {};
    if (b.language !== undefined) { if (LANGS.indexOf(b.language) < 0) return C.send(res, 400, { ok: false, error: 'validation' }); patch.language = b.language; }
    ['notify_email', 'notify_sms', 'show_activity'].forEach((k) => { if (typeof b[k] === 'boolean') patch[k] = b[k]; });
    if (typeof b.marketing_opt_in === 'boolean') { patch.marketing_opt_in = b.marketing_opt_in; patch.marketing_opt_in_at = b.marketing_opt_in ? new Date().toISOString() : null; }
    if (!Object.keys(patch).length) return C.send(res, 400, { ok: false, error: 'nothing_to_update' });
    await readSettings(s); // stellt sicher, dass die Zeile existiert
    const r = await A.userRest(s.token, 'user_settings?user_id=eq.' + s.user.id + '&select=' + SETTINGS_COLS, { method: 'PATCH', prefer: 'return=representation', body: patch });
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) { C.log('settings_update_failed', { status: r.status }); return C.send(res, 502, { ok: false, error: 'server_error' }); }
    await A.logActivity(s.user.id, 'settings_updated');
    return C.send(res, 200, { ok: true, settings: r.data[0] });
  },

  async activity(req, res, s) {
    const r = await A.userRest(s.token, 'user_activity?select=event_type,created_at&order=created_at.desc&limit=20');
    if (!r.ok || !Array.isArray(r.data)) return C.send(res, 502, { ok: false, error: 'server_error' });
    return C.send(res, 200, { ok: true, items: r.data });
  },

  async export(req, res, s) {
    if (!C.rateLimit('export:' + s.user.id, 5, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const [set, act, inq] = await Promise.all([
      A.userRest(s.token, 'user_settings?select=' + SETTINGS_COLS),
      A.userRest(s.token, 'user_activity?select=event_type,created_at&order=created_at.desc&limit=1000'),
      A.userRest(s.token, 'inquiries?select=reference,type,status,service,budget,website,selection,message,created_at,updated_at&order=created_at.desc&limit=1000')
    ]);
    await A.logActivity(s.user.id, 'data_exported');
    const out = {
      exportiert_am: new Date().toISOString(),
      hinweis: 'Ihre bei VONUMO gespeicherten Daten (Art. 15 und 20 DSGVO).',
      konto: A.publicUser(s.user),
      einstellungen: (set.data && set.data[0]) || null,
      aktivitaet: act.data || [],
      anfragen: inq.data || []
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vonumo-meine-daten.json"');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify(out, null, 2));
  },

  async delete(req, res, s, b) {
    if (String(b.confirm || '') !== 'LÖSCHEN') return C.send(res, 400, { ok: false, error: 'confirm_required' });
    if (!C.rateLimit('delete:' + s.user.id, 3, 60 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const uid = s.user.id;
    // Eigene Anfragen mit personenbezogenen Daten löschen, dann das Konto (Profil, Einstellungen, Aktivität folgen per CASCADE)
    try { await C.sb('inquiries?user_id=eq.' + uid, { method: 'DELETE' }); } catch (e) { if (e.dbStatus !== 400) throw e; }
    await A.adminDeleteUser(uid);
    A.clearSession(req, res);
    C.log('account_deleted', { user: uid });
    return C.send(res, 200, { ok: true });
  }
};

module.exports = async function handler(req, res) {
  const action = actionOf(req);
  const h = handlers[action];
  if (!h) return C.send(res, 404, { ok: false, error: 'not_found' });
  if (METHODS[action].split('|').indexOf(req.method) < 0) { res.setHeader('Allow', METHODS[action].replace('|', ', ')); return C.send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  try {
    if (!A.enabled()) return C.send(res, 503, { ok: false, error: 'auth_not_configured' });
    let body = {};
    if (req.method === 'POST') {
      if (!A.sameOrigin(req)) return C.send(res, 403, { ok: false, error: 'bad_origin' });
      body = await C.readBody(req, 8 * 1024);
    }
    if (M.enabled()) await M.ensure(false);
    const s = await A.currentUser(req, res);
    if (!s) return C.send(res, 401, { ok: false, error: 'not_signed_in' });
    // Telefon-Pflicht wird serverseitig aus Supabase Auth geprüft, nicht aus dem Browser
    if (PHONE_GATED[action] && A.requirePhone() && !s.user.phone_confirmed_at) return C.send(res, 403, { ok: false, error: 'phone_unverified' });
    return await h(req, res, s, body);
  } catch (e) {
    return C.fail(res, e);
  }
};
