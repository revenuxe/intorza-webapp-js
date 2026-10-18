-- Run inside a transaction; roll back all synthetic accounts.
insert into auth.users(id,email,raw_user_meta_data) values
('a1810000-0000-4000-8000-000000000001','directory-admin@example.invalid','{}'),
('a1810000-0000-4000-8000-000000000002','directory-login@example.invalid','{}');
insert into public.user_roles(user_id,role) values('a1810000-0000-4000-8000-000000000001','admin');
update public.profiles set email='directory-pdf@example.invalid',is_pro=true,pro_expiry=now()-interval '1 day' where id='a1810000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1810000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.admin_user_directory();
    raise exception 'Non-admin directory access allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a1810000-0000-4000-8000-000000000001',true);
do $$ declare data jsonb; account jsonb; begin
  data:=public.admin_user_directory('directory-login@example.invalid');
  if (data->>'total')::integer <> 1 then raise exception 'Login search failed'; end if;
  account:=data->'users'->0;
  if account->>'login_email' <> 'directory-login@example.invalid' or account->>'quotation_email' <> 'directory-pdf@example.invalid' then raise exception 'Login and PDF email conflated'; end if;
  if (account->>'pro_active')::boolean then raise exception 'Expired account shown active'; end if;
  if (public.admin_user_directory('directory-pdf@example.invalid')->>'total')::integer <> 1 then raise exception 'PDF email search failed'; end if;
  if (public.admin_user_directory('a1810000-0000-4000-8000-000000000002','inactive')->>'total')::integer <> 1 then raise exception 'User ID or inactive search failed'; end if;
  if (public.admin_user_directory('directory-login@example.invalid','active')->>'total')::integer <> 0 then raise exception 'Active filter includes expired'; end if;
  if jsonb_array_length(public.admin_user_directory('directory-login@example.invalid','all',1)->'users') <> 0 then raise exception 'Pagination failed'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.admin_user_directory(text,text,integer,text)','execute') then raise exception 'Anonymous directory access allowed'; end if;
end $$;
select 'PASS: admin-only directory, distinct login/PDF emails, search, expired Pro and pagination' as result;
