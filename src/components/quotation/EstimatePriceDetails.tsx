import type { PriceEvidence } from '@/lib/quotation-ai/floor-plan';
export function EstimatePriceDetails({ price }: { price: PriceEvidence | null }) {
  if (!price) return <p className="text-xs text-amber-800 dark:text-amber-300">Price pending — no comparable rate available.</p>;
  return <details className="mt-1 text-xs leading-5 text-muted-foreground"><summary className="cursor-pointer">{price.source === 'manual' ? 'Rate entered by you' : price.source === 'approved' ? 'Catalogue rate' : price.source === 'admin_reference' ? 'Admin-reviewed quotation reference' : price.source === 'market_estimate' ? 'Market estimate — review sources' : 'Historical rate — verify'}</summary>
    <p className="mt-1">{price.location || 'Location unconfirmed'} · Retrieved/recorded {price.verifiedAt.slice(0, 10)}</p>
    {price.range && <p>Published range: {price.currency} {price.range.low}–{price.range.high}/{price.unit} · {price.confidence} confidence</p>}
    <p>{price.inclusions}</p>
    {price.sources?.filter(source => /^https:\/\//i.test(source.url)).map(source => <div key={source.url} className="mt-2 border-l pl-2"><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">{source.name}</a><p>Published {source.publishedDate || 'date unknown'} · Retrieved {source.retrievedAt.slice(0, 10)}</p><p>{source.specification}</p><p>“{source.quote}”</p></div>)}
  </details>;
}
