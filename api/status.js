'use strict';
/* GET /api/status – welche Dienste eingerichtet sind (ohne Geheimnisse). */
const C = require('./_lib/core');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return C.send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  const f = C.features();
  return C.send(res, 200, { ok: true, db: f.db, ai: f.ai, email: f.email });
};
