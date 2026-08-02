-- Aktif saatler + gun bazli secim; quadrant modlari work_hours | active_hours.

alter table public.profiles
  add column if not exists active_start time not null default '07:00',
  add column if not exists active_end time not null default '23:00',
  add column if not exists active_days integer[] not null default '{1,2,3,4,5,6,7}',
  add column if not exists work_days integer[] not null default '{1,2,3,4,5}';

-- Eski work_day_mode -> work_days
update public.profiles
set work_days = case
  when work_day_mode = 'weekdays_saturday' then '{1,2,3,4,5,6}'::integer[]
  when work_day_mode = 'all_days' then '{1,2,3,4,5,6,7}'::integer[]
  else '{1,2,3,4,5}'::integer[]
end
where work_day_mode is not null;

alter table public.profiles drop constraint if exists profiles_urgent_schedule_mode_check;
alter table public.profiles drop constraint if exists profiles_plan_schedule_mode_check;
alter table public.profiles drop constraint if exists profiles_get_rid_schedule_mode_check;

update public.profiles
set urgent_schedule_mode = case
  when urgent_schedule_mode in ('every_day', 'weekdays_only') then 'active_hours'
  else 'work_hours'
end;

update public.profiles
set plan_schedule_mode = case
  when plan_schedule_mode in ('every_day', 'weekdays_only') then 'active_hours'
  else 'work_hours'
end;

update public.profiles
set get_rid_schedule_mode = case
  when get_rid_schedule_mode in ('every_day', 'weekdays_only') then 'active_hours'
  else 'work_hours'
end;

alter table public.profiles
  add constraint profiles_urgent_schedule_mode_check
    check (urgent_schedule_mode in ('work_hours', 'active_hours')),
  add constraint profiles_plan_schedule_mode_check
    check (plan_schedule_mode in ('work_hours', 'active_hours')),
  add constraint profiles_get_rid_schedule_mode_check
    check (get_rid_schedule_mode in ('work_hours', 'active_hours'));

comment on column public.profiles.active_days is 'ISO gun (1=Pzt .. 7=Paz) aktif saat araligi';
comment on column public.profiles.work_days is 'ISO gun (1=Pzt .. 7=Paz) calisma saatleri';
