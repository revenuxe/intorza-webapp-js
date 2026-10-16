'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Coins, CreditCard, History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Razorpay is loaded from its hosted checkout script; this declaration matches the existing app-wide integration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { Razorpay: any } }
const quickAmounts = [50, 100, 250, 500] as const;
let checkoutLoader: Promise<boolean> | null = null;
const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (checkoutLoader) return checkoutLoader;
  checkoutLoader = new Promise<boolean>(resolve => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    script.onload = () => resolve(true); script.onerror = () => { checkoutLoader = null; resolve(false); }; document.body.appendChild(script);
  });
  return checkoutLoader;
};
const notifyWalletChanged = () => window.dispatchEvent(new Event('intorza:wallet-changed'));
const pause = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));
async function verifyCoinPayment(accessToken: string, response: Record<string, string>) {
  let lastMessage = 'Payment is still being confirmed.';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await supabase.functions.invoke('razorpay-verify-coin-payment', { body: response, headers: { Authorization: `Bearer ${accessToken}` } });
    if (!result.error && result.data && !result.data.error) return result.data as { balance: number; coins: number };
    lastMessage = result.data?.error || result.error?.message || lastMessage;
    if (attempt < 3) await pause(1500 * (attempt + 1));
  }
  throw new Error(lastMessage);
}
type LedgerEntry = { id: string; tx_type: string; amount: number; created_at: string; note: string | null };

