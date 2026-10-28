'use strict';
/*
 * /api/admin/inquiries – nur mit ADMIN_KEY (Authorization: Bearer <ADMIN_KEY>)
 * GET   ?status=&type=&q=&limit=&offset=  → Liste der Anfragen
 * PATCH { id, status?, admin_note? }       → Status / Notiz ändern
 */
const C = require('../_lib/core');

const STATUSES = ['new', 'in_progress', 'quoted', 'won', 'closed', 'spam'];
const TYPES = ['project', 'website_check', 'callback'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorized(req) {
  const key = C.config().adminKey;
  if (!key) return false;
  const h = String((req.headers || {}).authorization || '');
  return C.safeEqual(h.replace(/^Bearer\s+/i, ''), key);
}

module.exports = async function handler(req, res) {
  const ip = C.ipHash(req);
  if (!C.config().adminKey) return C.send(res, 503, { ok: false, error: 'admin_not_configured' });
  if (!authorized(req)) {
    if (!C.rateLimit('admfail:' + ip, 10, 15 * 60 * 1000)) return C.send(res, 429, { ok: false, error: 'rate_limited' });
    C.log('admin_auth_failed', { ip });
    return C.send(res, 401, { ok: false, error: 'unauthorized' });
  }
  try {
    if (!C.features().db) return C.send(res, 503, { ok: false, error: 'db_not_configured' });

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://x');
      const p = url.searchParams;
      const limit = Math.min(200, Math.max(1, parseInt(p.get('limit') || '100', 10) || 100));
      const offset = Math.max(0, parseInt(p.get('offset') || '0', 10) || 0);
      let q = 'inquiries?select=id,reference,type,status,name,company,email,phone,service,budget,website,preferred_time,selection,message,consent,source,notified_owner,notified_customer,admin_note,created_at,updated_at&order=created_at.desc&limit=' + limit + '&offset=' + offset;
      const st = p.get('status'), ty = p.get('type'), term = C.oneLine(p.get('q'), 80);
      if (st && STATUSES.indexOf(st) >= 0) q += '&status=eq.' + st;
      if (ty && TYPES.indexOf(ty) >= 0) q += '&type=eq.' + ty;
      if (term) {
        const t = encodeURIComponent('*' + term.replace(/[*,()"\\]/g, ' ') + '*');
        q += '&or=(reference.ilike.' + t + ',name.ilike.' + t + ',email.ilike.' + t + ',company.ilike.' + t + ',phone.ilike.' + t + ')';
      }
      const r = await C.sb(q, { prefer: 'count=exact' });
      const total = parseInt(String(r.headers.get('content-range') || '').split('/')[1] || '0', 10);
      return C.send(res, 200, { ok: true, total, items: r.data || [] });
    }

    if (req.method === 'PATCH') {
      const b = await C.readBody(req);
      if (!UUID.test(String(b.id || ''))) return C.send(res, 400, { ok: false, error: 'invalid_id' });
      const patch = {};
      if (b.status !== undefined) {
        if (STATUSES.indexOf(b.status) < 0) return C.send(res, 400, { ok: false, error: 'invalid_status' });
        patch.status = b.status;
      }
      if (b.admin_note !== undefined) patch.admin_note = C.clean(b.admin_note, 4000);
      if (!Object.keys(patch).length) return C.send(res, 400, { ok: false, error: 'nothing_to_update' });
      const r = await C.sb('inquiries?id=eq.' + b.id, { method: 'PATCH', prefer: 'return=representation', body: patch });
      const row = Array.isArray(r.data) ? r.data[0] : null;
      if (!row) return C.send(res, 404, { ok: false, error: 'not_found' });
      C.log('admin_update', { ref: row.reference, status: row.status });
      return C.send(res, 200, { ok: true, item: row });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return C.send(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (e) {
    return C.fail(res, e);
  }
};
