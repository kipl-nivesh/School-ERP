begin;

create function public.list_accountant_fee_classes(p_school uuid)
returns table (id uuid, school_id uuid, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_school is null or p_school is distinct from public.current_school_id()
    or auth.uid() is null
    or public.current_active_role() is distinct from 'accountant'
    or public.current_role_has_permission('fees.read') is not true then
    raise exception 'Fee class directory not authorized' using errcode = '42501';
  end if;

  return query
    select c.id, c.school_id, c.name
    from public.classes c
    where c.school_id = p_school
    order by c.name, c.id
    limit 100;
end;
$$;

alter function public.list_accountant_fee_classes(uuid) owner to postgres;
revoke all on function public.list_accountant_fee_classes(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_accountant_fee_classes(uuid) to authenticated;

commit;