export function CoinWallet({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false), [balance, setBalance] = useState<number | null>(null), [coins, setCoins] = useState(100), [busy, setBusy] = useState(false), [activity, setActivity] = useState<LedgerEntry[]>([]);
  const refresh = async (withActivity = false) => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const [{ data: wallet }, ledger] = await Promise.all([
      supabase.from('coin_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      withActivity ? supabase.from('coin_ledger').select('id,tx_type,amount,created_at,note').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4) : Promise.resolve({ data: null }),
    ]);
    setBalance(wallet?.balance ?? 0); if (withActivity) setActivity((ledger.data ?? []) as LedgerEntry[]);
  };
  useEffect(() => {
    void refresh(); if (open) void loadCheckout(); const onWalletChanged = () => void refresh(open); const onOpenWallet = () => { setOpen(true); void refresh(true); }; window.addEventListener('intorza:wallet-changed', onWalletChanged); window.addEventListener('intorza:open-wallet', onOpenWallet);
    const channel = supabase.channel('coin-wallet').on('postgres_changes', { event: '*', schema: 'public', table: 'coin_wallets' }, () => notifyWalletChanged()).subscribe();
    return () => { window.removeEventListener('intorza:wallet-changed', onWalletChanged); window.removeEventListener('intorza:open-wallet', onOpenWallet); void supabase.removeChannel(channel); };
  }, [open]);
  const topUp = async () => {
    setBusy(true);
    let checkoutOpened = false;
    try {
      if (!Number.isInteger(coins) || coins < 10 || coins > 100000) throw new Error('Enter a whole number between 10 and 100,000 coins.');
      if (!await loadCheckout()) throw new Error('Could not load Razorpay. Check your connection and retry.');
      const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Please sign in again.');
      const { data, error } = await supabase.functions.invoke('razorpay-create-coin-order', { body: { coins }, headers: { Authorization: `Bearer ${session.access_token}` } });
      if (error || !data) throw new Error(error?.message || 'Could not start payment.');
      new window.Razorpay!({ key: data.keyId, name: 'Intorza', description: `${data.coins} AI coins`, amount: data.amount, currency: data.currency, order_id: data.orderId, prefill: data.prefill, theme: { color: '#cf573d' }, handler: async (response: Record<string, string>) => {
        try {
          const result = await verifyCoinPayment(session.access_token, response);
          setBalance(result.balance); notifyWalletChanged(); void refresh(true); toast.success(`${data.coins} coins added to your wallet.`);
        } catch (error) { toast.error(error instanceof Error ? `${error.message} Razorpay will retry the wallet credit automatically if payment succeeded.` : 'Payment verification needs a retry.'); }
        finally { setBusy(false); }
      }, modal: { ondismiss: () => setBusy(false) } }).open();
      checkoutOpened = true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not start payment.'); }
    finally { if (!checkoutOpened) setBusy(false); }
  };
  return <><Button type="button" variant="outline" size="sm" onClick={() => { setOpen(true); void refresh(true); }} className={cn("h-9 gap-1.5 rounded-full border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-950 hover:bg-amber-100", triggerClassName)}><Coins className="h-3.5 w-3.5 text-amber-600" /><span className="tabular-nums">{balance ?? '-'}</span><span className="hidden sm:inline">coins</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="w-[calc(100%-1.5rem)] max-w-sm gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md sm:p-0 [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/15 [&>button:last-child]:p-1.5 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:ring-1 [&>button:last-child]:ring-white/20 [&>button:last-child]:hover:bg-white/25"><div className="bg-gradient-to-br from-primary via-primary to-primary/85 px-5 pb-5 pt-6 text-primary-foreground"><DialogHeader className="text-left"><DialogTitle className="flex items-center gap-2 text-xl"><span className="rounded-xl bg-white/15 p-2"><Coins className="h-5 w-5 text-amber-200" /></span>Coin wallet</DialogTitle><DialogDescription className="text-primary-foreground/75">Prepaid AI credit. Your Pro subscription stays separate.</DialogDescription></DialogHeader><div className="mt-5 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-foreground/65">Available balance</p><p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{balance ?? '-'} <span className="text-base font-medium text-primary-foreground/75">coins</span></p></div><span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">Rs. 1 = 1 coin</span></div></div><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-muted/65 p-3"><p className="font-semibold text-foreground">15 coins</p><p className="mt-0.5 text-muted-foreground">Floor plan analysis</p></div><div className="rounded-xl bg-muted/65 p-3"><p className="font-semibold text-foreground">10 coins</p><p className="mt-0.5 text-muted-foreground">AI quotation builder</p></div></div><div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold" htmlFor="coin-topup">Add coins</label><span className="text-xs text-muted-foreground">Pay Rs. {Number.isFinite(coins) ? Math.max(0, coins).toLocaleString('en-IN') : 0}</span></div><div className="grid grid-cols-4 gap-2">{quickAmounts.map(amount => <Button key={amount} type="button" variant={coins === amount ? 'default' : 'outline'} size="sm" className="h-9 px-1 text-xs" onClick={() => setCoins(amount)}>{amount}</Button>)}</div><div className="relative mt-2"><Input id="coin-topup" type="number" min="10" max="100000" inputMode="numeric" value={coins} onChange={event => setCoins(Number(event.target.value))} className="h-11 pr-16" /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">coins</span></div></div><Button type="button" disabled={busy} onClick={() => void topUp()} className="h-11 w-full rounded-xl"><CreditCard className="mr-2 h-4 w-4" />{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing secure payment</> : <>Add {Number.isFinite(coins) ? Math.max(0, coins) : 0} coins <ArrowUpRight className="ml-2 h-4 w-4" /></>}</Button><div className="hidden rounded-xl border bg-muted/20 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><History className="h-3.5 w-3.5 text-primary" />Recent activity</div>{activity.length ? <div className="space-y-2">{activity.map(entry => <div key={entry.id} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-muted-foreground">{entry.note || entry.tx_type.replace(/_/g, ' ')}</span><span className={`shrink-0 font-semibold tabular-nums ${entry.amount > 0 ? 'text-emerald-600' : 'text-foreground'}`}>{entry.amount > 0 ? '+' : ''}{entry.amount}</span></div>)}</div> : <p className="text-xs text-muted-foreground">Your purchases and AI usage will appear here.</p>}</div><p className="flex items-start gap-2 text-[11px] leading-4 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Payments are processed securely by Razorpay. Coins are added after payment verification.</p></div></DialogContent></Dialog></>;
}
