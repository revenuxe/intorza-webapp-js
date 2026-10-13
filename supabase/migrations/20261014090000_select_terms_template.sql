begin;
create or replace function public.select_terms_template(p_id uuid)
returns public.terms_templates
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  selected public.terms_templates;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  -- Serialize competing selections for the same account.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into selected from public.terms_templates
    where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Terms template not found'; end if;
  if jsonb_typeof(selected.content) <> 'array' or jsonb_array_length(selected.content) = 0 then
    raise exception 'Add terms before selecting this template';
  end if;
  update public.terms_templates set is_default = false
    where user_id = auth.uid() and template_type = selected.template_type and id <> p_id and is_default;
  update public.terms_templates set is_default = true, is_enabled = true, updated_at = now()
    where id = p_id and user_id = auth.uid() returning * into selected;
  return selected;
end;
$$;
revoke all on function public.select_terms_template(uuid) from public, anon;
grant execute on function public.select_terms_template(uuid) to authenticated;
commit;
