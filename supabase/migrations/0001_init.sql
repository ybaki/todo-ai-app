-- Akilli Todo & Takvim Planlayici - baslangic semasi (FAZ 1)
-- Bkz. docs/Akilli_Todo_Takvim_Proje_Dokumani.docx bolum 11 (Veri Modeli)
-- ve .cursor/plans/akilli_todo_takvim_uygulama_plani_15db6edb.plan.md bolum 1.

-- ============================================================
-- ENUM TIPLERI
-- ============================================================

create type public.eisenhower_quadrant as enum (
  'urgent_important',
  'not_urgent_important',
  'urgent_not_important',
  'not_urgent_not_important'
);

create type public.task_status as enum (
  'inbox',
  'analyzing',
  'needs_user_input',
  'suggested',
  'confirmed',
  'scheduled',
  'conflicted',
  'reschedule_suggested',
  'done',
  'archived'
);

create type public.energy_level as enum ('low', 'medium', 'high_focus');

create type public.schedule_suggestion_status as enum ('candidate', 'accepted', 'rejected');

create type public.scheduled_block_source as enum ('app', 'outlook');

create type public.calendar_provider as enum ('microsoft');

-- ============================================================
-- PROFILES: kullanici tercihleri (auth.users ile 1:1)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  timezone text not null default 'Europe/Istanbul',
  work_start time not null default '09:00',
  work_end time not null default '18:00',
  lunch_start time default '12:30',
  lunch_end time default '13:30',
  buffer_minutes integer not null default 15,
  min_focus_block_minutes integer not null default 30,
  max_daily_focus_minutes integer not null default 240,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Kullanici calisma tercihleri; auth.users ile 1:1 iliski.';

-- ============================================================
-- TASKS: ana gorev kaydi
-- ============================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_text text not null,
  title text,
  status public.task_status not null default 'inbox',
  quadrant public.eisenhower_quadrant,
  deadline timestamptz,
  estimated_minutes integer,
  minimum_chunk_minutes integer,
  splittable boolean not null default false,
  energy public.energy_level,
  tags text[] not null default '{}',
  confidence numeric(3, 2),
  source text not null default 'web' check (source in ('web', 'chrome_extension')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_estimated_minutes_positive check (estimated_minutes is null or estimated_minutes > 0),
  constraint tasks_user_idempotency_unique unique (user_id, idempotency_key)
);

create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_user_id_deadline_idx on public.tasks (user_id, deadline);

comment on table public.tasks is 'Kullanicinin ana gorev kaydi; Inbox -> ... -> Done durum makinesini takip eder.';
comment on column public.tasks.idempotency_key is 'Chrome eklentisi/istemci tarafindan uretilen tekrar-onleyici anahtar (FR-10 idempotency).';

-- ============================================================
-- TASK_ANALYSES: AI audit / kalite olcumu
-- ============================================================

create table public.task_analyses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  model text not null,
  prompt_version text not null,
  input_tokens integer,
  output_tokens integer,
  output_json jsonb not null,
  confidence numeric(3, 2),
  cost_usd numeric(10, 6),
  latency_ms integer,
  is_valid boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index task_analyses_task_id_idx on public.task_analyses (task_id);
create index task_analyses_user_id_idx on public.task_analyses (user_id);

comment on table public.task_analyses is 'Her LLM cagrisinin denetim kaydi (maliyet, latency, gecerlilik).';

-- ============================================================
-- CALENDAR_CONNECTIONS: OAuth baglantisi (token DEGERI burada TUTULMAZ)
-- ============================================================

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.calendar_provider not null default 'microsoft',
  tenant_id text,
  scopes text[] not null default '{Calendars.ReadBasic}',
  -- token_ref: gercek refresh/access token DEGIL, Supabase Vault (vault.secrets)
  -- icindeki secret'a referans veren bir UUID/isim. Ham token asla bu tabloya yazilmaz.
  token_ref uuid,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

comment on table public.calendar_connections is 'OAuth baglanti meta verisi. token_ref, Supabase Vault icindeki sifreli secret''a isaret eder.';
comment on column public.calendar_connections.token_ref is 'Supabase Vault (pgsodium) secret id''si; ham token degeri asla bu sutunda tutulmaz.';

-- ============================================================
-- CALENDAR_BUSY_CACHE: kisa sureli uygunluk cache'i (detay saklamaz)
-- ============================================================

create table public.calendar_busy_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'busy' check (status in ('busy', 'tentative', 'oof')),
  fetched_at timestamptz not null default now(),
  source_hash text not null,
  constraint calendar_busy_cache_valid_range check (end_at > start_at)
);

create index calendar_busy_cache_user_range_idx on public.calendar_busy_cache (user_id, start_at, end_at);

comment on table public.calendar_busy_cache is 'Yalnizca baslangic/bitis ve durum; toplanti basligi/katilimci/agiklama SAKLANMAZ (veri minimizasyonu).';

-- ============================================================
-- SCHEDULE_SUGGESTIONS: aday/onaylanan/reddedilen slotlar
-- ============================================================

create table public.schedule_suggestions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  score numeric(6, 4) not null,
  status public.schedule_suggestion_status not null default 'candidate',
  reason text,
  rank smallint not null default 1,
  created_at timestamptz not null default now(),
  constraint schedule_suggestions_valid_range check (end_at > start_at)
);

create index schedule_suggestions_task_id_idx on public.schedule_suggestions (task_id);

comment on table public.schedule_suggestions is 'Scheduling engine tarafindan uretilen top-N aday slotlar (FR-06).';

-- ============================================================
-- SCHEDULED_BLOCKS: uygulama ici veya Outlook'a yazilmis plan
-- ============================================================

create table public.scheduled_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source public.scheduled_block_source not null default 'app',
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_blocks_valid_range check (end_at > start_at)
);

create index scheduled_blocks_user_range_idx on public.scheduled_blocks (user_id, start_at, end_at);

comment on table public.scheduled_blocks is 'Onaylanmis, kalici plan bloklari. source=outlook Faz 2''de kullanilacak (Calendars.ReadWrite).';

-- ============================================================
-- TASK_FEEDBACK: kullanici duzeltmeleri / kisisellestirme
-- ============================================================

create table public.task_feedback (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_type text not null check (feedback_type in ('quadrant_change', 'duration_change', 'slot_rejected', 'slot_accepted', 'manual_edit')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index task_feedback_user_id_idx on public.task_feedback (user_id);

comment on table public.task_feedback is 'Kullanicinin AI/scheduler onerilerine yaptigi duzeltmeler; ileride kisisellestirme icin kullanilir.';

-- ============================================================
-- AUDIT_LOGS: guvenlik ve hata ayiklama (hassas icerik redakte)
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);

comment on table public.audit_logs is 'Guvenlik/hata ayiklama loglari. Raw token, OAuth code, task text ve meeting detaylari YAZILMAZ.';

-- ============================================================
-- updated_at otomatik guncelleme trigger'i
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.calendar_connections
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scheduled_blocks
  for each row execute function public.set_updated_at();

-- ============================================================
-- Yeni kullanici kaydinda otomatik profile olusturma
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
