-- Run only on the local synthetic database after the operational SQL fixture.
-- All additional test records and changes roll back.
begin;

update public.profiles set account_status='active'
where id='abababab-abab-4bab-8bab-abababababab';
update public.user_roles set permissions=app_private.default_managed_staff_permissions('teacher')
where id='bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc';
update public.role_contexts c set revoked_at=null,authorization_version=p.authorization_version
from public.profiles p where c.profile_id=p.id and p.id='abababab-abab-4bab-8bab-abababababab';
update public.teacher_assignments set valid_until=null
where teacher_profile_id='abababab-abab-4bab-8bab-abababababab'
  and section_id='ffffffff-ffff-4fff-8fff-ffffffffffff';

insert into auth.users(id,email) values
  ('34343434-3434-4434-8434-343434343434','finance-core@example.invalid'),
  ('44444444-4444-4444-8444-444444444444','replacement-core@example.invalid');
insert into public.profiles(id,account_status,credential_reset_required)
values ('34343434-3434-4434-8434-343434343434','active',false),('44444444-4444-4444-8444-444444444444','active',false);
insert into public.staff_profiles(profile_id,school_id,display_name)
values ('34343434-3434-4434-8434-343434343434','11111111-1111-4111-8111-111111111111','Finance Core'),
       ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Replacement Core');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
values ('35353535-3535-4535-8535-353535353535','34343434-3434-4434-8434-343434343434',
  '11111111-1111-4111-8111-111111111111','accountant','active',app_private.default_managed_staff_permissions('accountant')),
 ('45454545-4545-4545-8545-454545454545','44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111','teacher','active',app_private.default_managed_staff_permissions('teacher'));
insert into auth.sessions(id,user_id) values('36363636-3636-4636-8636-363636363636','34343434-3434-4434-8434-343434343434');
insert into auth.mfa_factors(id,user_id,factor_type,status)
values('fixture-finance-totp','34343434-3434-4434-8434-343434343434','totp','verified');
insert into public.role_contexts(id,profile_id,school_id,role_code,assignment_id,authorization_version,expires_at)
select '36363636-3636-4636-8636-363636363636',id,'11111111-1111-4111-8111-111111111111','accountant',
  '35353535-3535-4535-8535-353535353535',authorization_version,now()+interval '1 hour'
from public.profiles where id='34343434-3434-4434-8434-343434343434';
update public.user_roles set permissions=permissions||array['expenses.write','expenses.read','marks.read','marks.write','marks.publish']
where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
update public.role_contexts c set revoked_at=null,authorization_version=p.authorization_version
from public.profiles p where c.profile_id=p.id and p.id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.marks_sheets(id,school_id,section_id,exam_name,subject_code,exam_date,max_marks,passing_marks,
  created_by_profile_id,is_published,published_at)
values('46464646-4646-4646-8464-464646464646','11111111-1111-4111-8111-111111111111',
  'ffffffff-ffff-4fff-8fff-ffffffffffff','Published fixture','MAT',current_date,100,40,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,now());

create function pg_temp.core_claims(actor uuid,session uuid,aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object(
    'iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated',
    'session_id',session,'aal',aal,'exp',extract(epoch from now()+interval '1 hour'),
    'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',floor(extract(epoch from now())))) ||
      case when aal='aal2' then jsonb_build_array(jsonb_build_object('method','totp','timestamp',floor(extract(epoch from now()))))
        else '[]'::jsonb end)::text,true);
end $$;

set local role authenticated;
do $$
declare
  school constant uuid := '11111111-1111-4111-8111-111111111111';
  foreign_school constant uuid := '22222222-2222-4222-8222-222222222222';
  class_id constant uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  section_ref constant uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  teacher constant uuid := 'abababab-abab-4bab-8bab-abababababab';
  replacement constant uuid := '44444444-4444-4444-8444-444444444444';
  expense constant uuid := '47474747-4747-4747-8747-474747474747';
  structure constant uuid := '48484848-4848-4848-8848-484848484848';
  announcement constant uuid := '49494949-4949-4949-8949-494949494949';
  student uuid; sheet uuid; other_sheet uuid; mark_id uuid; assignment uuid; invoice uuid;
