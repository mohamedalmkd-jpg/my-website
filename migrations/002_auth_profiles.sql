-- VONUMO: Nutzerprofile und Zuordnung von Anfragen zu Konten
-- Nach 001_inquiries.sql einmal im Supabase SQL-Editor ausführen.

-- ---------- Profile (werden automatisch aus auth.users gepflegt) ----------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text check (char_length(full_name) <= 120),
  email            text,
  phone            text,
  avatar_url       text check (char_length(avatar_url) <= 1000),
  providers        text[] not null default '{}',
  email_confirmed  boolean not null default false,
  phone_confirmed  boolean not null default false,
  created_at       timestamptz not null default now(),
  last_sign_in_at  timestamptz,
  updated_at       timestamptz not null default now()
);

create or replace function public.sync_profile_from_auth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles as p (id, full_name, email, phone, avatar_url, providers, email_confirmed, phone_confirmed, created_at, last_sign_in_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    case when new.phone is null or new.phone = '' then null else '+' || ltrim(new.phone, '+') end,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(array(select jsonb_array_elements_text(new.raw_app_meta_data -> 'providers')), '{}'),
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null,
    coalesce(new.created_at, now()),
    new.last_sign_in_at,
    now()
  )
  on conflict (id) do update set
    full_name       = excluded.full_name,
    email           = excluded.email,
    phone           = excluded.phone,
    avatar_url      = excluded.avatar_url,
    providers       = excluded.providers,
    email_confirmed = excluded.email_confirmed,
    phone_confirmed = excluded.phone_confirmed,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at      = now();
  return new;
end $$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync after insert or update on auth.users
  for each row execute function public.sync_profile_from_auth();

-- bestehende Konten einmalig übernehmen
insert into public.profiles (id, full_name, email, phone, avatar_url, providers, email_confirmed, phone_confirmed, created_at, last_sign_in_at)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       u.email,
       case when u.phone is null or u.phone = '' then null else '+' || ltrim(u.phone, '+') end,
       coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
       coalesce(array(select jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')), '{}'),
       u.email_confirmed_at is not null, u.phone_confirmed_at is not null,
       coalesce(u.created_at, now()), u.last_sign_in_at
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "profiles: eigenes Profil lesen" on public.profiles;
create policy "profiles: eigenes Profil lesen" on public.profiles
  for select to authenticated using (id = auth.uid());

-- ---------- Anfragen einem Konto zuordnen ----------
alter table public.inquiries add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists inquiries_user_idx on public.inquiries (user_id, created_at desc);

revoke all on public.inquiries from authenticated;
-- Nutzer dürfen NUR ihre eigenen Anfragen lesen, und nur diese Spalten (keine IP-Hashes, keine internen Notizen)
grant select (reference, type, status, service, budget, website, selection, message, created_at, updated_at, user_id)
  on public.inquiries to authenticated;
drop policy if exists "inquiries: eigene Anfragen lesen" on public.inquiries;
create policy "inquiries: eigene Anfragen lesen" on public.inquiries
  for select to authenticated using (user_id = auth.uid());
