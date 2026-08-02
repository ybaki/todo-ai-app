-- Kullanici planlama tercihleri (AI temel kurallari).
update public.tasks
set quadrant = 'get_rid'
where quadrant in ('urgent_not_important', 'not_urgent_not_important');

alter table public.profiles
  add column if not exists work_day_mode text not null default 'weekdays'
    check (work_day_mode in ('weekdays', 'weekdays_saturday', 'all_days'));

alter table public.profiles
  add column if not exists urgent_schedule_mode text not null default 'work_hours_only'
    check (urgent_schedule_mode in ('work_hours_only', 'weekdays_only', 'every_day'));

alter table public.profiles
  add column if not exists plan_schedule_mode text not null default 'work_hours_only'
    check (plan_schedule_mode in ('work_hours_only', 'weekdays_only', 'every_day'));

alter table public.profiles
  add column if not exists get_rid_schedule_mode text not null default 'work_hours_only'
    check (get_rid_schedule_mode in ('work_hours_only', 'weekdays_only', 'every_day'));

comment on column public.profiles.work_day_mode is
  'Calisma gunleri: weekdays | weekdays_saturday | all_days';

comment on column public.profiles.urgent_schedule_mode is
  'Aksiyon Al planlama modu: work_hours_only | weekdays_only | every_day';
