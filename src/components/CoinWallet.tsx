'use client';

import { useEffect, useState } from 'react';
import { Coins, CreditCard, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

declare global { interface Window { Razorpay: any } }
const loadCheckout = () => new Promise<boolean>(resolve => { if (window.Razorpay) return resolve(true); const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.body.appendChild(script); });

export function CoinWallet() {
  const [open, setOpen] = useState(false), [balance, setBalance] = useState<number | null>(null), [coins, setCoins] = useState(100), [busy, setBusy] = useState(false);
  const refresh = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from('coin_wallets').select('balance').eq('user_id', user.id).maybeSingle(); setBalance(data?.balance ?? 0); };
  useEffect(() => { void refresh(); const channel = supabase.channel('coin-wallet').on('postgres_changes', { event: '*', schema: 'public', table: 'coin_wallets' }, () => void refresh()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, []);
  const topUp = async () => {
    setBusy(true);
    try {
      if (!Number.isInteger(coins) || coins < 10) throw new Error('Enter at least 10 coins.');
      if (!await loadCheckout()) throw new Error('Could not load Razorpay.');
      const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Please sign in again.');
      const { data, error } = await supabase.functions.invoke('razorpay-create-coin-order', { body: { coins }, headers: { Authorization: `Bearer ${session.access_token}` } });
      if (error || !data) throw new Error(error?.message || 'Could not start payment.');
      new window.Razorpay!({ key: data.keyId, name: 'Intorza', description: `${data.coins} AI coins`, amount: data.amount, currency: data.currency, order_id: data.orderId, prefill: data.prefill, theme: { color: '#cf573d' }, handler: async (response: Record<string, string>) => {
        const result = await supabase.functions.invoke('razorpay-verify-coin-payment', { body: response, headers: { Authorization: `Bearer ${session.access_token}` } });
        if (result.error || result.data?.error) { toast.error(result.data?.error || 'Payment was captured but wallet verification needs a retry.'); return; }
        setBalance(result.data.balance); toast.success(`${data.coins} coins added to your wallet.`); setOpen(false);
      }, modal: { ondismiss: () => setBusy(false) } }).open();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not start payment.'); }
    finally { setBusy(false); }
  };
  return <><Button type="button" variant="outline" size="sm" onClick={() => { setOpen(true); void refresh(); }} className="h-9 gap-1.5 rounded-full px-2.5 text-xs"><Coins className="h-3.5 w-3.5 text-amber-600" /><span className="tabular-nums">{balance ?? '—'}</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-amber-600" />AI coin wallet</DialogTitle><DialogDescription>Coins are prepaid and separate from your Pro subscription. ₹1 = 1 coin.</DialogDescription></DialogHeader><div className="rounded-2xl bg-primary p-5 text-primary-foreground"><p className="text-sm opacity-80">Available balance</p><p className="mt-1 text-4xl font-semibold tabular-nums">{balance ?? '—'} <span className="text-base font-medium">coins</span></p><p className="mt-3 text-xs opacity-80">Floor Plan Analysis: 15 coins · AI Quotation Builder: 10 coins</p></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="coin-topup">How many coins?</label><Input id="coin-topup" type="number" min="10" max="100000" value={coins} onChange={event => setCoins(Number(event.target.value))} /><p className="text-xs text-muted-foreground">You will pay ₹{Number.isFinite(coins) ? Math.max(0, coins) : 0} through Razorpay.</p></div><Button type="button" disabled={busy} onClick={() => void topUp()} className="w-full"><CreditCard className="mr-2 h-4 w-4" />{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing payment</> : <><Plus className="mr-1 h-4 w-4" />Top up coins</>}</Button></DialogContent></Dialog></>;
}
