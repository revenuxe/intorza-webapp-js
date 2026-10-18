'use client';

import { useEffect, useState } from 'react';
import { Coins, Crown, RefreshCw, WalletCards } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Wallet = { user_id: string; balance: number; lifetime_earned: number; lifetime_spent: number; updated_at: string; email: string; is_pro: boolean; pro_expiry: string | null };
type Overview = { total_users: number; total_balance: number; total_earned: number; total_spent: number; purchases_today: number; revenue_today_paise: number; operations_today: { floor_plan: number; ai_builder: number } };

export function CoinWalletAdminPanel() {
  const [wallets, setWallets] = useState<Wallet[]>([]), [overview, setOverview] = useState<Overview | null>(null), [amount, setAmount] = useState<Record<string, string>>({}), [days, setDays] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [saving, setSaving] = useState<string | null>(null);
  const load = async () => {
    setBusy(true);
    try {
      const [{ data: summary, error: summaryError }, { data: walletRows, error: walletError }, { data: profileRows, error: profileError }] = await Promise.all([
        supabase.rpc('admin_coin_overview'),
        supabase.from('coin_wallets').select('user_id,balance,lifetime_earned,lifetime_spent,updated_at').order('updated_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id,email,is_pro,pro_expiry').limit(1000),
      ]);
      if (summaryError || walletError || profileError) throw summaryError || walletError || profileError;
      const profiles = new Map((profileRows ?? []).map(profile => [profile.id, profile]));
      setOverview(summary as Overview);
      setWallets((walletRows ?? []).map(wallet => ({ ...wallet, email: profiles.get(wallet.user_id)?.email || wallet.user_id, is_pro: !!profiles.get(wallet.user_id)?.is_pro && (!profiles.get(wallet.user_id)?.pro_expiry || new Date(profiles.get(wallet.user_id)!.pro_expiry!).getTime() > Date.now()), pro_expiry: profiles.get(wallet.user_id)?.pro_expiry || null })));
    } catch { toast.error('Could not load wallet and Pro access data.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const adjustCoins = async (wallet: Wallet) => {
    const delta = Number(amount[wallet.user_id]); if (!Number.isInteger(delta) || !delta) return toast.error('Enter a whole positive or negative coin amount.');
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    setSaving(wallet.user_id);
    const { error } = await supabase.rpc('admin_adjust_coins', { p_admin: user.id, p_user: wallet.user_id, p_amount: delta, p_note: 'Admin wallet adjustment' });
    setSaving(null); if (error) return toast.error(error.message); toast.success('Wallet updated.'); setAmount(current => ({ ...current, [wallet.user_id]: '' })); void load();
  };
  const setPro = async (wallet: Wallet, revoke = false) => {
    const duration = revoke ? 0 : Number(days[wallet.user_id] || 30); if (!revoke && (!Number.isInteger(duration) || duration < 1 || duration > 3650)) return toast.error('Enter Pro access from 1 to 3650 days.');
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    setSaving(wallet.user_id);
    const { error } = await supabase.rpc('admin_set_pro_access', { p_admin: user.id, p_user: wallet.user_id, p_days: duration, p_note: revoke ? 'Admin revoked Pro access' : `Admin granted ${duration} days of Pro access` });
    setSaving(null); if (error) return toast.error(error.message); toast.success(revoke ? 'Pro access disabled.' : 'Pro access activated.'); void load();
  };
  const stats = overview ? [['Wallets', overview.total_users], ['Coins outstanding', overview.total_balance], ['Top-ups today', overview.purchases_today], ['AI builds today', overview.operations_today.ai_builder]] : [];
  return <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><WalletCards className="h-5 w-5 text-primary" />AI access & wallet</h2><p className="mt-1 text-sm text-muted-foreground">Pro is required for AI. Coins pay for each request after access is active.</p></div><Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-semibold tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}</div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3 text-right">Coins</th><th className="p-3">Coin adjustment</th><th className="p-3">Pro access</th></tr></thead><tbody>{wallets.map(wallet => <tr key={wallet.user_id} className="border-t align-top"><td className="p-3 text-xs"><p className="font-medium text-foreground">{wallet.email}</p><p className="mt-1 text-muted-foreground">Earned {wallet.lifetime_earned} · Spent {wallet.lifetime_spent}</p></td><td className="p-3 text-right font-semibold tabular-nums"><span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-600" />{wallet.balance}</span></td><td className="p-3"><div className="flex gap-2"><Input aria-label={`Coin adjustment for ${wallet.email}`} type="number" step="1" placeholder="+20 or -10" value={amount[wallet.user_id] ?? ''} onChange={event => setAmount(current => ({ ...current, [wallet.user_id]: event.target.value }))} className="h-8 w-28 text-xs" /><Button size="sm" variant="outline" disabled={saving === wallet.user_id} onClick={() => void adjustCoins(wallet)}>Apply</Button></div></td><td className="p-3"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${wallet.is_pro ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}><Crown className="h-3 w-3" />{wallet.is_pro ? 'Active' : 'Inactive'}</span>{wallet.pro_expiry && <span className="text-[11px] text-muted-foreground">until {new Date(wallet.pro_expiry).toLocaleDateString('en-IN')}</span>}</div><div className="mt-2 flex gap-2"><Input aria-label={`Pro duration for ${wallet.email}`} type="number" min="1" max="3650" placeholder="30 days" value={days[wallet.user_id] ?? ''} onChange={event => setDays(current => ({ ...current, [wallet.user_id]: event.target.value }))} className="h-8 w-24 text-xs" /><Button size="sm" disabled={saving === wallet.user_id} onClick={() => void setPro(wallet)}>Enable</Button>{wallet.is_pro && <Button size="sm" variant="outline" disabled={saving === wallet.user_id} onClick={() => void setPro(wallet, true)}>Disable</Button>}</div></td></tr>)}{!wallets.length && <tr><td className="p-8 text-center text-muted-foreground" colSpan={4}>No wallet records yet.</td></tr>}</tbody></table></div></section>;
}
