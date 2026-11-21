-- Capture the first saved, non-empty project location in the same transaction
-- as the quotation. Keep an established account default unchanged.
create or replace function public.remember_first_project_location()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if nullif(btrim(new.place_of_project), '') is not null then
    insert into public.quotation_preferences (user_id, default_place_of_project)
    values (new.user_id, btrim(new.place_of_project))
    on conflict (user_id) do update
      set default_place_of_project = excluded.default_place_of_project
      where nullif(btrim(quotation_preferences.default_place_of_project), '') is null;
  end if;
  return new;
end;
$$;

create trigger remember_first_project_location
after insert or update of place_of_project on public.quotations
for each row execute function public.remember_first_project_location();

-- Existing accounts learn from their earliest saved location.
insert into public.quotation_preferences (user_id, default_place_of_project)
select distinct on (user_id) user_id, btrim(place_of_project)
from public.quotations
where nullif(btrim(place_of_project), '') is not null
order by user_id, created_at, id
on conflict (user_id) do update
  set default_place_of_project = excluded.default_place_of_project
  where nullif(btrim(quotation_preferences.default_place_of_project), '') is null;
