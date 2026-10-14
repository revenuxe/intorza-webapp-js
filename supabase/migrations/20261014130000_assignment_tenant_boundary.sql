begin;
-- Both foreign-key targets must belong to the requesting company. Restrictive
-- checks also protect against another permissive policy being added later.
create policy "Assignment insert tenant boundary" on public.team_project_assignments
as restrictive for insert to authenticated with check (
  exists(select 1 from public.team_members tm where tm.id=team_member_id and tm.company_id=auth.uid())
  and (quotation_id is null or exists(select 1 from public.quotations q where q.id=quotation_id and q.user_id=auth.uid()))
);
create policy "Assignment update tenant boundary" on public.team_project_assignments
as restrictive for update to authenticated
using (exists(select 1 from public.team_members tm where tm.id=team_member_id and tm.company_id=auth.uid()))
with check (
  exists(select 1 from public.team_members tm where tm.id=team_member_id and tm.company_id=auth.uid())
  and (quotation_id is null or exists(select 1 from public.quotations q where q.id=quotation_id and q.user_id=auth.uid()))
);
commit;
