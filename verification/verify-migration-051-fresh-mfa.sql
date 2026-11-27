-- Focused Migration 051 Security Verification (Disposable Only, Rolled Back)
begin;

do $$
declare
  v_admin uuid;
  v_school uuid;
  v_session uuid;
  v_student uuid;
  v_role_ctx uuid;
  v_now bigint := extract(epoch from now())::bigint;
  v_expired bigint := v_now - 700;
  v_res jsonb;
  v_ok boolean;
begin
  -- Pick existing active admin with a verified TOTP factor and a pending student in the same school
  select ur.profile_id, ur.school_id, ur.id
    into v_admin, v_school, v_role_ctx
  from public.user_roles ur
  join public.profiles p on p.id = ur.profile_id
  join public.staff_profiles sp on sp.profile_id = ur.profile_id and sp.school_id = ur.school_id
  join public.schools sc on sc.id = ur.school_id
  where ur.role_code = 'admin' and ur.membership_status = 'active'
    and p.account_status = 'active' and not p.credential_reset_required
    and sp.is_active and sc.status = 'active'
    and 'admissions.write' = any(ur.permissions)
    and 'security.accounts.create' = any(ur.permissions)
    and exists (select 1 from auth.mfa_factors mf where mf.user_id = ur.profile_id and mf.status = 'verified')
  limit 1;

  select s.id into v_student
  from public.students s
  where s.school_id = v_school and s.enrollment_status = 'active'
    and s.portal_access_status = 'pending_activation' and s.profile_id is null
  limit 1;

  if v_admin is null or v_student is null then
    raise exception 'Missing disposable admin or pending student fixture';
  end if;

  -- Create temporary auth.sessions + role_contexts for staff_session_is_live()
  v_session := gen_random_uuid();
  insert into auth.sessions (id, user_id, created_at, not_after, aal)
  values (v_session, v_admin, now(), now() + interval '1 hour', 'aal2');

  insert into public.role_contexts (id, profile_id, role_code, assignment_id, context_version, authorization_version, expires_at, school_id)
  select v_session, v_admin, 'admin', v_role_ctx, 1, p.authorization_version, now() + interval '1 hour', v_school
  from public.profiles p where p.id = v_admin;

  -- Verify app_private.accountant_export_mfa_is_fresh() directly for expired vs fresh AMR
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text,
    'aud', 'authenticated',
    'role', 'authenticated',
    'aal', 'aal2',
    'session_id', v_session::text,
    'app_metadata', jsonb_build_object('provider', 'email'),
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'password', 'timestamp', v_expired),
      jsonb_build_object('method', 'totp', 'timestamp', v_expired + 1)
    )
  )::text, true);

  if app_private.accountant_export_mfa_is_fresh() is not false then
    raise exception 'FAIL: accountant_export_mfa_is_fresh returned true for expired AMR';
  end if;

  set local role authenticated;

  v_res := public.inspect_student_identity_status(v_student, 'fresh.check@gmail.com');
  if (v_res->>'authorized')::boolean is not true then
    raise exception 'FAIL: Admin fixture not authorized: % (school=%, role=%, live=%, uid=%)',
      v_res, public.current_school_id(), public.current_active_role(), public.staff_session_is_live(), auth.uid();
  end if;
  if (v_res->>'mfa_fresh')::boolean is not false then
    raise exception 'FAIL: Expected mfa_fresh=false for expired AMR (got %)', v_res;
  end if;

  v_ok := public.link_pending_student_identity(v_student, 'fresh.check@gmail.com');
  if v_ok is not false then
    raise exception 'FAIL: link_pending_student_identity allowed expired MFA';
  end if;

  v_ok := public.manage_student_portal_pin(v_student, 'activate', repeat('a', 64), repeat('b', 32));
  if v_ok is not false then
    raise exception 'FAIL: manage_student_portal_pin allowed expired MFA';
  end if;

  v_ok := public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'sent');
  if v_ok is not false then
    raise exception 'FAIL: record_student_identity_invitation allowed expired MFA';
  end if;

  -- 2. FRESH MFA (amr timestamps within 600s) + RATE LIMITING + FAILED AUDIT
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text,
    'aud', 'authenticated',
    'role', 'authenticated',
    'aal', 'aal2',
    'session_id', v_session::text,
    'app_metadata', jsonb_build_object('provider', 'email'),
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'password', 'timestamp', v_now - 10),
      jsonb_build_object('method', 'totp', 'timestamp', v_now - 5)
    )
  )::text, true);
  set local role authenticated;

  v_res := public.inspect_student_identity_status(v_student, 'fresh.check@gmail.com');
  if (v_res->>'mfa_fresh')::boolean is not true then
    raise exception 'FAIL: Expected mfa_fresh=true for fresh AMR';
  end if;

  -- Failed invitation attempts must be audited accurately and NOT consume sent quota
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'failed') is not true then
    raise exception 'FAIL: failed invitation audit returned false';
  end if;
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'failed') is not true then
    raise exception 'FAIL: second failed invitation audit returned false';
  end if;

  -- 3 sent invitations succeed, 4th is rate-limited
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'sent') is not true then
    raise exception 'FAIL: 1st sent invitation failed';
  end if;
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'sent') is not true then
    raise exception 'FAIL: 2nd sent invitation failed';
  end if;
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'sent') is not true then
    raise exception 'FAIL: 3rd sent invitation failed';
  end if;
  if public.record_student_identity_invitation(v_student, 'fresh.check@gmail.com', 'sent') is not false then
    raise exception 'FAIL: 4th sent invitation was NOT rate-limited';
  end if;

  v_res := public.inspect_student_identity_status(v_student, 'fresh.check@gmail.com');
  if v_res->>'candidate_status' <> 'rate_limited' then
    raise exception 'FAIL: inspect_student_identity_status did not report rate_limited (got %)', v_res->>'candidate_status';
  end if;

  raise notice 'MIGRATION_051_SECURITY_VERIFIED_OK';
end;
$$;

rollback;
