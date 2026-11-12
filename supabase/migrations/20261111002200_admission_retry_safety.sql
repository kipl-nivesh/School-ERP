begin;
create table app_private.admission_requests (
  school_id uuid not null references public.schools(id),
  request_id uuid not null, actor_id uuid not null references public.profiles(id),
  payload_hash text not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(school_id,request_id)
);
revoke all on app_private.admission_requests from public,anon,authenticated,service_role;
alter table app_private.admission_requests enable row level security;
alter table app_private.admission_requests force row level security;

create function public.admit_student_idempotent(p_request_id uuid,p_input jsonb,p_school_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  fingerprint text;
  prior app_private.admission_requests;
  saved jsonb;
begin
  if school is null or auth.uid() is null or public.current_active_role() is distinct from 'admin'
    or public.current_role_has_permission('admissions.write') is not true
    or (p_school_id is not null and p_school_id is distinct from school) then
    raise exception 'Admission not authorized' using errcode='42501';
  end if;
  if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' then
    raise exception 'Invalid admission request' using errcode='22023';
  end if;
  fingerprint := encode(sha256(convert_to(p_input::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(school::text||':'||p_request_id::text,0));
  select * into prior from app_private.admission_requests where school_id=school and request_id=p_request_id;
  if found then
    if prior.actor_id is distinct from auth.uid() or prior.payload_hash is distinct from fingerprint then
      raise exception 'Admission request conflict' using errcode='23505';
    end if;
    return prior.result;
  end if;
  saved := public.admit_student_atomic(p_input,school);
  insert into app_private.admission_requests(school_id,request_id,actor_id,payload_hash,result)
    values(school,p_request_id,auth.uid(),fingerprint,saved);
  return saved;
end;
$$;
revoke all on function public.admit_student_atomic(jsonb,uuid) from public,anon,authenticated,service_role;
revoke all on function public.admit_student_idempotent(uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.admit_student_idempotent(uuid,jsonb,uuid) to authenticated;
commit;