begin
  perform pg_temp.core_claims(teacher,'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','aal1');
  select id into strict student from public.students where display_name='Fictional Student';
  select id into strict sheet from public.marks_sheets where exam_name='Subject scope fixture' and subject_code='MAT';
  mark_id:=public.save_teacher_draft_mark(school,sheet,student,72.25,50);
  if mark_id is distinct from public.save_teacher_draft_mark(school,sheet,student,72.25,50) then
    raise exception 'Mark retry created another entry';
  end if;
  begin perform public.save_teacher_draft_mark(school,sheet,student,101,72.25);
    raise exception 'Above-maximum mark accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.save_teacher_draft_mark(school,sheet,student,73,50);
    raise exception 'Stale mark accepted'; exception when serialization_failure then null; end;
  begin perform public.save_teacher_draft_mark(foreign_school,sheet,student,73,72.25);
    raise exception 'Cross-school mark accepted'; exception when insufficient_privilege then null; end;
  begin perform public.save_teacher_draft_mark(school,sheet,gen_random_uuid(),73,null);
    raise exception 'Unenrolled student mark accepted'; exception when insufficient_privilege then null; end;
  update public.marks_entries set marks_obtained=0 where id=mark_id;
  if found then raise exception 'Teacher direct marks update accepted'; end if;
  begin perform public.update_academic_lifecycle(school,'rename_class',class_id,'Fictional class','Denied',null,null);
    raise exception 'Teacher academic edit accepted'; exception when insufficient_privilege then null; end;
  perform public.manage_teacher_staff_announcement(school,announcement,'publish','Staff fixture','School staff only.');
  perform public.manage_teacher_staff_announcement(school,announcement,'publish','Staff fixture','School staff only.');
  if not exists(select 1 from public.announcements where id=announcement and target_audience='staff') then
    raise exception 'Staff announcement not scoped'; end if;
  begin perform public.manage_teacher_staff_announcement(foreign_school,gen_random_uuid(),'publish','Wrong school','A staff notice.');
    raise exception 'Cross-school announcement accepted'; exception when insufficient_privilege then null; end;

  perform pg_temp.core_claims('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal2');
  select id into strict other_sheet from public.marks_sheets where exam_name='Subject scope fixture' and subject_code='SCI';
  perform public.update_academic_lifecycle(school,'rename_class',class_id,'Fictional class','Updated class',null,null);
  perform public.update_academic_lifecycle(school,'rename_section',section_ref,'Fictional section','Updated section',null,null);
  begin perform public.update_academic_lifecycle(school,'rename_class',class_id,'Fictional class','Stale rename',null,null);
    raise exception 'Stale rename accepted'; exception when serialization_failure then null; end;
  select id into strict assignment from public.teacher_assignments a
    where a.teacher_profile_id=teacher and a.section_id<>section_ref and a.subject_code='MAT';
  perform public.update_academic_lifecycle(school,'replace_assignment',assignment,'',null,replacement,current_date+1);
  if not exists(select 1 from public.teacher_assignments where id=assignment and valid_until=current_date) or
     not exists(select 1 from public.teacher_assignments where teacher_profile_id=replacement and valid_from=current_date+1) then
    raise exception 'Assignment history not preserved';
  end if;
  select id into strict assignment from public.teacher_assignments a where a.teacher_profile_id=teacher and a.section_id=section_ref;
  perform public.update_academic_lifecycle(school,'end_assignment',assignment,'',null,null,current_date+1);

  perform pg_temp.core_claims(teacher,'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','aal1');
  begin perform public.save_teacher_draft_mark(school,other_sheet,student,73,50);
    raise exception 'Unassigned subject mark accepted'; exception when insufficient_privilege then null; end;
  begin perform public.save_teacher_draft_mark(school,'46464646-4646-4646-8464-464646464646',student,73,null);
    raise exception 'Published mark change accepted'; exception when insufficient_privilege then null; end;

  perform pg_temp.core_claims('34343434-3434-4434-8434-343434343434','36363636-3636-4636-8636-363636363636','aal1');
  perform public.configure_school_fee(school,structure,class_id,'tuition','monthly',12300,current_date+1,null,null);
  invoice:=public.assign_school_fee(school,structure,student,current_date+1);
  if invoice is distinct from public.assign_school_fee(school,structure,student,current_date+1) then
    raise exception 'Fee assignment retry charged again'; end if;
  perform public.configure_school_fee(school,structure,null,null,null,15000,current_date+2,12300,current_date+1);
  if (select amount_paise from public.fee_invoices where id=invoice) is distinct from 12300::bigint then
    raise exception 'Existing invoice changed with fee structure'; end if;
  begin perform public.assign_school_fee(foreign_school,structure,student,current_date+1);
    raise exception 'Cross-school invoice accepted'; exception when insufficient_privilege then null; end;
  perform public.manage_staff_expense_draft(school,expense,'create',null,'supplies','Fixture payee',100,current_date,'cash','Fixture supplies');
  perform public.manage_staff_expense_draft(school,expense,'edit',1,'supplies','Fixture payee',125,current_date,'cash','Fixture supplies');
  perform public.manage_staff_expense_draft(school,expense,'submit',2,null,null,null,null,null,null);
  begin perform public.manage_staff_expense_draft(school,expense,'approve',3,null,null,null,null,null,null);
    raise exception 'Accountant approved expense'; exception when insufficient_privilege then null; end;
  begin perform public.export_school_finance_invoices(school,current_date,current_date);
    raise exception 'Password-only export accepted'; exception when insufficient_privilege then null; end;
  perform pg_temp.core_claims('34343434-3434-4434-8434-343434343434','36363636-3636-4636-8636-363636363636','aal2');
  if jsonb_array_length(public.export_school_finance_invoices(school,current_date,current_date))<1 then
    raise exception 'Authorized export returned no invoice'; end if;
  begin perform public.export_school_finance_invoices(foreign_school,current_date,current_date);
    raise exception 'Foreign school export accepted'; exception when insufficient_privilege then null; end;
  perform pg_temp.core_claims('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal2');
  perform public.manage_staff_expense_draft(school,expense,'approve',3,null,null,null,null,null,null);
  begin perform public.manage_staff_expense_draft(school,expense,'approve',3,null,null,null,null,null,null);
    raise exception 'Duplicate expense approval accepted'; exception when serialization_failure then null; end;
end $$;

reset role;
do $$ begin
  if not exists(select 1 from public.operating_expenses where id='47474747-4747-4747-8747-474747474747'
    and amount_paise=125 and approved_by_profile_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then
    raise exception 'Posted expense ledger entry missing';
  end if;
  if not exists(select 1 from public.audit_events where event_type='financial_invoice_export')
    or not exists(select 1 from public.audit_events where event_type='teacher_draft_mark_saved') then
    raise exception 'Sensitive operation audit missing';
  end if;
end $$;

rollback;
select 'PASS: academic lifecycle, draft marks, announcement scope, fee integrity, expense posting and audited MFA export.';
