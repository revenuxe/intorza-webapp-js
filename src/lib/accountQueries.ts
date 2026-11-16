import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const accountKeys = {
  all: (ownerId: string) => ['account',ownerId] as const,
  profile: (ownerId: string) => ['account',ownerId,'profile'] as const,
  quotations: (ownerId: string) => ['account',ownerId,'quotations'] as const,
};
export const accountProfileOptions = (ownerId: string) => queryOptions({
  queryKey: accountKeys.profile(ownerId),
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id',ownerId).abortSignal(signal).single();
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});
export function notifyAccountChanged(ownerId: string, resource: 'profile' | 'quotations', jobsQueued = false) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('intorza:account-data-changed',{detail:{ownerId,resource,jobsQueued}}));
}
