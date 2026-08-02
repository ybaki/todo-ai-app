-- Kullanicinin elle kapattigi zaman araliklari (AI onerisi disi).
create table public.manual_calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint manual_calendar_blocks_valid_range check (end_at > start_at)
);

create index manual_calendar_blocks_user_range_idx
  on public.manual_calendar_blocks (user_id, start_at, end_at);

comment on table public.manual_calendar_blocks is
  'Kullanicinin takvimde elle kapattigi araliklar; scheduling engine bunlari dolu sayar.';

alter table public.manual_calendar_blocks enable row level security;

create policy "manual_calendar_blocks_select_own" on public.manual_calendar_blocks
  for select using (auth.uid() = user_id);

create policy "manual_calendar_blocks_insert_own" on public.manual_calendar_blocks
  for insert with check (auth.uid() = user_id);

create policy "manual_calendar_blocks_delete_own" on public.manual_calendar_blocks
  for delete using (auth.uid() = user_id);
