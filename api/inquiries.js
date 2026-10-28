'use strict';
/*
 * POST /api/inquiries
 * Speichert Projektanfragen, Website-Check-Anfragen und Rückrufbitten in der Datenbank,
 * vergibt eine eindeutige Referenz und benachrichtigt per E-Mail (sofern eingerichtet).
 */
const C = require('./_lib/core');
const A = require('./_lib/auth');

const TYPES = ['project', 'website_check', 'callback'];
const SERVICES = ['Website-Entwicklung', 'UI/UX-Design', 'KI-Lösungen', 'Noch offen'];
const LABEL = { project: 'Projektanfrage', website_check: 'Website-Check', callback: 'Rückrufbitte' };

function validate(b) {
  const type = TYPES.indexOf(b.type) >= 0 ? b.type : null;
  if (!type) return { error: 'invalid_type' };
  const d = {
    type,
    name: C.oneLine(b.name, 120),
    company: C.oneLine(b.company, 160),
    email: C.oneLine(b.email, 254).toLowerCase(),
    phone: C.oneLine(b.phone, 40),
    service: C.oneLine(b.service, 80),
    budget: C.oneLine(b.budget, 80),
    website: C.oneLine(b.website, 300),
    preferred_time: C.oneLine(b.preferred_time, 120),
    selection: C.oneLine(b.selection, 300),
    message: C.clean(b.message, 5000),
    consent: b.consent === true,
    source: C.oneLine(b.source, 80) || 'website'
  };
  const fields = {};
  if (type === 'project') {
    if (!d.name) fields.name = 'required';
    if (!C.EMAIL_RE.test(d.email)) fields.email = 'invalid';
    if (d.message.length < 10) fields.message = 'too_short';
    if (!d.consent) fields.consent = 'required';
    if (d.service && SERVICES.indexOf(d.service) < 0) d.service = 'Noch offen';
  } else if (type === 'website_check') {
    if (d.website.length < 4 || d.website.indexOf('.') < 0 || /\s/.test(d.website)) fields.website = 'invalid';
    if (!C.EMAIL_RE.test(d.email)) fields.email = 'invalid';
  } else if (type === 'callback') {
    if (d.phone.replace(/[^0-9]/g, '').length < 6 || !/^[+0-9 ()\/-]+$/.test(d.phone)) fields.phone = 'invalid';
    if (d.email && !C.EMAIL_RE.test(d.email)) fields.email = 'invalid';
  }
  if (Object.keys(fields).length) return { error: 'validation', fields };
  return { data: d };
}

function summary(d, ref) {
  const L = [LABEL[d.type] + ' ' + ref, ''];
  const add = (k, v) => { if (v) L.push(k + ': ' + v); };
  add('Name', d.name); add('Unternehmen', d.company); add('E-Mail', d.email); add('Telefon', d.phone);
  add('Leistung', d.service); add('Budget', d.budget); add('Website', d.website); add('Erreichbar', d.preferred_time);
  add('Auswahl', d.selection);
  if (d.message) L.push('', 'Nachricht:', d.message);
  return L.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return C.send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  try {
    const body = await C.readBody(req);
    if (body.hp) return C.send(res, 400, { ok: false, error: 'rejected' }); // Honeypot: von Bots ausgefüllt
    const v = validate(body);
    if (v.error) return C.send(res, 400, { ok: false, error: v.error, fields: v.fields || {} });
    if (!C.features().db) return C.send(res, 503, { ok: false, error: 'db_not_configured' });

    const ip = C.ipHash(req);
    if (!C.rateLimit('inq:' + ip, 5, 10 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await C.sb('inquiries?select=id&ip_hash=eq.' + ip + '&created_at=gte.' + encodeURIComponent(since), { prefer: 'count=exact' });
    const cnt = parseInt(String(recent.headers.get('content-range') || '').split('/')[1] || '0', 10);
    if (cnt >= 5) return C.send(res, 429, { ok: false, error: 'rate_limited' });

    const d = v.data;
    // Angemeldete Nutzer: Anfrage dem Konto zuordnen (sichtbar unter /konto)
    let userId = null;
    if (A.enabled() && A.parseCookies(req)[A.RT]) {
      try { const s = await A.currentUser(req, res); if (s && s.user) userId = s.user.id; } catch (e) { C.log('inquiry_user_lookup_failed', {}); }
    }
    let row = null, ref = '';
    for (let attempt = 0; attempt < 3 && !row; attempt++) {
      ref = C.reference();
      try {
        const rec = Object.assign({}, d, { reference: ref, ip_hash: ip, user_agent: C.oneLine((req.headers || {})['user-agent'], 300) });
        if (userId) rec.user_id = userId;
        let ins;
        try {
          ins = await C.sb('inquiries', { method: 'POST', prefer: 'return=representation', body: rec });
        } catch (e) {
          // Migration 002 (Spalte user_id) noch nicht ausgeführt: ohne Zuordnung speichern statt Anfrage zu verlieren
          if (userId && e.dbStatus === 400 && /user_id/.test(JSON.stringify(e.detail || ''))) {
            C.log('inquiry_user_id_column_missing', {});
            delete rec.user_id;
            ins = await C.sb('inquiries', { method: 'POST', prefer: 'return=representation', body: rec });
          } else throw e;
        }
        row = Array.isArray(ins.data) ? ins.data[0] : ins.data;
      } catch (e) {
        if (e.dbStatus === 409 && attempt < 2) continue; // Referenz bereits vergeben
        throw e;
      }
    }

    const cfg = C.config();
    const text = summary(d, ref);
    const ownerOk = await C.sendMail(cfg.notifyTo, LABEL[d.type] + ' ' + ref + (d.name ? ' – ' + d.name : ''), text + '\n\nVerwaltung: /admin', d.email || undefined);
    let custOk = false;
    if (d.email) {
      custOk = await C.sendMail(d.email, 'Ihre Anfrage bei VONUMO (' + ref + ')',
        'Guten Tag' + (d.name ? ' ' + d.name : '') + ',\n\nvielen Dank für Ihre Anfrage. Wir haben sie unter der Referenz ' + ref + ' gespeichert und melden uns innerhalb von zwei Werktagen.\n\nIhre Angaben:\n' + text + '\n\nVONUMO\n' + cfg.notifyTo + ' · +49 159 06712485', cfg.notifyTo);
    }
    if (ownerOk || custOk) {
      try { await C.sb('inquiries?id=eq.' + row.id, { method: 'PATCH', body: { notified_owner: ownerOk, notified_customer: custOk } }); } catch (e) { C.log('notify_flag_failed', { ref }); }
    }
    C.log('inquiry_created', { ref, type: d.type, ownerMail: ownerOk, customerMail: custOk });
    return C.send(res, 201, { ok: true, reference: ref, confirmationSent: custOk });
  } catch (e) {
    return C.fail(res, e);
  }
};
module.exports.validate = validate;
