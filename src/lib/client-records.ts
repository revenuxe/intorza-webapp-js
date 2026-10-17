export type ClientDocument = { id: string; client_id?: string | null; client_name: string; quotation_id?: string | null;
  quotation_number?: string; invoice_number?: string; project_name?: string; quotation_title?: string;
  total_amount?: number; grand_total?: number; paid_amount?: number; remaining_amount?: number; status?: string };
export type ClientRecord = { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null };
export type ClientGroup = { key: string; id: string | null; name: string; profile?: ClientRecord;
  quotations: ClientDocument[]; invoices: ClientDocument[]; totalAmount: number; paidAmount: number; outstanding: number };

/** Prefer stable client IDs; only attach legacy names to a uniquely named profile. */
export function groupClientRecords(profiles: ClientRecord[], quotations: ClientDocument[], invoices: ClientDocument[]): ClientGroup[] {
  const groups = new Map<string, ClientGroup>();
  const byId = new Map(profiles.map(profile => [profile.id, profile]));
  const create = (key: string, name: string, profile?: ClientRecord) => {
    if (!groups.has(key)) groups.set(key, { key, id: profile?.id ?? null, name, profile, quotations: [], invoices: [], totalAmount: 0, paidAmount: 0, outstanding: 0 });
    return groups.get(key)!;
  };
  profiles.forEach(profile => create(`id:${profile.id}`, profile.name, profile));
  const identify = (document: ClientDocument) => {
    if (document.client_id) {
      const profile = byId.get(document.client_id);
      if (profile) return create(`id:${profile.id}`, profile.name, profile);
      // Invalid/foreign IDs must never silently become a name-based delete target.
      return create(`unresolved:${document.client_id}`, document.client_name);
    }
    const matches = profiles.filter(profile => profile.name === document.client_name);
    return matches.length === 1 ? create(`id:${matches[0].id}`, matches[0].name, matches[0]) : create(`name:${document.client_name}`, document.client_name);
  };
  const quoteGroups = new Map<string, ClientGroup>();
  quotations.forEach(quotation => { const group = identify(quotation); group.quotations.push(quotation); quoteGroups.set(quotation.id, group); });
  invoices.forEach(invoice => {
    const group = !invoice.client_id && invoice.quotation_id && quoteGroups.has(invoice.quotation_id) ? quoteGroups.get(invoice.quotation_id)! : identify(invoice);
    group.invoices.push(invoice);
    group.totalAmount += Number(invoice.total_amount || 0);
    group.paidAmount += Number(invoice.paid_amount || 0);
    group.outstanding += Number(invoice.remaining_amount ?? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)));
  });
  return [...groups.values()];
}
