# VONUMO Website

Statische Startseite (`index.html` + `support.js`) mit Serverless-API auf Vercel (`/api`).

## Was echt funktioniert

| Bereich | Verhalten |
|---|---|
| Projektanfrage (Kontakt) | Validierung im Browser **und** auf dem Server, Speicherung in Supabase, eindeutige Referenz `VO-JJMMTT-XXXXX`, E-Mail an VONUMO + Bestätigung an Kundin/Kunden (wenn Resend eingerichtet) |
| Website-Check | wie oben, Typ `website_check` |
| Rückrufbitte im Assistenten | wie oben, Typ `callback` |
| KI-Assistent | echte Antworten über die Anthropic-API (serverseitig), Wissensbasis aus den Seiteninhalten. Ohne Schlüssel: sichtbar als **FAQ-Modus** gekennzeichnet |
| Admin (`/admin`) | Anmeldung mit `ADMIN_KEY`, Liste, Suche, Filter, Status und Notizen, Antworten per E-Mail/Telefon |
| Kundenkonto (`/anmelden`, `/konto`) | Supabase Auth: E-Mail + Passwort mit Bestätigungslink, Passwort-Reset, Google, Apple; Telefonbestätigung per SMS-Code (Pflicht, bevor das Konto voll aktiv ist); Sitzung in httpOnly-Cookies mit automatischer Erneuerung; Abmelden widerruft die Sitzung; eigene Anfragen mit Status |
| Ohne Datenbank | keine Scheinerfolge: die Seite sagt ehrlich, dass die Online-Übermittlung nicht verfügbar ist, und bietet den E-Mail-Weg an |

Schutz: Honeypot, Rate-Limits (5 Anfragen / 10 Min. pro Adresse, 20 Chat-Nachrichten / 10 Min.), Längen- und Formatprüfung,
IP nur als Hash, RLS aktiv ohne öffentliche Policies, Admin-Schlüssel mit zeitkonstantem Vergleich und Sperre nach Fehlversuchen.

## Einrichtung (einmalig)

1. **Supabase SQL-Editor:** `migrations/001_inquiries.sql`, danach `migrations/002_auth_profiles.sql` ausführen.
1b. **Supabase → Authentication → URL Configuration:** Site URL `https://vonumo.vercel.app`; Redirect URLs: `https://vonumo.vercel.app/api/auth/callback**` und `https://vonumo.vercel.app/konto**` (bei eigener Domain zusätzlich mit dieser).
1c. **Supabase → Authentication → Providers:**
   - *Email*: aktiv, „Confirm email“ an. Absender: eigenes SMTP (z. B. Resend) unter Authentication → Emails → SMTP, sonst nur wenige E-Mails pro Stunde.
   - *Google*: Client-ID und Secret aus Google Cloud Console (OAuth-Client „Web“, Authorized redirect URI: `https://<projekt>.supabase.co/auth/v1/callback`).
   - *Apple*: Apple Developer Program nötig. Services ID, Team ID, Key ID und .p8-Schlüssel eintragen; Return URL `https://<projekt>.supabase.co/auth/v1/callback`. Für „E-Mail-Adresse verbergen“ in Apple → Certificates → „Sign in with Apple for Email Communication“ die Absenderdomain registrieren.
   - *Phone*: aktiv, SMS-Anbieter (Twilio, MessageBird, Vonage oder Textlocal) mit Zugangsdaten. Unter „Phone“ muss „Enable phone confirmations“ an sein.
2. **Vercel → Project vonumo → Settings → Environment Variables** (Production + Preview):

| Variable | Pflicht | Wert |
|---|---|---|
| `SUPABASE_URL` | ja | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ja | Supabase → Project Settings → API → `service_role` (geheim, nur hier eintragen) |
| `ADMIN_KEY` | ja | langes Zufallspasswort für `/admin` (bereits angelegt) |
| `ANTHROPIC_API_KEY` | für KI | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | nein | Standard `claude-haiku-5-5` |
| `RESEND_API_KEY` | für E-Mails | resend.com → API Keys |
| `MAIL_FROM` | nein | z. B. `VONUMO <anfrage@ihre-domain.de>` (Domain in Resend verifizieren). Standard `onboarding@resend.dev` darf nur an die eigene Resend-Adresse senden |
| `NOTIFY_EMAIL` | nein | Empfänger neuer Anfragen, Standard `almoakedmohammad@gmail.com` |
| `IP_HASH_SALT` | nein | beliebige Zufallszeichen |
| `SUPABASE_ANON_KEY` | für Konten | Supabase → Project Settings → API → `anon public` |
| `SITE_URL` | empfohlen | `https://vonumo.vercel.app` (für Links in E-Mails) |
| `REQUIRE_PHONE_VERIFICATION` | nein | Standard `true`. Nur auf `false` setzen, wenn kein SMS-Anbieter genutzt werden soll |

3. Neu deployen. `GET /api/status` zeigt, welche Dienste aktiv sind.

## Tests

```
npm test            # API-Tests (ohne Netzwerk, externe Dienste simuliert)
```
