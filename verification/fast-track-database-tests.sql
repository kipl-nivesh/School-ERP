-- Real PostgreSQL execution with SYNTHETIC Auth tables/claims. Not native Supabase Auth.
insert into auth.users(id,email) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin@example.invalid');
insert into public.profiles(id,account_status,credential_reset_required) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active',false);
insert into public.schools(id,code,name) values('11111111-1111-4111-8111-111111111111','FIXTURE_A','Fictional A'),('22222222-2222-4222-8222-222222222222','FIXTURE_B','Fictional B');
insert into public.staff_profiles(profile_id,school_id,display_name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Fictional Administrator');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','admin','active',array['dashboard.admin.view','admissions.write','students.read','attendance.read','attendance.write','homework.read','homework.write','payments.record','fees.read','academics.manage']);
insert into auth.sessions(id,user_id) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into auth.mfa_factors(id,user_id,factor_type,status) values('fixture-factor','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','totp','verified');
insert into public.role_contexts(id,profile_id,school_id,role_code,assignment_id,authorization_version,expires_at)
select 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',id,'11111111-1111-4111-8111-111111111111','admin','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',authorization_version,now()+interval '1 hour' from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.academic_years(id,school_id,label,starts_on,ends_on) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','Fictional year',current_date-30,current_date+365);
insert into public.classes(id,school_id,name) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','Fictional class');
insert into public.sections(id,school_id,class_id,academic_year_id,name) values('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Fictional section');

set role authenticated;
do $$ begin
  begin perform public.collect_fee_payment_atomic(null,null,1,'cash','fixture','fixture-key',null,null);
    raise exception 'Null-context fee collection accepted'; exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','public.fee_invoices','UPDATE') then raise exception 'Direct invoice mutation allowed'; end if;
  if has_function_privilege('authenticated','public.reset_auth_rate_limit(text)','EXECUTE') then raise exception 'Unsafe reset grant'; end if;
end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal','aal2','exp',extract(epoch from now()+interval '1 hour'),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())),jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,false);

do $$
declare input jsonb; first_result jsonb; retry_result jsonb; student uuid; result integer; homework uuid;
begin
  if public.current_active_role() is distinct from 'admin' then raise exception 'Synthetic context unavailable'; end if;
  input:=jsonb_build_object('fullName','Fictional Student','dateOfBirth','2015-01-01','gender','other','classId','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','sectionId','ffffffff-ffff-4fff-8fff-ffffffffffff','guardianName','Fictional Guardian','guardianPhone','0000000000','guardianEmail','guardian@example.invalid');
  first_result:=public.admit_student_idempotent('12345678-1234-4234-8234-123456789012',input);
  retry_result:=public.admit_student_idempotent('12345678-1234-4234-8234-123456789012',input);
  if first_result is distinct from retry_result then raise exception 'Admission retry changed result'; end if;
  student:=(first_result->>'id')::uuid;
  if (select count(*) from public.students where display_name='Fictional Student')<>1 then raise exception 'Duplicate admission'; end if;
  begin perform public.admit_student_idempotent('12345678-1234-4234-8234-123456789012',input||'{"fullName":"Changed"}'::jsonb); raise exception 'Payload collision accepted'; exception when unique_violation then null; end;
  begin perform public.admit_student_idempotent(gen_random_uuid(),input,'22222222-2222-4222-8222-222222222222'); raise exception 'Cross-school admission accepted'; exception when insufficient_privilege then null; end;
  begin perform public.admit_student_atomic(input); raise exception 'Old admission bypass callable'; exception when insufficient_privilege then null; end;
  result:=public.save_attendance_atomic('ffffffff-ffff-4fff-8fff-ffffffffffff',jsonb_build_array(jsonb_build_object('studentId',student,'status','present')));
  if result<>1 then raise exception 'Attendance not saved'; end if;
  begin
    perform public.save_attendance_atomic('ffffffff-ffff-4fff-8fff-ffffffffffff',jsonb_build_array(jsonb_build_object('studentId',student,'status','absent'),jsonb_build_object('studentId','ffffffff-ffff-ffff-ffff-ffffffffffff','status','present')));
    raise exception 'Unauthorized batch committed';
  exception when insufficient_privilege then null; end;
  if (select status from public.attendance_records where student_id=student)<>'present' then raise exception 'Attendance batch failed rollback'; end if;
  homework:=public.create_homework_atomic('87654321-4321-4321-8321-210987654321','ffffffff-ffff-4fff-8fff-ffffffffffff','MAT','Fictional homework','Fictional instructions',current_date+1,10);
  if homework is distinct from public.create_homework_atomic(homework,'ffffffff-ffff-4fff-8fff-ffffffffffff','MAT','Fictional homework','Fictional instructions',current_date+1,10) then raise exception 'Homework retry changed result'; end if;
  begin perform public.create_homework_atomic(homework,'ffffffff-ffff-4fff-8fff-ffffffffffff','MAT','Changed','Fictional instructions',current_date+1,10); raise exception 'Homework collision accepted'; exception when unique_violation then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.enrollments)<>1 then raise exception 'Enrollment count incorrect'; end if;
  if exists(select 1 from public.student_guardian_relationships where relationship_status<>'pending' or academic_access or fee_access) then raise exception 'Unverified guardian gained access'; end if;
  if (select count(*) from public.homework_assignments)<>1 then raise exception 'Homework duplicated'; end if;
