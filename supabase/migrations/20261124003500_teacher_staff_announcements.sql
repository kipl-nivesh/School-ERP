begin;

create policy teacher_no_direct_announcement_insert on public.announcements
as restrictive for insert to authenticated with check (public.current_active_role() is distinct from 'teacher');
create policy teacher_no_direct_announcement_update on public.announcements
as restrictive for update to authenticated using (public.current_active_role() is distinct from 'teacher')
with check (public.current_active_role() is distinct from 'teacher');
create policy teacher_no_direct_announcement_delete on public.announcements
as restrictive for delete to authenticated using (public.current_active_role() is distinct from 'teacher');

create function public.manage_teacher_staff_announcement(
  p_school uuid,p_id uuid,p_intent text,p_title text,p_content text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  actor uuid := auth.uid();
  prior public.announcements%rowtype;
begin
  if school is null or school is distinct from p_school or actor is null or p_id is null
    or public.current_active_role() is distinct from 'teacher'
    or public.current_role_has_permission('announcements.write') is not true then
    raise exception 'Announcement change not authorized' using errcode='42501';
  end if;
  if p_intent='publish' then
    if p_title is null or length(btrim(p_title)) not between 3 and 200 or p_title ~ '[[:cntrl:]]'
      or p_content is null or length(btrim(p_content)) not between 5 and 5000 then
      raise exception 'Invalid announcement' using errcode='22023';
    end if;
    insert into public.announcements(id,school_id,title,content,target_audience,author_profile_id)
      values(p_id,school,btrim(p_title),btrim(p_content),'staff',actor) on conflict(id) do nothing;
    if not found then
      select * into prior from public.announcements where id=p_id and school_id=school
        and author_profile_id=actor and target_audience='staff';
      if not found or prior.title is distinct from btrim(p_title) or prior.content is distinct from btrim(p_content) then
        raise exception 'Announcement request conflict' using errcode='23505';
      end if;
      return p_id;
    end if;
  elsif p_intent='archive' then
    update public.announcements set expires_at=now()
      where id=p_id and school_id=school and author_profile_id=actor and target_audience='staff'
        and published_at<now() and (expires_at is null or expires_at>now());
    if not found then raise exception 'Announcement unavailable' using errcode='42501'; end if;
  else
    raise exception 'Unsupported announcement change' using errcode='22023';
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(actor,'teacher_staff_announcement_'||p_intent,school,jsonb_build_object('id',p_id));
  return p_id;
end $$;
alter function public.manage_teacher_staff_announcement(uuid,uuid,text,text,text) owner to postgres;
revoke all on function public.manage_teacher_staff_announcement(uuid,uuid,text,text,text) from public,anon,service_role;
grant execute on function public.manage_teacher_staff_announcement(uuid,uuid,text,text,text) to authenticated;

commit;
