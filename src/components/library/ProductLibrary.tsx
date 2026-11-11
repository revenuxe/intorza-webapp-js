'use client';
import { memo, useEffect, useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Copy, MoreHorizontal, Archive, RotateCcw, Pencil, Check, Package, Cloud, Laptop, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProductLibrary } from '@/hooks/useProductLibrary';
import { mergeLibrary, masterProducts, masterCategories, validateProduct, parseRate, searchProduct, units, importEntries, type Product, type Category, type Entries } from '@/lib/library/model';
import { readSnapshot } from '@/lib/library/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ProductLibraryEditor } from './ProductLibraryEditor';
import { ProductLibraryBulk } from './ProductLibraryBulk';
import { VisibleProductRows } from './VisibleProductRows';

const fieldValue = (product: Product, label: string) => product.specifications.find(field => field.label.toLowerCase() === label.toLowerCase())?.value || '';

function InlineText({ value, label, onSave, rate = false }: { value: string; label: string; onSave: (value: string) => void; rate?: boolean }) {
  const [text, setText] = useState(value);
  const [error, setError] = useState('');
  useEffect(() => { setText(value); }, [value]);
  const commit = () => {
    if (text === value) { setError(''); return; }
    try { onSave(text); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save.'); }
  };
  return <div className="min-w-0"><Input aria-label={label} value={text} inputMode={rate ? 'decimal' : undefined} maxLength={rate ? 20 : 160} placeholder={rate ? 'Not set' : 'Not set'} className="h-10 min-w-0 rounded-lg bg-background text-sm" onChange={event => setText(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } if (event.key === 'Escape') { setText(value); setError(''); } }} />{error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}

const ProductRow = memo(function ProductRow({ product, selected, selecting, onSelect, onSave, onEdit, onDuplicate, onReset }: { product: Product; selected: boolean; selecting: boolean; onSelect: () => void; onSave: (product: Product) => void; onEdit: () => void; onDuplicate: () => void; onReset: () => void }) {
  const [rowError, setRowError] = useState('');
  const updateSpec = (label: string, value: string) => {
    const fields = product.specifications.filter(field => field.label.toLowerCase() !== label.toLowerCase());
    if (value.trim()) fields.push({ label, value: value.trim() });
    onSave({ ...product, specifications: fields });
  };
  return <div className="grid min-w-0 gap-3 border-t p-4 xl:grid-cols-[minmax(170px,1.5fr)_85px_110px_minmax(100px,1fr)_minmax(100px,1fr)_100px] xl:items-start xl:gap-2 xl:px-4 xl:py-3">
    <div className="flex min-w-0 items-start gap-2">{selecting && <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary" aria-label={'Select ' + product.name} checked={selected} onChange={onSelect} />}<div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{product.name}</p>{product.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>}<p className="mt-1 text-[10px] text-muted-foreground">{product.updatedAt ? 'Updated ' + new Date(product.updatedAt).toLocaleDateString() : product.source}{product.hidden ? ' · Archived' : ''}</p></div></div>
    <div className="grid grid-cols-2 gap-3 xl:contents"><div className="min-w-0"><span className="mb-1 block text-xs text-muted-foreground xl:hidden">Unit</span><select aria-label={'Unit for ' + product.name} value={product.unit} className="h-10 w-full min-w-0 rounded-lg border bg-background px-2 text-sm" onChange={event => { try { onSave({ ...product, unit: event.target.value }); setRowError(''); } catch (cause) { setRowError(cause instanceof Error ? cause.message : 'Unable to save.'); } }}>{units.map(unit => <option key={unit}>{unit}</option>)}</select></div><div className="min-w-0"><span className="mb-1 block text-xs text-muted-foreground xl:hidden">Rate (INR)</span><InlineText rate label={'Rate for ' + product.name} value={product.rate === null ? '' : String(product.rate)} onSave={value => onSave({ ...product, rate: parseRate(value) })} /></div></div>
    <div className="grid grid-cols-2 gap-3 xl:contents">{['Material', 'Finish'].map(label => <div key={label} className="min-w-0"><span className="mb-1 block text-xs text-muted-foreground xl:hidden">{label}</span><InlineText label={label + ' for ' + product.name} value={fieldValue(product, label)} onSave={value => updateSpec(label, value)} /></div>)}</div>
    <div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-10 gap-1.5 px-3" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label={'More actions for ' + product.name}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onDuplicate}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem><DropdownMenuItem onSelect={() => { try { onSave({ ...product, hidden: !product.hidden }); } catch (cause) { setRowError(cause instanceof Error ? cause.message : 'Unable to save.'); } }}><Archive className="mr-2 h-4 w-4" />{product.hidden ? 'Restore product' : 'Hide product'}</DropdownMenuItem>{product.master && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onReset}><RotateCcw className="mr-2 h-4 w-4" />Reset to default</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>
    {rowError && <p role="alert" className="text-xs text-destructive xl:col-span-6">{rowError}</p>}
  </div>;
});

export function ProductLibrary() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="p-6 text-sm text-muted-foreground">Opening product library...</p>;
  return <ProductLibraryWorkspace key={user?.id || 'guest'} owner={user?.id || null} />;
}

export function ProductLibraryWorkspace({ owner }: { owner: string | null }) {
  const store = useProductLibrary(owner);
  const merged = useMemo(() => mergeLibrary(store.entries, store.legacy.products, store.legacy.categories), [store.entries, store.legacy]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [archived, setArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([masterCategories[0].id]));
  const [pageSizes, setPageSizes] = useState<Record<string, number>>({});
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<{ id?: string; name: string } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; apply: () => void } | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [guestEntries, setGuestEntries] = useState<Entries>({});
  const [importOpen, setImportOpen] = useState(false);
  const [replace, setReplace] = useState<Set<string>>(new Set());
  const [guestDismissed, setGuestDismissed] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSearch(query), 180); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(false), 2500); return () => clearTimeout(timer); }, [saved]);
  useEffect(() => {
    if (!owner || !store.cloudReady) return;
    try {
      const guest = readSnapshot(null).entries;
      const changes = Object.fromEntries(Object.entries(guest).filter(([, entry]) => entry.data));
      setGuestEntries(changes);
      setGuestDismissed(localStorage.getItem('intorza:library-import-choice:' + owner) === JSON.stringify(changes));
    } catch { setError('Guest library data could not be read. Account data was not changed.'); }
  }, [owner, store.cloudReady]);
  const markSaved = () => { setSaved(true); setError(''); };
  const saveProduct = (product: Product) => {
    const next = validateProduct({ ...product, updatedAt: new Date().toISOString() });
    if (!merged.categories.some(category => category.id === next.categoryId)) throw new Error('Choose an existing category.');
    store.commit([{ id: next.id, kind: 'product', data: next }]); markSaved();
  };
  const perform = (action: () => void) => { try { action(); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save changes.'); } };
  const newProduct = (categoryId = categoryFilter !== 'all' ? categoryFilter : merged.categories.find(category => !category.hidden)?.id || '') => setEditing({ id: 'custom-' + crypto.randomUUID(), categoryId, name: '', description: '', unit: 'Sq.ft', rate: null, specifications: [], hidden: false, master: false, updatedAt: null, source: 'Personal library' });
  const saveCategory = () => {
    const name = categoryName.trim();
    if (!name || name.length > 100) throw new Error('Enter a category name up to 100 characters.');
    if (merged.categories.some(category => category.id !== categoryEditor?.id && category.name.toLowerCase() === name.toLowerCase())) throw new Error('A category with this name already exists.');
    const existing = merged.categories.find(category => category.id === categoryEditor?.id);
    if (existing?.master) throw new Error('Default categories cannot be renamed.');
    const category: Category = { id: existing?.id || 'custom-category-' + crypto.randomUUID(), name, order: existing?.order || 2000 + merged.categories.length, master: false, hidden: existing?.hidden || false };
    store.commit([{ id: category.id, kind: 'category', data: category }]); setExpanded(current => new Set(current).add(category.id)); setCategoryEditor(null); markSaved();
  };
  const grouped = useMemo(() => {
    const categories = merged.categories.filter(category => (archived || !category.hidden) && (categoryFilter === 'all' || category.id === categoryFilter));
    return categories.map(category => ({ category, products: merged.products.filter(product => product.categoryId === category.id && (archived || !product.hidden) && searchProduct(product, category.name, search)) }))
      .filter(group => !search.trim() || group.products.length > 0);
  }, [merged, categoryFilter, archived, search]);
  const productCount = grouped.reduce((sum, group) => sum + group.products.length, 0);
  const selectedProducts = merged.products.filter(product => selected.has(product.id));
  const conflicts = Object.values(guestEntries).filter(entry => store.entries[entry.id] && JSON.stringify(store.entries[entry.id].data) !== JSON.stringify(entry.data));
  const chooseGuestImport = () => {
    const imported = importEntries(store.entries, guestEntries, replace);
    store.commit(Object.values(guestEntries).filter(entry => imported[entry.id] === entry).map(({ id, kind, data }) => ({ id, kind, data })));
    localStorage.setItem('intorza:library-import-choice:' + owner, JSON.stringify(guestEntries));
    setGuestDismissed(true); setImportOpen(false); markSaved();
  };
  return <section className="min-w-0 space-y-4" aria-label="Product and pricing library">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Products & pricing</h2><p className="mt-1 text-sm text-muted-foreground">A ready-to-use catalog. Set your own rates and specifications.</p></div><div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"><Button variant="outline" className="h-11 gap-2" onClick={() => { setCategoryEditor({ name: '' }); setCategoryName(''); }}><Plus className="h-4 w-4" />Add Category</Button><Button className="h-11 gap-2" onClick={() => newProduct()}><Plus className="h-4 w-4" />Add Product</Button><Button variant={selecting ? 'secondary' : 'outline'} className="h-11" onClick={() => { setSelecting(value => !value); setSelected(new Set()); }}>{selecting ? 'Cancel selection' : 'Bulk Edit'}</Button><Button variant="ghost" className="h-11" onClick={() => { setQuery(''); setSearch(''); setCategoryFilter('all'); setArchived(false); }}>Reset Filters</Button></div></div>
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border bg-muted/30 p-3 text-xs"><p className="flex max-w-2xl items-start gap-2 leading-5">{owner ? <Cloud className="mt-0.5 h-4 w-4 shrink-0" /> : <Laptop className="mt-0.5 h-4 w-4 shrink-0" />}{owner ? 'Personal rates and products are private to your account. Changes save automatically.' : 'Guest changes are saved only on this browser/device. Clearing browser data removes them; they are not synced to the cloud.'}</p><span role="status" className="flex items-center gap-1.5 whitespace-nowrap font-medium">{store.syncing ? 'Syncing...' : owner && store.pendingCount ? store.pendingCount + ' changes on device' : saved ? <><Check className="h-3.5 w-3.5 text-green-600" />{owner && store.cloudReady ? 'Saved to account' : 'Saved on device'}</> : owner ? store.cloudReady ? 'Account synced' : 'Loading account...' : 'Browser storage'}</span></div>
    {(store.error || error) && <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 p-3 text-sm text-destructive"><p>{error || store.error}</p>{store.error && <Button size="sm" variant="outline" onClick={store.retry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}</div>}
    {owner && store.cloudReady && Object.keys(guestEntries).length > 0 && !guestDismissed && <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4"><div><h3 className="font-semibold">Import Guest Library Changes</h3><p className="mt-1 text-sm text-muted-foreground">{Object.keys(guestEntries).length} browser changes are available. Existing account prices are kept unless you explicitly replace them.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { setReplace(new Set()); if (conflicts.length) setImportOpen(true); else perform(chooseGuestImport); }}>Import Changes</Button><Button size="sm" variant="outline" onClick={() => { setReplace(new Set()); setImportOpen(true); }}>Review Conflicts</Button><Button size="sm" variant="ghost" onClick={() => perform(() => { localStorage.setItem('intorza:library-import-choice:' + owner, JSON.stringify(guestEntries)); setGuestDismissed(true); })}>Keep Existing Account Library</Button></div></div>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,280px)]"><div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search Products" className="h-11 pl-10 pr-10" placeholder="Search products, materials, brands..." value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center" aria-label="Clear product search" onClick={() => setQuery('')}><X className="h-4 w-4" /></button>}</div><select aria-label="Select Category" className="h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{merged.categories.filter(category => archived || !category.hidden).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p aria-live="polite"><strong className="text-foreground">{productCount}</strong> products · <strong className="text-foreground">{grouped.length}</strong> categories <span className="ml-1">{masterProducts.length} defaults / {masterCategories.length} categories</span></p><label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={archived} onChange={event => setArchived(event.target.checked)} />Show archived</label></div>
    {selecting && <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background p-3 shadow-sm"><span className="text-sm font-medium">{selected.size} products selected</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button><Button size="sm" disabled={!selected.size} onClick={() => setBulk(true)}>Edit selected</Button></div></div>}
    <div className="space-y-3">{grouped.map(({ category, products }) => {
      const isOpen = search.trim() || categoryFilter !== 'all' || expanded.has(category.id);
      return <section key={category.id} className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-label={category.name}><div className="flex items-center gap-1 bg-muted/20 p-2 sm:px-3"><button type="button" aria-expanded={!!isOpen} aria-controls={'category-' + category.id} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-1 text-left" onClick={() => setExpanded(current => { const next = new Set(current); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next; })}><ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (!isOpen ? '-rotate-90' : '')} /><span className="min-w-0 break-words text-xs font-semibold tracking-wide sm:text-sm">{category.name}</span><span className="shrink-0 rounded-full bg-background px-2 py-1 text-[10px] text-muted-foreground">{products.length}</span>{category.hidden && <Archive className="h-3.5 w-3.5 shrink-0" />}</button><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={'Add product to ' + category.name} onClick={() => newProduct(category.id)}><Plus className="h-4 w-4" /></Button><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={'Category actions for ' + category.name}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{!category.master && <DropdownMenuItem onSelect={() => { setCategoryEditor(category); setCategoryName(category.name); }}>Rename category</DropdownMenuItem>}<DropdownMenuItem onSelect={() => perform(() => { store.commit([{ id: category.id, kind: 'category', data: { ...category, hidden: !category.hidden } }]); markSaved(); })}>{category.hidden ? 'Restore category' : 'Hide category'}</DropdownMenuItem>{!category.master && !category.id.startsWith('legacy-') && !merged.products.some(product => product.categoryId === category.id) && <DropdownMenuItem onSelect={() => setConfirmation({ title: 'Delete empty category?', description: 'Only this empty custom category will be removed.', apply: () => { store.commit([{ id: category.id, kind: 'category', data: null }]); if (categoryFilter === category.id) setCategoryFilter('all'); markSaved(); } })}>Delete empty category</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>
      {isOpen && <div id={'category-' + category.id}>{selecting && products.length > 0 && <label className="flex min-h-11 items-center gap-2 border-t px-4 text-xs"><input type="checkbox" checked={products.every(product => selected.has(product.id))} onChange={event => setSelected(current => { const next = new Set(current); for (const product of products) { if (event.target.checked) next.add(product.id); else next.delete(product.id); } return next; })} />Select matching products in this category</label>}<div className="hidden grid-cols-[minmax(170px,1.5fr)_85px_110px_minmax(100px,1fr)_minmax(100px,1fr)_100px] gap-2 border-t bg-muted/40 px-4 py-2 text-[11px] font-medium text-muted-foreground xl:grid">{['Product Name', 'Unit', 'Rate (INR)', 'Material', 'Finish', 'Actions'].map(label => <span key={label}>{label}</span>)}</div><VisibleProductRows count={products.length}>{products.slice(0, pageSizes[category.id] || 30).map(product => <ProductRow key={product.id} product={product} selected={selected.has(product.id)} selecting={selecting} onSelect={() => setSelected(current => { const next = new Set(current); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); return next; })} onSave={saveProduct} onEdit={() => setEditing(product)} onDuplicate={() => setEditing({ ...product, id: 'custom-' + crypto.randomUUID(), name: product.name + ' (Copy)', master: false, specifications: product.specifications.map(field => ({ ...field })), updatedAt: null, source: 'Personal library' })} onReset={() => setConfirmation({ title: 'Reset ' + product.name + '?', description: 'Your rate, unit, specifications and other overrides for this default product will be removed. Other products are unchanged.', apply: () => { store.commit([{ id: product.id, kind: 'product', data: null }]); markSaved(); } })} />)}</VisibleProductRows>{products.length > (pageSizes[category.id] || 30) && <Button variant="ghost" className="m-3" onClick={() => setPageSizes(current => ({ ...current, [category.id]: (current[category.id] || 30) + 30 }))}>Show more products</Button>}{!products.length && <p className="border-t p-6 text-sm text-muted-foreground">No products in this category. Add your first product above.</p>}</div>}</section>;
    })}{!grouped.length && <div className="rounded-xl border p-8 text-center"><Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p>No products match these filters.</p><Button variant="ghost" onClick={() => { setQuery(''); setSearch(''); setCategoryFilter('all'); }}>Reset Filters</Button></div>}</div>
    {editing && <ProductLibraryEditor key={editing.id} initial={editing} categories={merged.categories} onClose={() => setEditing(null)} onSave={saveProduct} />}
    {bulk && <ProductLibraryBulk products={selectedProducts} categories={merged.categories} onClose={() => setBulk(false)} onApply={(products, reset) => { store.commit(products.map(product => ({ id: product.id, kind: 'product', data: reset ? null : { ...product, updatedAt: new Date().toISOString() } }))); setSelected(new Set()); markSaved(); }} />}
    <Dialog open={!!categoryEditor} onOpenChange={open => { if (!open) setCategoryEditor(null); }}><DialogContent className="max-w-md rounded-2xl"><DialogHeader><DialogTitle>{categoryEditor?.id ? 'Rename category' : 'Add Category'}</DialogTitle><DialogDescription>Create a category in your personal library.</DialogDescription></DialogHeader><form onSubmit={event => { event.preventDefault(); perform(saveCategory); }} className="space-y-4"><Label htmlFor="library-category-name">Category name</Label><Input id="library-category-name" autoFocus required maxLength={100} value={categoryName} onChange={event => setCategoryName(event.target.value)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="submit">Save category</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={!!confirmation} onOpenChange={open => { if (!open) setConfirmation(null); }}><DialogContent className="max-w-md rounded-2xl"><DialogHeader><DialogTitle>{confirmation?.title}</DialogTitle><DialogDescription>{confirmation?.description}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter className="gap-2"><Button variant="outline" onClick={() => setConfirmation(null)}>Cancel</Button><Button onClick={() => perform(() => { confirmation?.apply(); setConfirmation(null); })}>Confirm</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="flex max-h-[85dvh] max-w-xl flex-col overflow-hidden rounded-2xl"><DialogHeader><DialogTitle>Import Guest Library Changes</DialogTitle><DialogDescription>{conflicts.length ? 'Select only the browser changes that should replace account values. Unchecked conflicts keep the account version.' : 'No conflicting personal overrides. New products and categories will be imported with their existing IDs.'}</DialogDescription></DialogHeader><div className="min-h-0 space-y-3 overflow-y-auto">{conflicts.map(entry => { const guest = entry.data as Product; const account = store.entries[entry.id].data as Product; return <label key={entry.id} className="flex items-start gap-3 rounded-xl border p-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={replace.has(entry.id)} onChange={event => setReplace(current => { const next = new Set(current); if (event.target.checked) next.add(entry.id); else next.delete(entry.id); return next; })} /><div className="min-w-0 text-sm"><p className="font-medium">{guest.name}</p><p className="mt-1 text-xs text-muted-foreground">Account: {entry.kind === 'product' ? (account?.rate ?? 'Not set') + '/' + (account?.unit || guest.unit) : account?.name || 'Default category'}</p><p className="text-xs text-muted-foreground">Browser: {entry.kind === 'product' ? (guest.rate ?? 'Not set') + '/' + guest.unit : guest.name}</p>{entry.kind === 'product' && <p className="mt-1 text-xs">Account specifications: {account?.specifications?.map(field => field.label + ': ' + field.value).join(', ') || 'None'}<br />Browser specifications: {guest.specifications.map(field => field.label + ': ' + field.value).join(', ') || 'None'}<br />Account description: {account?.description || 'None'}<br />Browser description: {guest.description || 'None'}</p>}</div></label>; })}<p className="text-xs text-muted-foreground">{Object.keys(guestEntries).length - conflicts.length} nonconflicting changes will also be imported. Browser copies remain on this device.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={() => perform(chooseGuestImport)}>Import selected changes</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
