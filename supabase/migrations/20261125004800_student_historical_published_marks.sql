begin;

-- Preserve the existing policy entry point and grants. Resolve only sheets
-- with the entitled Student's own mark and an enrollment on the exam date.
create or replace function app_private.read_live_student_published_sheets()
returns table (school_id uuid, sheet_id uuid)
language sql stable security definer set search_path = ''
as $function$
  select ms.school_id, ms.id
  from public.read_student_portal_identity() me
  join public.marks_entries entry
    on entry.school_id = me.school_id and entry.student_id = me.student_id
  join public.marks_sheets ms
    on ms.school_id = entry.school_id and ms.id = entry.marks_sheet_id
  where ms.is_published is true
    and exists (
      select 1
      from public.enrollments enrollment
      where enrollment.school_id = me.school_id
        and enrollment.student_id = me.student_id
        and enrollment.section_id = ms.section_id
        and enrollment.valid_from <= ms.exam_date
        and (enrollment.valid_until is null or enrollment.valid_until >= ms.exam_date)
    );
$function$;

commit;
