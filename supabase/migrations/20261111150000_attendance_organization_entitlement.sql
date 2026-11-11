begin;
-- Attendance belongs to the employer workspace. A member does not need a
-- personal Pro plan; use the owning organization's existing entitlement.
drop policy if exists "Pro team members can insert attendance" on public.attendance;
drop policy if exists "Pro team members can update attendance" on public.attendance;
drop policy if exists "Team members can insert attendance" on public.attendance;
drop policy if exists "Team members can update own attendance" on public.attendance;

create policy "Organization members can clock in" on public.attendance
for insert to authenticated with check (
  exists(select 1 from public.team_members tm
    where tm.id = attendance.team_member_id and tm.user_id = auth.uid()
      and public.is_pro_user(tm.company_id))
);

create policy "Organization members can clock out" on public.attendance
for update to authenticated using (
  exists(select 1 from public.team_members tm
    where tm.id = attendance.team_member_id and tm.user_id = auth.uid())
) with check (
  exists(select 1 from public.team_members tm
    where tm.id = attendance.team_member_id and tm.user_id = auth.uid()
      and public.is_pro_user(tm.company_id))
);
commit;
