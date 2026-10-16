'use client';

import { useEffect, useState } from 'react';
import { Check, Coins, Gift, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function WelcomeCoinsDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false), [claimed, setClaimed] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) return;
      const { data } = await supabase.from('coin_wallets').select('welcome_claimed_at').eq('user_id', user.id).maybeSingle();
      if (active && data && !data.welcome_claimed_at) setOpen(true);
    };
    void check(); return () => { active = false; };
  }, [user]);
  const claim = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('claim_welcome_coins');
    setBusy(false);
    if (error) { toast.error('Could not claim your welcome coins. Please try again.'); return; }
    setClaimed(true); window.dispatchEvent(new Event('intorza:wallet-changed'));
    toast.success(`${data ?? 60} coins are ready in your wallet.`);
    window.setTimeout(() => setOpen(false), 1800);
  };
  return <Dialog open={open} onOpenChange={next => { if (!busy && !claimed) setOpen(next); }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-[21rem] overflow-hidden rounded-[1.75rem] border-0 p-0 shadow-2xl sm:max-w-sm">
      <DialogTitle className="sr-only">Claim your 60 welcome coins</DialogTitle><DialogDescription className="sr-only">A one-time welcome reward for new Intorza accounts.</DialogDescription>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#d96848] via-[#be503e] to-[#24385f] px-5 pb-7 pt-8 text-center text-white">
        <div className="absolute -left-5 top-4 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" /><div className="absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl" />
        {claimed && <div className="pointer-events-none absolute inset-0"><Sparkles className="absolute left-8 top-8 h-5 w-5 animate-bounce text-amber-200" /><Sparkles className="absolute right-8 top-14 h-4 w-4 animate-pulse text-amber-100" /><Sparkles className="absolute bottom-8 left-16 h-4 w-4 animate-pulse text-amber-100" /></div>}
        <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 ${claimed ? 'animate-[pulse_0.7s_ease-in-out_2]' : ''}`}>{claimed ? <Check className="h-8 w-8 text-emerald-200" /> : <Gift className="h-8 w-8 text-amber-100" />}</div>
        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Welcome to Intorza</p><h2 className="relative mt-2 text-2xl font-semibold tracking-tight">{claimed ? 'Coins claimed!' : 'Your AI wallet is ready'}</h2><p className="relative mt-2 text-sm leading-5 text-white/75">{claimed ? 'Let’s create your first smart quotation.' : 'A welcome gift to help you start creating.'}</p>
      </div>
      <div className="p-5 text-center"><div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-amber-50 px-5 py-3 text-amber-950"><Coins className="h-5 w-5 text-amber-600" /><span className="text-2xl font-bold tabular-nums">60</span><span className="text-sm font-semibold">coins</span></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Use coins for AI quotation building and floor-plan analysis. ₹1 equals 1 coin when you top up later.</p><Button type="button" className="mt-5 h-11 w-full rounded-xl" disabled={busy || claimed} onClick={() => void claim()}>{claimed ? 'Ready to create' : busy ? 'Claiming your coins…' : 'Claim 60 coins'}</Button></div>
    </DialogContent>
  </Dialog>;
}
