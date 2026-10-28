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
| Ohne Datenbank | keine Scheinerfolge: die Seite sagt ehrlich, dass die Online-Übermittlung nicht verfügbar ist, und bietet den E-Mail-Weg an |

Schutz: Honeypot, Rate-Limits (5 Anfragen / 10 Min. pro Adresse, 20 Chat-Nachrichten / 10 Min.), Längen- und Formatprüfung,
IP nur als Hash, RLS aktiv ohne öffentliche Policies, Admin-Schlüssel mit zeitkonstantem Vergleich und Sperre nach Fehlversuchen.

## Einrichtung (einmalig)

1. **Supabase:** SQL-Editor öffnen und `migrations/001_inquiries.sql` ausführen.
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

3. Neu deployen. `GET /api/status` zeigt, welche Dienste aktiv sind.

## Tests

```
npm test            # API-Tests (ohne Netzwerk, externe Dienste simuliert)
```
