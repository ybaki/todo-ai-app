-- Row Level Security politikalari
-- Kural: her tabloda auth.uid() = user_id (veya profiles icin id) zorunlu.
-- Bkz. docs/Akilli_Todo_Takvim_Proje_Dokumani.docx bolum 12 (Guvenlik ve Gizlilik).

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_analyses enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_busy_cache enable row level security;
alter table public.schedule_suggestions enable row level security;
alter table public.scheduled_blocks enable row level security;
alter table public.task_feedback enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------- profiles ----------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- insert kasitli olarak yok: profiles yalniz handle_new_user() trigger'i (security definer) ile olusur.

-- ---------------- tasks ----------------
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ---------------- task_analyses (yalnizca server service-role yazar, kullanici okur) ----------------
create policy "task_analyses_select_own" on public.task_analyses
  for select using (auth.uid() = user_id);
-- insert/update: yalnizca backend (service role) yapar; service role RLS'i bypass eder,
-- bu yuzden kullanicilar icin insert/update policy'si BILEREK tanimlanmadi.

-- ---------------- calendar_connections ----------------
create policy "calendar_connections_select_own" on public.calendar_connections
  for select using (auth.uid() = user_id);
create policy "calendar_connections_insert_own" on public.calendar_connections
  for insert with check (auth.uid() = user_id);
create policy "calendar_connections_update_own" on public.calendar_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_connections_delete_own" on public.calendar_connections
  for delete using (auth.uid() = user_id);

-- ---------------- calendar_busy_cache ----------------
create policy "calendar_busy_cache_select_own" on public.calendar_busy_cache
  for select using (auth.uid() = user_id);
-- insert/delete: yalnizca backend (service role / cron) yazar.

-- ---------------- schedule_suggestions ----------------
create policy "schedule_suggestions_select_own" on public.schedule_suggestions
  for select using (auth.uid() = user_id);
create policy "schedule_suggestions_update_own" on public.schedule_suggestions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert: yalnizca backend (scheduling engine) yazar.

-- ---------------- scheduled_blocks ----------------
create policy "scheduled_blocks_select_own" on public.scheduled_blocks
  for select using (auth.uid() = user_id);
create policy "scheduled_blocks_insert_own" on public.scheduled_blocks
  for insert with check (auth.uid() = user_id);
create policy "scheduled_blocks_update_own" on public.scheduled_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_blocks_delete_own" on public.scheduled_blocks
  for delete using (auth.uid() = user_id);

-- ---------------- task_feedback ----------------
create policy "task_feedback_select_own" on public.task_feedback
  for select using (auth.uid() = user_id);
create policy "task_feedback_insert_own" on public.task_feedback
  for insert with check (auth.uid() = user_id);

-- ---------------- audit_logs ----------------
create policy "audit_logs_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);
-- insert: yalnizca backend (service role) yazar; kullanici dogrudan yazamaz/silemez.
