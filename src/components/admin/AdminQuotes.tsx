'use client';
import { useEffect, useState } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuotationAIBadge, type AISelections } from './QuotationAIBadge';

type Quote = { id: string; quotation_number: string; reference_no: string; client_name: string; quotation_title: string | null; project_name: string; grand_total: number; status: string; user_email: string; created_at: string; aiSelections?: AISelections };
type Directory = { rows: Quote[]; total: number; page: number; page_size: number };
const statusClass = (status: string) => status === 'accepted' ? 'bg-green-100 text-green-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : status === 'pending' ? 'bg-yellow-100 text-yellow-800' : status === 'converted' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';

export function AdminQuotes({ refreshVersion = 0, formatCurrency }: { refreshVersion?: number; formatCurrency: (value: number) => string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiError, setAIError] = useState(false);
  const [data, setData] = useState<Directory>({ rows: [], total: 0, page: 0, page_size: 50 });
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setAIError(false);
    const timer = setTimeout(async () => {
      try {
        const result = await supabase.rpc('admin_quotation_directory', { p_search: search.trim(), p_page: page });
        if (result.error) throw result.error;
        const directory = result.data as unknown as Directory;
        if (!directory || !Array.isArray(directory.rows)) throw new Error('Invalid quotation response');
        if (active && !directory.rows.length && directory.total > 0 && page > 0) { setPage(0); return; }
        const ai = directory.rows.length ? await supabase.rpc('admin_quotation_ai_selections', { p_quotation_ids: directory.rows.map(row => row.id) }) : { data: [], error: null };
        const selections = new Map((ai.data || []).map(row => [row.quotation_id, row]));
        if (active) { setData({ ...directory, rows: directory.rows.map(row => ({ ...row, aiSelections: selections.get(row.id) })) }); setAIError(!!ai.error); }
      } catch { if (active) setError('Unable to load quotations. Please retry.'); }
      finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, retry, refreshVersion]);
  const changeSearch = (value: string) => { setSearch(value); setPage(0); };
  return <Card><CardHeader><CardTitle>Quotations Overview</CardTitle><CardDescription>Search the full quotation history across all accounts.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div className="flex min-w-0 items-center gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input type="search" aria-label="Search admin quotations" maxLength={160} placeholder="Search Ref QNO, quote, client, project or email..." className="h-11 rounded-xl pl-10 pr-10" value={search} onChange={event => changeSearch(event.target.value)} />{search && <button type="button" aria-label="Clear quotation search" className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg" onClick={() => changeSearch('')}><X className="h-4 w-4" /></button>}</div><Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label="Refresh quotations" onClick={() => setRetry(value => value + 1)}><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></Button></div>
    {error ? <div role="alert" className="space-y-3 rounded-xl border p-4"><p>{error}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Retry</Button></div> : <>
      <p role="status" className="text-xs text-muted-foreground">{loading ? 'Searching quotations...' : data.total + (data.total === 1 ? ' quotation' : ' quotations') + (search.trim() ? ' found' : ' total')}</p>
      {aiError && <p className="text-xs text-amber-700">AI selections are temporarily unavailable. Quotation records are shown below.</p>}
      <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>{['Quote #', 'Ref QNO', 'Client', 'Project', 'Amount', 'Status', 'User', 'Date'].map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
        {loading ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading quotations...</TableCell></TableRow> : !data.rows.length ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{search.trim() ? 'No quotations match your search.' : 'No quotations found.'}</TableCell></TableRow> : data.rows.map(quote => <TableRow key={quote.id}>
          <TableCell className="font-medium"><div className="flex items-center gap-2"><span>{quote.quotation_number}</span>{quote.aiSelections && <QuotationAIBadge selections={quote.aiSelections} quotationNumber={quote.quotation_number} />}</div></TableCell>
          <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{quote.reference_no || '—'}</TableCell><TableCell>{quote.client_name}</TableCell><TableCell>{quote.project_name || quote.quotation_title}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{formatCurrency(quote.grand_total || 0)}</TableCell><TableCell><Badge variant="secondary" className={statusClass(quote.status)}>{quote.status || 'draft'}</Badge></TableCell><TableCell className="text-xs">{quote.user_email}</TableCell><TableCell className="whitespace-nowrap">{new Date(quote.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
        </TableRow>)}
      </TableBody></Table></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{data.total ? page * data.page_size + 1 : 0}–{Math.min((page + 1) * data.page_size, data.total)} of {data.total}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || (page + 1) * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
    </>}
  </CardContent></Card>;
}
