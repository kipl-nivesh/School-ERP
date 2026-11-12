begin;
-- Preserve legacy singleton settings; new live operations use a separate tenant table.
create table public.school_settings (like public.school_configuration including defaults);
alter table public.school_settings add column school_id uuid primary key references public.schools(id);
alter table public.school_settings enable row level security;
alter table public.school_settings force row level security;
revoke all on public.school_settings from public,anon,authenticated;
grant select,insert,update on public.school_settings to authenticated;
create policy school_settings_admin on public.school_settings for all to authenticated
 using(school_id=public.current_school_id() and public.current_active_role()='admin')
 with check(school_id=public.current_school_id() and public.current_active_role()='admin');
commit;
