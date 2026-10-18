'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Payment = { id: string; created_at: string; amount: number; currency: string; status: string; event_type: string; provider_event_id: string };
type Account = {
  id: string; login_email: string | null; quotation_email: string | null; full_name: string | null;
  company_name: string | null; phone: string | null; created_at: string | null; last_sign_in_at: string | null;
  pro_active: boolean; pro_plan: string | null; pro_expiry: string | null; payment_status: string | null;
  quotation_count: number; invoice_count: number; payments: Payment[];
};
type Directory = { users: Account[]; total: number };
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';

export function AdminUserDirectory({ billing = false }: { billing?: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Directory>({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, string>>({});
  const request = useRef(0);
  const updatePro = async (account: Account, revoke = false) => {
    const duration = revoke ? 0 : Number(days[account.id] || 30);
    if (!revoke && (!Number.isInteger(duration) || duration < 1 || duration > 3650)) { setError('Choose a Pro duration between 1 and 3650 days.'); return; }
    setSaving(account.id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Session unavailable');
      const { error: updateError } = await supabase.rpc('admin_set_pro_access', { p_admin: user.id, p_user: account.id, p_days: duration, p_note: revoke ? 'Admin revoked Pro from user directory' : `Admin granted ${duration} days from user directory` });
      if (updateError) throw updateError;
      setRefresh(value => value + 1);
    } catch { setError('Could not update Pro access. Please refresh and try again.'); }
    finally { setSaving(null); }
  };
  useEffect(() => {
    const current = ++request.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await supabase.rpc('admin_user_directory', { p_search: search.trim(), p_status: status, p_page: page });
        if (result.error) throw result.error;
        if (current === request.current) { setData(result.data as unknown as Directory); setError(''); }
      } catch {
        if (current === request.current) setError('Could not load account details. Please refresh to retry.');
      } finally { if (current === request.current) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); request.current++; };
  }, [search, status, page, refresh]);

  return <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{billing ? 'Pro access & payment history' : 'User directory'}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{billing ? 'Check current access alongside recorded payments. Admin grants and payment status are shown separately.' : 'Find accounts by login email, quotation contact email, user ID, company, name or phone.'}</p></div>
      <Button variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search user accounts" placeholder="Search email, user ID, company or phone" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></div>
      <select aria-label="Filter Pro access" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="all">All accounts</option><option value="active">Active Pro</option><option value="inactive">Free / expired</option></select>
    </div>
    {error ? <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</div> : loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading accounts…</p> : <>
      <p className="text-sm text-muted-foreground">{data.total} matching accounts · Page {page + 1} of {Math.max(1, Math.ceil(data.total / 25))}</p>
      <div className="overflow-x-auto rounded-xl border"><table className="block w-full text-left text-sm md:table md:min-w-[960px]">
        <thead className="hidden bg-muted/50 text-xs text-muted-foreground md:table-header-group"><tr><th className="p-4">Login identity</th><th className="p-4">Quotation contact</th><th className="p-4">Pro access</th><th className="p-4">{billing ? 'Recent payments' : 'Activity'}</th></tr></thead>
        <tbody className="block md:table-row-group">{data.users.map(account => <tr key={account.id} className="block border-t align-top first:border-t-0 md:table-row">
          <td className="block space-y-2 p-4 md:table-cell md:w-[30%]"><p className="text-xs text-muted-foreground md:hidden">Login identity</p><p className="break-all font-semibold">{account.login_email || 'No login email'}</p><p>{account.full_name || 'Name not provided'}</p><div><p className="text-xs text-muted-foreground">User ID</p><p className="select-all break-all font-mono text-xs">{account.id}</p></div><p className="text-xs text-muted-foreground">Joined {date(account.created_at)}</p></td>
          <td className="block space-y-2 p-4 md:table-cell md:w-[25%]"><p className="text-xs text-muted-foreground md:hidden">Quotation contact</p><p className="font-medium">{account.company_name || 'Company not provided'}</p><p className="break-all">{account.quotation_email || 'No quotation email set'}</p><p className="text-xs text-muted-foreground">Current company email used on quotation PDFs</p><p>{account.phone || 'Phone not provided'}</p></td>
          <td className="block space-y-2 p-4 md:table-cell md:w-[20%]"><Badge variant={account.pro_active ? 'default' : 'secondary'}>{account.pro_active ? 'Pro active' : 'Free / expired'}</Badge><p className="capitalize">Plan: {account.pro_plan || 'None'}</p><p className="text-xs">Expires: {account.pro_expiry ? date(account.pro_expiry) : 'No expiry recorded'}</p><p className="text-xs text-muted-foreground">Payment status: {account.payment_status?.replaceAll('_', ' ') || 'Not recorded'}</p>
            <details><summary className="cursor-pointer text-xs font-medium">Manage Pro access</summary><div className="mt-3 space-y-2"><label className="block text-xs">Days from today<Input aria-label={`Pro days for ${account.login_email || account.id}`} type="number" min="1" max="3650" value={days[account.id] ?? '30'} onChange={event => setDays(current => ({ ...current, [account.id]: event.target.value }))} /></label><Button size="sm" disabled={saving !== null} onClick={() => void updatePro(account)}>Grant Pro</Button>{account.pro_active && <Button className="ml-2" size="sm" variant="outline" disabled={saving !== null} onClick={() => void updatePro(account, true)}>Revoke</Button>}<p className="text-xs text-muted-foreground">Admin grants do not create a payment receipt.</p></div></details>
          </td>
          <td className="w-[25%] space-y-2 p-4">{billing ? account.payments.length ? <details><summary className="cursor-pointer font-medium">{account.payments.length} recent records · View details</summary><div className="mt-3 space-y-3">{account.payments.map(payment => <div key={payment.id} className="space-y-1 border-b pb-3 text-xs"><p className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount / 100)} · {payment.status}</p><p>{payment.event_type}</p><p>{date(payment.created_at)}</p><p className="select-all break-all font-mono">{payment.provider_event_id}</p></div>)}</div></details> : <p className="text-muted-foreground">No payment records</p> : <><p>{account.quotation_count} quotations</p><p>{account.invoice_count} invoices</p><p className="text-xs text-muted-foreground">Last sign-in: {date(account.last_sign_in_at)}</p></>}</td>
        </tr>)}{!data.users.length && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No accounts match your search.</td></tr>}</tbody>
      </table></div>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </>}
  </section>;
}
