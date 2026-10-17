"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Crown, LockKeyhole, Users, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { quotationsApi, invoicesApi, clientsApi } from "@/lib/api";

import { groupClientRecords, type ClientGroup } from "@/lib/client-records";
import { useNavigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Clients = () => {
  const { toast } = useToast();
  const { formatCurrency } = useLocalization();
  const { isPro, loading: subscriptionLoading, setPaywallOpen } = useSubscription();
  const [clients, setClients] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ClientGroup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const openClient = (client: ClientGroup) => { setSelected(client); setConfirmDelete(false); setConfirmation(''); setDeleteError(''); };
  const deleteClient = async () => {
    if (!selected || confirmation !== 'DELETE' || deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      await clientsApi.deleteWithRecords(selected.id, selected.name, selected.quotations.map(row => row.id), selected.invoices.map(row => row.id));
      setClients(current => current.filter(row => row.key !== selected.key));
      setSelected(null); toast({ title: 'Client deleted', description: 'The selected client, quotations, invoices and invoice payments were removed.' });
      await loadClients();
    } catch (error) { setDeleteError(error instanceof Error ? error.message : 'Could not delete this client. Please retry.'); }
    finally { setDeleting(false); }
  };

  useEffect(() => {
    if (!subscriptionLoading && isPro) loadClients();
  }, [subscriptionLoading, isPro]);

  const loadClients = async () => {
    try {
      setLoading(true);

      const [{ data: quotations }, { data: invoices }, { data: profiles }] = await Promise.all([
        quotationsApi.list(), invoicesApi.list(), clientsApi.list(),
      ]);
      setClients(groupClientRecords(profiles ?? [], quotations ?? [], invoices ?? []));
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error loading clients",
        description: "Failed to load client data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  if (subscriptionLoading) {
    return <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8"><div className="py-12 text-center text-muted-foreground">Loading access…</div></div>;
  }

  if (!isPro) {
    return <div className="container max-w-xl mx-auto p-4 md:p-6 lg:p-8">
      <Card className="overflow-hidden border-amber-200/80 shadow-sm">
        <CardContent className="flex flex-col items-center px-5 py-10 text-center sm:px-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><LockKeyhole className="h-5 w-5" /></div>
          <h1 className="text-xl font-semibold text-foreground">Clients is a Pro feature</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Upgrade to view client history, project totals, and outstanding balances in one place.</p>
          <button type="button" onClick={() => setPaywallOpen(true, 'Clients')} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><Crown className="h-4 w-4" />Unlock Pro</button>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-muted-foreground">Clients will appear here when you create quotations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {clients.map(client => (
              <button type="button" key={client.key} onClick={() => openClient(client)} aria-label={`View client ${client.name}`} className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"><Card className="cursor-pointer transition-colors hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{client.name}</h3>
                          <p className="text-xs text-muted-foreground">{client.quotations.length} quotations / {client.invoices.length} invoices</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Billed</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(client.totalAmount, true)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-bold text-green-600 tabular-nums">
                          {formatCurrency(client.paidAmount, true)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {formatCurrency(client.outstanding, true)}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">View details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></p>
                    </div>
                  </div>
                </CardContent>
              </Card></button>
            ))}
          </div>
        )}
        <Dialog open={!!selected} onOpenChange={open => { if (!open && !deleting) setSelected(null); }}>
          <DialogContent className="flex max-h-[85dvh] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:p-0" onEscapeKeyDown={event => { if (deleting) event.preventDefault(); }} onInteractOutside={event => { if (deleting) event.preventDefault(); }}>
            <DialogHeader className="shrink-0 border-b p-4 pr-10 text-left">
              <DialogTitle className="break-words">{selected?.name || 'Client details'}</DialogTitle>
              <DialogDescription>{selected?.quotations.length ?? 0} quotations / {selected?.invoices.length ?? 0} invoices</DialogDescription>
            </DialogHeader>
            {selected && <div className="min-h-0 space-y-4 overflow-y-auto p-4">
              {selected.profile && <div className="space-y-1 text-sm text-muted-foreground">{[selected.profile.email, selected.profile.phone, selected.profile.address].filter(Boolean).map((value, index) => <p key={index} className="break-words">{value}</p>)}</div>}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-xs">
                {[['Billed', selected.totalAmount], ['Paid', selected.paidAmount], ['Balance', selected.outstanding]].map(([label, amount]) => <div key={String(label)} className="min-w-0"><p className="text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(Number(amount), true)}</p></div>)}
              </div>
              <section className="space-y-2"><h3 className="text-sm font-semibold">Quotations</h3>
                {!selected.quotations.length && <p className="text-xs text-muted-foreground">No quotations for this client.</p>}
                {selected.quotations.map(row => <button key={row.id} type="button" disabled={deleting} onClick={() => navigate('/quotations/' + row.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-muted/50"><span className="min-w-0"><span className="block truncate text-sm font-medium">{row.project_name || row.quotation_title || row.quotation_number}</span><span className="text-xs text-muted-foreground">{row.quotation_number} / {row.status || 'draft'}</span></span><ArrowRight className="h-4 w-4 shrink-0" /></button>)}
              </section>
              <section className="space-y-2"><h3 className="text-sm font-semibold">Invoices &amp; payments</h3>
                {!selected.invoices.length && <p className="text-xs text-muted-foreground">No invoices for this client.</p>}
                {selected.invoices.map(row => <button key={row.id} type="button" disabled={deleting} onClick={() => navigate('/invoices/' + row.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-muted/50"><span className="min-w-0"><span className="block truncate text-sm font-medium">{row.invoice_number}</span><span className="block text-xs text-muted-foreground">{row.project_name} / {row.status || 'unpaid'}</span><span className="mt-1 block text-xs">Balance {formatCurrency(Number(row.remaining_amount || 0), true)} / Open to view payment history</span></span><ArrowRight className="h-4 w-4 shrink-0" /></button>)}
              </section>
              {confirmDelete && <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-semibold">Delete this client and their records?</p>
                <p className="text-xs leading-5 text-muted-foreground">This permanently deletes the client profile (if saved), all {selected.quotations.length} listed quotations and their items, and all {selected.invoices.length} listed invoices and their payment history. This cannot be undone.</p>
                <Label htmlFor="confirm-client-delete" className="text-xs">Type DELETE to confirm</Label>
                <Input id="confirm-client-delete" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={deleting} className="h-10" />
                {deleteError && <p role="alert" className="text-xs text-destructive">{deleteError}</p>}
                <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</Button><Button type="button" size="sm" variant="destructive" disabled={deleting || confirmation !== 'DELETE' || selected.key.startsWith('unresolved:')} onClick={() => void deleteClient()}>{deleting ? 'Deleting...' : 'Delete client & records'}</Button></div>
              </div>}
            </div>}
            <div className="flex shrink-0 justify-between gap-2 border-t p-3">
              <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={deleting || confirmDelete || selected?.key.startsWith('unresolved:')} onClick={() => setConfirmDelete(true)}><Trash2 className="mr-2 h-4 w-4" />Delete client</Button>
              <Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => setSelected(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Clients;
