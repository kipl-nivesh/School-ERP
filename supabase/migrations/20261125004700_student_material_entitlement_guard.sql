begin;

-- Resolve entitlement once per statement for every published material audience.
alter policy student_materials_published_read on public.student_portal_materials using (
  status = 'published'::text
  and (select public.current_active_role()) = 'student'::text
  and school_id = (select public.current_school_id())
  and school_id in (
    select me.school_id from public.read_student_portal_identity() me
  )
  and (
    audience = 'school'::text
    or (
      audience = 'student'::text
      and (school_id, student_id) in (
        select me.school_id, me.student_id from public.read_student_portal_identity() me
      )
    )
    or (
      audience = 'class'::text
      and (school_id, class_id) in (
        select c.school_id, c.class_id from app_private.read_live_student_class() c
      )
    )
    or (
      audience = 'section'::text
      and (school_id, section_id) in (
        select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
      )
    )
  )
);

commit;