end $$;
insert into public.fee_invoices(id,school_id,student_id,academic_year_id,invoice_number,title,due_date,amount_paise)
select '99999999-9999-4999-8999-999999999999',school_id,id,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','FIXTURE-INVOICE','Fictional invoice',current_date+5,1000 from public.students where display_name='Fictional Student';
set role authenticated;
do $$ declare student uuid; payment jsonb; repeated jsonb; begin
  select id into student from public.students where display_name='Fictional Student';
  payment:=public.collect_fee_payment_atomic(student,'99999999-9999-4999-8999-999999999999',500,'cash','fixture-reference','fixture-payment-key');
  repeated:=public.collect_fee_payment_atomic(student,'99999999-9999-4999-8999-999999999999',500,'cash','fixture-reference','fixture-payment-key');
  if payment->>'status'<>'settled' or repeated->>'status'<>'idempotent_duplicate' or payment->>'payment_id' is distinct from repeated->>'payment_id' then raise exception 'Payment retry mismatch'; end if;
  if (select paid_paise from public.fee_invoices where id='99999999-9999-4999-8999-999999999999')<>500 then raise exception 'Invoice balance mismatch'; end if;
  begin perform public.collect_fee_payment_atomic(student,'99999999-9999-4999-8999-999999999999',501,'cash','fixture-reference','fixture-overpayment'); raise exception 'Overpayment accepted'; exception when numeric_value_out_of_range then null; end;
  begin perform public.collect_fee_payment_atomic(student,'99999999-9999-4999-8999-999999999999',499,'cash','fixture-reference','fixture-payment-key'); raise exception 'Payment collision accepted'; exception when unique_violation then null; end;
end $$;
reset role;
select 'PASS: PostgreSQL admission retry/collision/scope, attendance rollback, homework retry/collision, payment settlement/retry/overpayment and privilege checks. Synthetic Auth only.';

