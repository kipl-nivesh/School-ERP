-- Migration 053: Parent Portal RLS Statement-Level Performance Optimization
-- Replaces per-row correlated joins in student_exam_schedule_parent_read and
-- student_materials_parent_read with a statement-cached SECURITY DEFINER helper
-- matching Migration 046's read_live_student_section() pattern.
-- Preserves all guardian verification, academic_access, and tenant isolation checks.

begin;

create or replace function app_private.read_live_parent_academic_sections()
returns table (school_id uuid, section_id uuid, class_id uuid, student_id uuid)
language sql stable security definer set search_path = '' as $$
  select sgr.school_id, e.section_id, sec.class_id, sgr.student_id
  from public.guardians g
  join public.student_guardian_relationships sgr on sgr.guardian_id = g.id
  join public.students st on st.id = sgr.student_id and st.school_id = sgr.school_id
  join public.enrollments e on e.student_id = sgr.student_id and e.school_id = sgr.school_id
  join public.sections sec on sec.id = e.section_id and sec.school_id = e.school_id
  where public.parent_session_is_live()
    and public.current_active_role() = 'parent'
    and public.current_role_has_permission('children.academics.read')
    and g.profile_id = auth.uid()
    and sgr.school_id = public.current_school_id()
    and sgr.relationship_status = 'verified'
    and sgr.academic_access = true
    and sgr.valid_from <= now()
    and (sgr.valid_until is null or sgr.valid_until > now())
    and st.enrollment_status = 'active'
    and e.valid_from <= current_date
    and (e.valid_until is null or e.valid_until >= current_date);
$$;

alter function app_private.read_live_parent_academic_sections() owner to postgres;
revoke all on function app_private.read_live_parent_academic_sections() from public, anon, service_role;
grant execute on function app_private.read_live_parent_academic_sections() to authenticated;

alter policy student_exam_schedule_parent_read on public.student_exam_schedule
  using (
    status = 'published'
    and (select public.current_active_role()) = 'parent'
    and (school_id, section_id) in (
      select sec.school_id, sec.section_id
      from app_private.read_live_parent_academic_sections() sec
    )
  );

alter policy student_materials_parent_read on public.student_portal_materials
  using (
    status = 'published'
    and (select public.current_active_role()) = 'parent'
    and school_id = (select public.current_school_id())
    and (
      (audience = 'school' and exists (select 1 from app_private.read_live_parent_academic_sections()))
      or (audience = 'class' and (school_id, class_id) in (
        select sec.school_id, sec.class_id from app_private.read_live_parent_academic_sections() sec
      ))
      or (audience = 'section' and (school_id, section_id) in (
        select sec.school_id, sec.section_id from app_private.read_live_parent_academic_sections() sec
      ))
      or (audience = 'student' and (school_id, student_id) in (
        select sec.school_id, sec.student_id from app_private.read_live_parent_academic_sections() sec
      ))
    )
  );

commit;
