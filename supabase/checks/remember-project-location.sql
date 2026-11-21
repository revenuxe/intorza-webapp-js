begin;
insert into auth.users(id,email,raw_user_meta_data)
values('441cbfc0-ff52-4358-aaca-e4e16a4d2111','remember-location@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','441cbfc0-ff52-4358-aaca-e4e16a4d2111',true);
do $$
declare q jsonb;
begin
  q := public.save_quotation(null,'{"quotation_number":"LOCATION-TEST","client_name":"Synthetic","project_name":"Synthetic","status":"draft","place_of_project":"   ","sections":[]}'::jsonb);
  if exists(select 1 from public.quotation_preferences where user_id=auth.uid() and nullif(btrim(default_place_of_project),'') is not null) then
    raise exception 'Blank location was remembered';
  end if;
  perform public.save_quotation((q->>'id')::uuid,'{"place_of_project":" Bengaluru "}'::jsonb);
  if (select default_place_of_project from public.quotation_preferences where user_id=auth.uid()) is distinct from 'Bengaluru' then
    raise exception 'First non-empty location was not remembered';
  end if;
  perform public.save_quotation((q->>'id')::uuid,'{"place_of_project":"Mumbai"}'::jsonb);
  perform public.save_quotation((q->>'id')::uuid,'{"place_of_project":""}'::jsonb);
  if (select default_place_of_project from public.quotation_preferences where user_id=auth.uid()) is distinct from 'Bengaluru' then
    raise exception 'Later edit replaced the first location';
  end if;
end $$;
reset role;
rollback;
select 'PASS: first non-empty location remembered; later edits and blanks preserve it' as result;
