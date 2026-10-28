-- VONUMO: Anfragen (Projekt, Website-Check, Rückruf)
-- Einmal im Supabase SQL-Editor ausführen (Dashboard → SQL Editor → New query → Run).
-- Die Tabelle ist nur serverseitig (Service-Role-Key in Vercel) erreichbar:
-- Row Level Security ist aktiv und es gibt bewusst KEINE Policies für anon/authenticated.

create extension if not exists pgcrypto;

create table if not exists public.inquiries (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  type              text not null check (type in ('project', 'website_check', 'callback')),
  status            text not null default 'new' check (status in ('new', 'in_progress', 'quoted', 'won', 'closed', 'spam')),
  name              text check (char_length(name) <= 120),
  company           text check (char_length(company) <= 160),
  email             text check (char_length(email) <= 254),
  phone             text check (char_length(phone) <= 40),
  service           text check (char_length(service) <= 80),
  budget            text check (char_length(budget) <= 80),
  website           text check (char_length(website) <= 300),
  preferred_time    text check (char_length(preferred_time) <= 120),
  selection         text check (char_length(selection) <= 300),
  message           text check (char_length(message) <= 5000),
  consent           boolean not null default false,
  source            text check (char_length(source) <= 80),
  ip_hash           text,
  user_agent        text,
  notified_owner    boolean not null default false,
  notified_customer boolean not null default false,
  admin_note        text check (char_length(admin_note) <= 4000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx  on public.inquiries (status);
create index if not exists inquiries_ip_idx      on public.inquiries (ip_hash, created_at);

create or replace function public.inquiries_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists inquiries_touch on public.inquiries;
create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.inquiries_touch();

alter table public.inquiries enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.inquiries from anon';
  end if;
  -- Rechte für "authenticated" regelt 002_auth_profiles.sql (nur eigene Zeilen, nur freigegebene Spalten).
  -- Ohne 002 gibt es für authenticated keine Policy, RLS liefert dann keine Zeilen.
end $$;
