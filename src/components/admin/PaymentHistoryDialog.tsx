'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Payment = { id: string; created_at: string; amount: number; currency: string; status: string; event_type: string; provider_event_id: string; payment_id?: string | null; order_id?: string | null };
type History = { payments: Payment[]; total: number };
export function PaymentHistoryDialog({ account, onClose }: { account: { id: string; login_email: string | null } | null; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState<History>({ payments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(0); }, [account?.id]);
  useEffect(() => {
    if (!account) return;
    let active = true;
    setLoading(true); setError(false);
    void (async () => {
      try {
        const result = await supabase.rpc('admin_payment_history', { p_user: account.id, p_page: page });
        if (result.error) throw result.error;
        if (active) setHistory(result.data as unknown as History);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [account?.id, page, retry]);
  return <Dialog open={!!account} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
    <DialogHeader className="pr-6 text-left"><DialogTitle>Payment history</DialogTitle><DialogDescription className="break-all">{account?.login_email || account?.id}</DialogDescription></DialogHeader>
    <p className="text-xs text-muted-foreground">Newest first. Includes captured payments, failed attempts and refund events. Manual Pro grants are not payments.</p>
    {loading ? <p role="status" className="py-8 text-center">Loading payment history…</p> : error ? <div role="alert">Could not load payment history. <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button></div> : <>
      <p className="text-sm text-muted-foreground">{history.total} records</p>
      <div className="space-y-3">{history.payments.map(payment => <article key={payment.id} className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-lg font-semibold tabular-nums">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount / 100)}</p><Badge variant={payment.status === 'captured' ? 'default' : 'secondary'}>{payment.status.replaceAll('_', ' ')}</Badge></div>
        <p className="text-sm capitalize">{payment.event_type.replaceAll('_', ' ').replaceAll('.', ' · ')}</p><p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        <dl className="space-y-2 text-xs">{[['Payment ID', payment.payment_id], ['Order ID', payment.order_id], ['Provider reference', payment.provider_event_id]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="select-all break-all font-mono">{value}</dd></div>)}</dl>
      </article>)}{!history.payments.length && <p className="py-8 text-center text-muted-foreground">No payments recorded for this account.</p>}</div>
      <div className="flex items-center justify-between gap-2 border-t pt-3"><span className="text-xs text-muted-foreground">Page {page + 1} of {Math.max(1, Math.ceil(history.total / 20))}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 20 >= history.total} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
    </>}
  </DialogContent></Dialog>;
}
