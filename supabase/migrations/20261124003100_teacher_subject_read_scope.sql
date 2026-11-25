begin;

-- Intersect existing permissive policies for Teacher reads. Other roles
-- continue to use their existing policies.
create policy homework_teacher_subject_scope on public.homework_assignments
as restrictive for select to authenticated using (
  public.current_active_role() is distinct from 'teacher' or (
    public.current_role_has_permission('homework.read')
    and homework_assignments.school_id = public.current_school_id()
    and exists (
      select 1 from public.teacher_assignments a
      where a.school_id = homework_assignments.school_id
        and a.section_id = homework_assignments.section_id
        and a.subject_code = homework_assignments.subject_code
        and a.teacher_profile_id = auth.uid()
        and a.valid_from <= current_date
        and (a.valid_until is null or a.valid_until >= current_date)
    )
  )
);

create policy marks_sheets_teacher_subject_scope on public.marks_sheets
as restrictive for select to authenticated using (
  public.current_active_role() is distinct from 'teacher' or (
    public.current_role_has_permission('marks.read')
    and marks_sheets.school_id = public.current_school_id()
    and exists (
      select 1 from public.teacher_assignments a
      where a.school_id = marks_sheets.school_id
        and a.section_id = marks_sheets.section_id
        and a.subject_code = marks_sheets.subject_code
        and a.teacher_profile_id = auth.uid()
        and a.valid_from <= current_date
        and (a.valid_until is null or a.valid_until >= current_date)
    )
  )
);

create policy marks_entries_teacher_subject_scope on public.marks_entries
as restrictive for select to authenticated using (
  public.current_active_role() is distinct from 'teacher' or (
    public.current_role_has_permission('marks.read')
    and marks_entries.school_id = public.current_school_id()
    and exists (
      select 1 from public.marks_sheets sheet
      where sheet.id = marks_entries.marks_sheet_id
        and sheet.school_id = marks_entries.school_id
    )
  )
);

commit;
