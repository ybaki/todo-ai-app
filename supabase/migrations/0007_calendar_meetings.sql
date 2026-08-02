-- Kullanicinin elle ekledigi toplantilar (gorev planlamasindan bagimsiz).
create table public.calendar_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  details text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule jsonb,
  series_id uuid,
  created_at timestamptz not null default now(),
  constraint calendar_meetings_valid_range check (end_at > start_at)
);

create index calendar_meetings_user_range_idx
  on public.calendar_meetings (user_id, start_at, end_at);

create index calendar_meetings_series_idx
  on public.calendar_meetings (user_id, series_id)
  where series_id is not null;

comment on table public.calendar_meetings is
  'Kullanicinin takvime elle ekledigi toplantilar.';

alter table public.calendar_meetings enable row level security;

create policy "calendar_meetings_select_own" on public.calendar_meetings
  for select using (auth.uid() = user_id);

create policy "calendar_meetings_insert_own" on public.calendar_meetings
  for insert with check (auth.uid() = user_id);

create policy "calendar_meetings_delete_own" on public.calendar_meetings
  for delete using (auth.uid() = user_id);
