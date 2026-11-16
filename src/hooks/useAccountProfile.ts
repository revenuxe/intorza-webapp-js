import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { accountProfileOptions } from '@/lib/accountQueries';

export function useAccountProfile() {
  const { user, loading } = useAuth();
  const query = useQuery({ ...accountProfileOptions(user?.id || ''), enabled: !loading && Boolean(user?.id) });
  return { ...query, data: user ? query.data : undefined, loading: loading || (Boolean(user) && query.isPending) };
}
