'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, WalletCards } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Wallet = { user_id: string; balance: number; lifetime_earned: number; lifetime_spent: number; login_email: string | null; company_name: string | null };
type Overview = { total_users: number; total_balance: number; purchases_today: number; revenue_today_paise: number };
type WalletPage = { wallets: Wallet[]; total: number };

export function CoinWalletAdminPanel({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [data, setData] = useState<WalletPage>({ wallets: [], total: 0 });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [amount, setAmount] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const [summary, wallets] = await Promise.all([
          supabase.rpc('admin_coin_overview'),
          supabase.rpc('admin_wallet_directory', { p_search: search.trim(), p_page: page }),
        ]);
        if (summary.error || wallets.error) throw summary.error || wallets.error;
        if (active) { setOverview(summary.data as unknown as Overview); setData(wallets.data as unknown as WalletPage); setError(false); }
      } catch { if (active) setError(true); }
      finally { if (active) setBusy(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, refresh, refreshVersion]);
  const adjustCoins = async (wallet: Wallet) => {
    const delta = Number(amount[wallet.user_id]);
    if (!Number.isInteger(delta) || !delta) return toast.error('Enter a whole positive or negative coin amount.');
    setSaving(wallet.user_id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Session unavailable');
      const { error: updateError } = await supabase.rpc('admin_adjust_coins', { p_admin: user.id, p_user: wallet.user_id, p_amount: delta, p_note: 'Admin billing wallet adjustment' });
      if (updateError) throw updateError;
      toast.success('Coin balance updated.');
      setAmount(current => ({ ...current, [wallet.user_id]: '' }));
      setRefresh(value => value + 1);
    } catch { toast.error('Could not update coin balance. Please try again.'); }
    finally { setSaving(null); }
  };
  const stats = overview ? [['Wallets', overview.total_users], ['Coins outstanding', overview.total_balance], ['Top-ups today', overview.purchases_today], ['Top-up receipts today', new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overview.revenue_today_paise / 100)]] : [];
  return <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><WalletCards className="h-5 w-5 text-primary" />Coin wallets</h2><p className="mt-1 text-sm text-muted-foreground">Review prepaid coin balances and apply credit or debit adjustments.</p></div><Button variant="outline" disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([label,value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-4"><p className="text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div>
    <Input aria-label="Search coin wallets" placeholder="Search login email, user ID or company" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} />
    {error ? <p role="alert">Could not load coin wallets. Use Refresh to retry.</p> : busy ? <p role="status" className="py-8 text-center text-muted-foreground">Loading coin wallets…</p> : <>
      <p className="text-sm text-muted-foreground">{data.total} matching wallets</p>
      <div className="overflow-hidden rounded-xl border"><table className="block w-full text-left text-sm md:table"><thead className="hidden bg-muted/50 text-xs text-muted-foreground md:table-header-group"><tr><th className="p-4">Account</th><th className="p-4">Balance & usage</th><th className="p-4">Adjust coins</th></tr></thead><tbody className="block md:table-row-group">{data.wallets.map(wallet => <tr key={wallet.user_id} className="block border-t first:border-0 md:table-row"><td className="block space-y-2 p-4 md:table-cell"><p className="break-all font-semibold">{wallet.login_email || 'No login email'}</p><p className="text-muted-foreground">{wallet.company_name || 'Company not provided'}</p><p className="select-all break-all font-mono text-xs text-muted-foreground">{wallet.user_id}</p></td><td className="block space-y-1 p-4 md:table-cell"><p className="font-semibold tabular-nums">{wallet.balance} coins available</p><p className="text-xs text-muted-foreground">Received {wallet.lifetime_earned} · Used {wallet.lifetime_spent}</p></td><td className="block space-y-2 p-4 md:table-cell"><div className="flex flex-wrap gap-2"><Input aria-label={`Coin adjustment for ${wallet.login_email || wallet.user_id}`} type="number" step="1" placeholder="+20 or -10" value={amount[wallet.user_id] ?? ''} onChange={event => setAmount(current => ({ ...current, [wallet.user_id]: event.target.value }))} className="w-32" /><Button variant="outline" disabled={saving !== null} onClick={() => void adjustCoins(wallet)}>Apply adjustment</Button></div><p className="text-xs text-muted-foreground">Positive adds coins. Negative removes coins.</p></td></tr>)}{!data.wallets.length && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No wallets match your search.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Page {page + 1} of {Math.max(1,Math.ceil(data.total / 25))}</p><div className="flex gap-2"><Button variant="outline" disabled={!page} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1)*25 >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
    </>}
  </section>;
}
