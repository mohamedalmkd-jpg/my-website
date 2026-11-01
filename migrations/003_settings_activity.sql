-- VONUMO: Nutzereinstellungen und Aktivitätsprotokoll (nach 002 ausführen; die Website macht das automatisch)

-- ---------- Einstellungen: genau eine Zeile pro Konto ----------
create table if not exists public.user_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  language              text not null default 'de' check (language in ('de', 'en', 'ar')),
  notify_email          boolean not null default true,   -- Status-Updates zu eigenen Anfragen per E-Mail
  notify_sms            boolean not null default false,  -- wichtige Hinweise per SMS
  marketing_opt_in      boolean not null default false,  -- Newsletter (nur mit ausdrücklicher Einwilligung)
  marketing_opt_in_at   timestamptz,
  show_activity         boolean not null default true,   -- Aktivitätsprotokoll im Konto anzeigen
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.inquiries_touch();

-- Für jedes neue Profil automatisch Standard-Einstellungen anlegen
create or replace function public.create_default_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_profile_settings on public.profiles;
create trigger on_profile_settings after insert on public.profiles
  for each row execute function public.create_default_settings();
insert into public.user_settings (user_id) select id from public.profiles on conflict (user_id) do nothing;

alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;
grant update (language, notify_email, notify_sms, marketing_opt_in, marketing_opt_in_at, show_activity) on public.user_settings to authenticated;
drop policy if exists "settings: eigene lesen" on public.user_settings;
create policy "settings: eigene lesen" on public.user_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists "settings: eigene ändern" on public.user_settings;
create policy "settings: eigene ändern" on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Aktivität: wird nur vom Server geschrieben, Nutzer lesen nur eigene ----------
create table if not exists public.user_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_type  text not null check (event_type in ('signup', 'login', 'logout', 'oauth_login', 'email_confirmed', 'phone_verified',
                                                  'password_changed', 'password_reset', 'profile_updated', 'settings_updated',
                                                  'inquiry_created', 'data_exported')),
  created_at  timestamptz not null default now()
);
create index if not exists user_activity_user_idx on public.user_activity (user_id, created_at desc);

alter table public.user_activity enable row level security;
revoke all on public.user_activity from anon, authenticated;
grant select (event_type, created_at, user_id) on public.user_activity to authenticated;
drop policy if exists "activity: eigene lesen" on public.user_activity;
create policy "activity: eigene lesen" on public.user_activity for select to authenticated using (user_id = auth.uid());

-- Aktivitäten nach 12 Monaten entfernen (Datensparsamkeit); wird bei jeder Migration ausgeführt
delete from public.user_activity where created_at < now() - interval '12 months';

notify pgrst, 'reload schema';
