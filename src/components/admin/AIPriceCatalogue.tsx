'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReferencePrice } from '@/lib/quotation-ai/reference-pricing';

export function AIPriceCatalogue({ revision }: { revision: number }) {
  const [rows, setRows] = useState<ReferencePrice[]>([]);
  const [page, setPage] = useState(0), [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(); setBusy(false); setError('Price catalogue timed out. Try the search again.');
    }, 30000);
    setBusy(true); setError('');
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Please sign in again.');
      const params = new URLSearchParams({ kind: 'prices', page: String(page), search: query });
      const response = await fetch(`/api/admin/ai/training?${params}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load prices.');
      if (!controller.signal.aborted) { setRows(result.prices); setTotal(result.total ?? 0); }
    })().catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load prices.');
    }).finally(() => { clearTimeout(timer); if (!controller.signal.aborted) setBusy(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, query, revision]);
  return <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
    <div><h3 className="font-semibold">Price catalogue · {total} comparable products</h3><p className="mt-1 text-sm text-muted-foreground">Combined prices from all approved quotations. Each quotation contributes once per specification. Materials, city, currency, tax and installation are kept separate.</p></div>
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); setPage(0); setQuery(search.trim()); }}>
      <Input aria-label="Search price catalogue" placeholder="Search products, e.g. wardrobe" value={search} onChange={event => setSearch(event.target.value)} />
      <Button type="submit" variant="outline" disabled={busy}>Search</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {busy ? <p role="status" className="text-sm">Loading prices…</p> : !error && <>
      <div className="max-h-[520px] overflow-auto overscroll-contain"><table className="w-full min-w-[780px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-card"><tr className="border-b"><th className="p-2">Product / specification</th><th className="p-2">City</th><th className="p-2">Median / unit</th><th className="p-2">Range</th><th className="p-2">Quotations</th><th className="p-2">Basis</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b align-top">
          <td className="max-w-xs p-2"><strong className="capitalize">{row.product_name}</strong><p className="text-xs text-muted-foreground">{row.material} · {row.specification}</p></td>
          <td className="p-2 capitalize">{row.location}</td>
          <td className="whitespace-nowrap p-2">{row.currency} {Number(row.recent_rate ?? row.median_rate).toLocaleString()} / {row.unit}</td>
          <td className="whitespace-nowrap p-2">{Number(row.recent_low ?? row.low_rate).toLocaleString()}–{Number(row.recent_high ?? row.high_rate).toLocaleString()}</td>
          <td className="p-2">{row.recent_source_count || row.source_count}<p className="text-xs text-muted-foreground">{row.recent_source_count ? 'last 90 days' : 'historical only'} · {row.source_count} total</p></td>
          <td className="p-2 text-xs">Tax {row.tax}; installation {row.installation_included ? 'included' : 'not confirmed'}<p>Latest: {row.price_date}</p></td>
        </tr>)}</tbody>
      </table></div>
      {!rows.length && <p className="text-sm text-muted-foreground">No approved priced references match. Upload, review and approve quotations to build the catalogue.</p>}
      <div className="flex items-center justify-between gap-2"><Button type="button" variant="outline" disabled={!page} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-xs">Page {page + 1} of {Math.max(1, Math.ceil(total / 50))}</span><Button type="button" variant="outline" disabled={(page + 1) * 50 >= total} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </>}
  </section>;
}
