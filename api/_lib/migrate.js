'use strict';
/*
 * Automatische Einrichtung der Datenbank.
 * Nutzt die Postgres-Verbindung, die Vercel beim Verbinden einer Supabase-Datenbank
 * automatisch setzt (POSTGRES_URL_NON_POOLING / POSTGRES_URL). Läuft nur, wenn etwas fehlt,
 * und ist idempotent (alle Migrationen nutzen "if not exists").
 */
const fs = require('fs');
const path = require('path');
const C = require('./core');

const FILES = ['001_inquiries.sql', '002_auth_profiles.sql'];
let state = { checkedAt: 0, result: null, running: null };

function connString() {
  return String(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
}
function enabled() { return !!connString(); }

function readSql(name) {
  const candidates = [
    path.join(__dirname, '..', '..', 'migrations', name),
    path.join(process.cwd(), 'migrations', name)
  ];
  for (const p of candidates) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { /* weiter */ } }
  throw new Error('migration_file_missing:' + name);
}

function client() {
  const postgres = require('postgres');
  const raw = connString();
  const u = new URL(raw);
  const sslmode = u.searchParams.get('sslmode');
  const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  // Supabase/Vercel hängen Parameter wie "supa=..." an, die Postgres nicht kennt: entfernen
  u.search = '';
  return postgres(u.toString(), {
    ssl: sslmode === 'disable' || local ? false : 'require',
    prepare: false, max: 1, idle_timeout: 5, connect_timeout: 10, onnotice: () => {}
  });
}

async function inspect(sql) {
  const [r] = await sql`
    select to_regclass('public.inquiries') is not null as inquiries,
           to_regclass('public.profiles') is not null as profiles,
           exists (select 1 from information_schema.columns where table_schema='public' and table_name='inquiries' and column_name='user_id') as user_id,
           exists (select 1 from information_schema.schemata where schema_name='auth') as auth_schema`;
  return r;
}

async function run(force) {
  const sql = client();
  try {
    let s = await inspect(sql);
    const needs001 = force || !s.inquiries;
    const needs002 = s.auth_schema && (force || !s.profiles || !s.user_id);
    if (!needs001 && !needs002) return { ok: true, changed: false, tables: s };
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(778899)`;
      if (needs001) await tx.unsafe(readSql(FILES[0]));
      if (needs002) await tx.unsafe(readSql(FILES[1]));
    });
    try { await sql`notify pgrst, 'reload schema'`; } catch (e) { /* PostgREST lädt sonst nach kurzer Zeit selbst */ }
    s = await inspect(sql);
    C.log('db_migrated', { tables: s, force: !!force });
    return { ok: true, changed: true, tables: s };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

/* Einmal pro Server-Instanz prüfen (Ergebnis 10 Minuten gültig) */
async function ensure(force) {
  if (!enabled()) return { ok: false, error: 'no_postgres_url' };
  if (!force && state.result && state.result.ok && Date.now() - state.checkedAt < 10 * 60 * 1000) return state.result;
  if (state.running) return state.running;
  state.running = run(force).then((r) => { state.result = r; state.checkedAt = Date.now(); return r; })
    .catch((e) => { C.log('db_migrate_failed', { msg: String(e && e.message).slice(0, 300), code: e && e.code }); return { ok: false, error: 'migrate_failed', code: e && e.code }; })
    .finally(() => { state.running = null; });
  return state.running;
}

module.exports = { ensure, enabled, connString };
