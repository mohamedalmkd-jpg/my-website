'use strict';
/* GET /api/status – welche Dienste eingerichtet sind (ohne Geheimnisse). Legt fehlende Tabellen automatisch an. */
const C = require('./_lib/core');
const M = require('./_lib/migrate');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return C.send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  const f = C.features();
  let schema = 'unknown';
  if (M.enabled()) {
    const r = await M.ensure(false);
    schema = r.ok ? 'ok' : (r.error || 'error');
  } else if (f.db) schema = 'manual';
  const auth = !!(f.db && (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
  return C.send(res, 200, { ok: true, db: f.db, schema, auth, ai: f.ai, email: f.email });
};
