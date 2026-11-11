// Routing hint only; database policies remain responsible for authorization.
export function isTeamAccount(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata;
  return metadata?.is_team_member === true || metadata?.is_team_member === 'true' || Boolean(metadata?.join_company_id);
}
