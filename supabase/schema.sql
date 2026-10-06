-- Demo Vault — run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- 1. Table for demo details --------------------------------------------------
create table if not exists public.demos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  title        text not null,
  artist       text not null default '',
  collabs      text[] not null default '{}',
  bpm          integer,
  key          text,
  genre        text,
  tags         text[] not null default '{}',
  notes        text not null default '',
  status       text not null default 'WIP' check (status in ('WIP', 'Ready', 'Sent', 'Signed')),
  rating       smallint not null default 0 check (rating between 0 and 5),
  favorite     boolean not null default false,
  duration     double precision not null default 0,
  peaks        jsonb not null default '[]',
  audio_path   text not null,
  audio_name   text not null default '',
  audio_format text not null default '',
  audio_size   bigint not null default 0,
  cover_path   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists demos_user_created on public.demos (user_id, created_at desc);

alter table public.demos enable row level security;

drop policy if exists "Own demos" on public.demos;
create policy "Own demos" on public.demos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Private storage bucket for audio + cover art ----------------------------
insert into storage.buckets (id, name, public)
values ('demos', 'demos', false)
on conflict (id) do nothing;

-- Files live under "<your user id>/<demo id>/…" and only you can touch them.
drop policy if exists "Own demo files" on storage.objects;
create policy "Own demo files" on storage.objects
  for all to authenticated
  using (bucket_id = 'demos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'demos' and (storage.foldername(name))[1] = auth.uid()::text);