-- A separate teacher exercises real RLS with synthetic native-session metadata.
insert into auth.users(id,email) values('abababab-abab-4bab-8bab-abababababab','teacher@example.invalid');
insert into public.profiles(id,account_status,credential_reset_required) values('abababab-abab-4bab-8bab-abababababab','active',false);
insert into public.staff_profiles(profile_id,school_id,display_name) values('abababab-abab-4bab-8bab-abababababab','11111111-1111-4111-8111-111111111111','Fictional Teacher');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
values('bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc','abababab-abab-4bab-8bab-abababababab','11111111-1111-4111-8111-111111111111','teacher','active',array['dashboard.teacher.view','students.read','homework.write','homework.read','attendance.write','attendance.read','marks.read']);
insert into auth.sessions(id,user_id) values('cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','abababab-abab-4bab-8bab-abababababab');
insert into public.role_contexts(id,profile_id,school_id,role_code,assignment_id,authorization_version,expires_at)
select 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',id,'11111111-1111-4111-8111-111111111111','teacher','bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc',authorization_version,now()+interval '1 hour' from public.profiles where id='abababab-abab-4bab-8bab-abababababab';
insert into public.teacher_assignments(school_id,teacher_profile_id,section_id,academic_year_id,subject_code,valid_from)
values('11111111-1111-4111-8111-111111111111','abababab-abab-4bab-8bab-abababababab','ffffffff-ffff-4fff-8fff-ffffffffffff','dddddddd-dddd-4ddd-8ddd-dddddddddddd','MAT',current_date-10);
insert into public.homework_assignments(school_id,section_id,subject_code,title,description,due_date,max_points,teacher_profile_id)
values('11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff',
  'SCI','Unassigned subject homework','Fictional instructions',current_date+1,10,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.marks_sheets(school_id,section_id,exam_name,subject_code,exam_date,max_marks,passing_marks,created_by_profile_id)
select '11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff',
  'Subject scope fixture', subject_code, current_date, 100, 40,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
from (values ('MAT'),('SCI')) as subjects(subject_code);
insert into public.marks_entries(school_id,marks_sheet_id,student_id,marks_obtained)
select sheet.school_id,sheet.id,student.id,50
from public.marks_sheets sheet
join public.students student on student.school_id=sheet.school_id
where sheet.exam_name='Subject scope fixture';
set role authenticated;
select set_config('request.jwt.claim.sub','abababab-abab-4bab-8bab-abababababab',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','aal','aal1','exp',extract(epoch from now()+interval '1 hour'),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,false);
do $$ begin
  if (select count(*) from public.students)<>1 then raise exception 'Assigned teacher roster unavailable'; end if;
  if not exists(select 1 from public.homework_assignments where subject_code='MAT')
    or exists(select 1 from public.homework_assignments where subject_code='SCI') then
    raise exception 'Teacher homework read did not enforce subject assignment';
  end if;
  if (select array_agg(subject_code) from public.marks_sheets where exam_name='Subject scope fixture')
     is distinct from array['MAT'] or (select count(*) from public.marks_entries) <> 1 then
    raise exception 'Teacher marks read did not enforce subject assignment';
  end if;
  if exists(select 1 from public.schools where id='22222222-2222-4222-8222-222222222222') then raise exception 'Teacher cross-school read'; end if;
  begin perform public.create_homework_atomic(gen_random_uuid(),'ffffffff-ffff-4fff-8fff-ffffffffffff','SCI','Unauthorized subject','Fictional instructions',current_date+1,10); raise exception 'Unassigned subject accepted'; exception when insufficient_privilege then null; end;
  begin perform public.collect_fee_payment_atomic(null,null,100,'cash','fixture','teacher-finance'); raise exception 'Teacher collected payment'; exception when insufficient_privilege then null; end;
  perform public.create_homework_atomic('12121212-1212-4212-8212-121212121212','ffffffff-ffff-4fff-8fff-ffffffffffff','MAT','Assigned teacher homework','Fictional instructions',current_date+1,10);
end $$;
reset role;
update public.teacher_assignments set valid_until=current_date-1 where teacher_profile_id='abababab-abab-4bab-8bab-abababababab';
set role authenticated;
do $$ begin
  if exists(select 1 from public.students) then raise exception 'Expired assignment can read students'; end if;
  begin perform public.create_homework_atomic(gen_random_uuid(),'ffffffff-ffff-4fff-8fff-ffffffffffff','MAT','Expired assignment','Fictional instructions',current_date+1,10); raise exception 'Expired teacher assignment accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: PostgreSQL teacher roster RLS, school isolation, subject authorization, finance denial and assignment expiry. Synthetic Auth only.';

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal','aal2','exp',extract(epoch from now()+interval '1 hour'),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())),jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,false);
set role authenticated;
do $$
declare req uuid:=gen_random_uuid(); cls uuid:=gen_random_uuid(); sec uuid:=gen_random_uuid(); slot uuid:=gen_random_uuid(); result jsonb; payload jsonb; original_claims text;
begin
  if public.staff_recovery_scope() is distinct from '{"eligible":true,"requires_mfa":true}'::jsonb then raise exception 'Admin recovery eligibility incorrect'; end if;
  result:=public.manage_academics(req,'class',cls,'{"name":"Command class"}');
  if result is distinct from public.manage_academics(req,'class',cls,'{"name":"Command class"}') then raise exception 'Class retry changed result'; end if;
  begin perform public.manage_academics(req,'class',cls,'{"name":"Collision"}'); raise exception 'Management request collision accepted'; exception when unique_violation then null; end;
  perform public.manage_academics(gen_random_uuid(),'section',sec,jsonb_build_object('name','Command section','classId',cls,'yearId','dddddddd-dddd-4ddd-8ddd-dddddddddddd'));
  begin perform public.manage_academics(gen_random_uuid(),'section',gen_random_uuid(),jsonb_build_object('name','Invalid section','classId',cls,'yearId','22222222-2222-4222-8222-222222222222')); raise exception 'Unknown academic year accepted'; exception when insufficient_privilege then null; end;
  perform public.manage_academics(gen_random_uuid(),'assignment',gen_random_uuid(),jsonb_build_object('teacherId','abababab-abab-4bab-8bab-abababababab','sectionId',sec,'subject','MAT','validFrom',current_date));
  begin perform public.manage_academics(gen_random_uuid(),'assignment',gen_random_uuid(),jsonb_build_object('teacherId','abababab-abab-4bab-8bab-abababababab','sectionId',sec,'subject','MAT','validFrom',current_date)); raise exception 'Overlapping assignment accepted'; exception when unique_violation then null; end;
  payload:=jsonb_build_object('teacherId','abababab-abab-4bab-8bab-abababababab','sectionId',sec,'subject','MAT','day','Monday','period',1,'start','09:00','end','10:00','room','Fictional room','revision',0);
  result:=public.manage_academics(gen_random_uuid(),'timetable',slot,payload);
  if (result->>'revision')::integer<>1 then raise exception 'New slot revision incorrect'; end if;
  begin perform public.manage_academics(gen_random_uuid(),'timetable',gen_random_uuid(),payload||'{"period":2,"start":"09:30","end":"10:30"}'::jsonb); raise exception 'Overlapping slot accepted'; exception when unique_violation then null; end;
  result:=public.manage_academics(gen_random_uuid(),'timetable',slot,payload||'{"revision":1,"end":"10:15"}'::jsonb);
  if (result->>'revision')::integer<>2 then raise exception 'Slot update revision incorrect'; end if;
  begin perform public.manage_academics(gen_random_uuid(),'timetable',slot,payload||'{"revision":1}'::jsonb); raise exception 'Stale slot update accepted'; exception when serialization_failure then null; end;
  payload:=jsonb_build_object('revision',1,'title','Updated fictional homework','description','Updated instructions','due',current_date+2,'points',12,'status','closed');
  req:=gen_random_uuid();
  result:=public.manage_academics(req,'homework','87654321-4321-4321-8321-210987654321',payload);
  if (result->>'revision')::integer<>2 then raise exception 'Homework revision incorrect'; end if;
  if result is distinct from public.manage_academics(req,'homework','87654321-4321-4321-8321-210987654321',payload) then raise exception 'Homework edit retry mismatch'; end if;
  begin perform public.manage_academics(gen_random_uuid(),'homework','87654321-4321-4321-8321-210987654321',payload); raise exception 'Stale homework edit accepted'; exception when serialization_failure then null; end;
  original_claims:=current_setting('request.jwt.claims');
  perform set_config('request.jwt.claims',jsonb_set(original_claims::jsonb,'{iss}','"https://wrong.example.invalid/auth/v1"')::text,false);
  if public.staff_recovery_scope() is not null then raise exception 'Foreign issuer recovery accepted'; end if;
  perform set_config('request.jwt.claims',jsonb_set(original_claims::jsonb,'{exp}','0')::text,false);
  if public.staff_recovery_scope() is not null then raise exception 'Expired recovery accepted'; end if;
  perform set_config('request.jwt.claims',original_claims,false);
end $$;
reset role;
select 'PASS: academic management persistence/retries/revisions/overlaps and recovery identity scope. Synthetic Auth only.';

select set_config('request.jwt.claim.sub','abababab-abab-4bab-8bab-abababababab',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','aal','aal1','exp',extract(epoch from now()+interval '1 hour'),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,false);
set role authenticated;
do $$ begin
  if public.staff_recovery_scope() is distinct from '{"eligible":true,"requires_mfa":false}'::jsonb then raise exception 'Teacher recovery scope incorrect'; end if;
  begin perform public.manage_academics(gen_random_uuid(),'class',gen_random_uuid(),'{"name":"Unauthorized class"}'); raise exception 'Teacher created class'; exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','public.timetable_slots','UPDATE') then raise exception 'Direct timetable writes allowed'; end if;
end $$;
reset role;
update public.profiles set account_status='suspended' where id='abababab-abab-4bab-8bab-abababababab';
set role authenticated;
do $$ begin if public.staff_recovery_scope() is not null then raise exception 'Suspended account recovery accepted'; end if; end $$;
reset role;
select 'PASS: teacher management denial, direct write revocation and suspended recovery denial.';

-- Accountant settlement with an independently scoped, synthetic session.
begin;
insert into auth.users(id,email) values('34343434-3434-4434-8434-343434343434','finance@example.invalid');
insert into public.profiles(id,account_status,credential_reset_required)
values('34343434-3434-4434-8434-343434343434','active',false);
insert into public.staff_profiles(profile_id,school_id,display_name)
values('34343434-3434-4434-8434-343434343434','11111111-1111-4111-8111-111111111111','Finance Fixture');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
values('35353535-3535-4535-8535-353535353535','34343434-3434-4434-8434-343434343434',
  '11111111-1111-4111-8111-111111111111','accountant','active',app_private.default_managed_staff_permissions('accountant'));
insert into auth.sessions(id,user_id)
values('36363636-3636-4636-8636-363636363636','34343434-3434-4434-8434-343434343434');
insert into public.role_contexts(id,profile_id,school_id,role_code,assignment_id,authorization_version,expires_at)
select '36363636-3636-4636-8636-363636363636',id,'11111111-1111-4111-8111-111111111111','accountant',
  '35353535-3535-4535-8535-353535353535',authorization_version,now()+interval '1 hour'
from public.profiles where id='34343434-3434-4434-8434-343434343434';
set local role authenticated;
do $$
declare invoice constant uuid := '99999999-9999-4999-8999-999999999999';
  school constant uuid := '11111111-1111-4111-8111-111111111111';
  student uuid;
  first_result jsonb;
  retry_result jsonb;
begin
  perform set_config('request.jwt.claim.sub','34343434-3434-4434-8434-343434343434',true);
  perform set_config('request.jwt.claims',jsonb_build_object(
    'iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated',
    'session_id','36363636-3636-4636-8636-363636363636','aal','aal1','exp',extract(epoch from now()+interval '1 hour'),
    'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
  select student_id into student from public.fee_invoices where id=invoice;
  first_result:=public.collect_fee_payment_atomic(student,invoice,100,'cash','accountant fixture','accountant-fixture-request',null,school);
  retry_result:=public.collect_fee_payment_atomic(student,invoice,100,'cash','accountant fixture','accountant-fixture-request',null,school);
  if first_result->>'status' is distinct from 'settled'
     or retry_result->>'status' is distinct from 'idempotent_duplicate'
     or first_result->>'payment_id' is distinct from retry_result->>'payment_id' then
    raise exception 'Accountant settlement retry mismatch';
  end if;
  begin
    perform public.collect_fee_payment_atomic(student,invoice,100,'cash','accountant fixture',
      'accountant-foreign-request',null,'22222222-2222-4222-8222-222222222222');
    raise exception 'Cross-school settlement allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: Accountant settlement, idempotent retry, and cross-school denial.';

insert into auth.users(id,email) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','invitee@example.invalid');
insert into auth.sessions(id,user_id) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal','aal2','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())),jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,false);
set role authenticated;
do $$ begin
  perform public.issue_staff_invitation(' INVITEE@example.invalid ',' Fixture invitee ','teacher',encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
  if public.accept_staff_invitation(repeat('a',64)) then raise exception 'Mismatched email accepted'; end if;
end $$;
reset role;
update public.staff_invitations set expires_at=now()-interval '1 hour' where email='invitee@example.invalid';
set role authenticated;
do $$ begin
  perform public.issue_staff_invitation('invitee@example.invalid','Fixture invitee','teacher',encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex'));
end $$;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
select set_config('request.jwt.claims',jsonb_build_object('iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated','session_id','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,false);
do $$ begin
  if public.accept_staff_invitation(repeat('a',64)) then raise exception 'Expired invitation accepted'; end if;
  if public.accept_staff_invitation(repeat('b',64)) is distinct from true then raise exception 'Matching invitation denied'; end if;
  if public.accept_staff_invitation(repeat('b',64)) then raise exception 'Invitation replay accepted'; end if;
  begin
    perform public.issue_staff_invitation('another@example.invalid','Unauthorized invite','teacher',repeat('c',64));
    raise exception 'Teacher issued invitation';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.user_roles where profile_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
     and school_id='11111111-1111-4111-8111-111111111111' and role_code='teacher' and membership_status='active')
  then raise exception 'Invitation did not persist expected tenant membership'; end if;
end $$;
select 'PASS: invitation issuance, expired replacement, wrong identity, replay and teacher denial.';
