/** @jest-environment node */
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { OpenAIWebMarketPricing } from '@/lib/quotation-ai/market-pricing';
import { OpenAIEstimateCompletion, applyCompletion, completionItems } from '@/lib/quotation-ai/estimate-completion';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
import { buildEstimate, type Estimate } from '@/lib/quotation-ai/floor-plan';
import { defaultRoomWork } from '@/lib/quotation-ai/room-work';
import { toQuotation, reviewDraft } from '@/lib/quotation-ai/domain';
import { workAreaSqft } from '@/lib/quotation-ai/measurement-units';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@/lib/quotation-ai/floor-plan-provider', () => ({ OpenAIFloorPlanProvider: jest.fn() }));
jest.mock('@/lib/quotation-ai/market-pricing', () => ({ ...jest.requireActual('@/lib/quotation-ai/market-pricing'), OpenAIWebMarketPricing: jest.fn() }));
jest.mock('@/lib/quotation-ai/estimate-completion', () => ({ ...jest.requireActual('@/lib/quotation-ai/estimate-completion'), OpenAIEstimateCompletion: jest.fn() }));
const autoComplete = jest.fn();
const research = jest.fn();
const interpretRequirements = jest.fn();
const getUser = jest.fn(); const limit = jest.fn(); const analyse = jest.fn(); const generate = jest.fn();
const upload = jest.fn(); const remove = jest.fn(); const from = jest.fn();
const rpc = jest.fn();
const eq = jest.fn(); const insert = jest.fn();
let walletBalance = 60;
let walletError = false;
let projectExists = true;
let referenceRows: Record<string, unknown>[] = [];
let libraryRows: Record<string, unknown>[] = [];
let storedEstimate: Estimate | null = null;
let metricProfile = false;
let measurementUpdateFails = false;
let projectPaid = false;
let projectCost = 20;
const defaultRpc = async (name: string, args: { p_project_id?: string } = {}) => ({ data:
  name === 'get_quotation_coin_delivery' ? { projectId: args.p_project_id, amount: projectCost, paid: projectPaid, ready: true }
    : name === 'confirm_quotation_coin_delivery' ? { projectId: args.p_project_id, amount: projectCost, paid: true, balance: 40 }
      : name === 'is_pro_user' ? true : 45,
  error: null,
});
const profileUpdate = jest.fn();
function database(table: string) {
  const result = { data: table === 'profiles' ? { id: 'owner', currency_code: 'INR', country_code: 'IN', measurement_system: metricProfile ? 'metric' : 'imperial' } : table === 'ai_reference_price_catalogue' ? referenceRows : table === 'item_usage_patterns' ? libraryRows : [], error: null };
  let updatingProfile = false;
  const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn(function (...args: unknown[]) { eq(table, ...args); return chain; }),
    range: jest.fn((start: number, end: number) => Promise.resolve({ ...result, data: Array.isArray(result.data) ? result.data.slice(start, end + 1) : [] })), limit: jest.fn().mockResolvedValue(result), order: jest.fn().mockReturnThis(), single: jest.fn(() => Promise.resolve(updatingProfile && measurementUpdateFails ? { data: null, error: new Error('Denied') } : result)),
    maybeSingle: jest.fn().mockResolvedValue(table === 'coin_wallets' ? { data: walletError ? null : { balance: walletBalance }, error: walletError ? { message: 'Wallet unavailable' } : null } : { data: projectExists ? { id: 'project', estimate: storedEstimate } : null, error: null }),
    insert: jest.fn((row: unknown) => { insert(table, row); return Promise.resolve({ error: null }); }),
    update: jest.fn((body: unknown) => { if (table === 'profiles') { updatingProfile = true; profileUpdate(body); } return chain; }), then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
  };
  return chain;
}
function request(body: unknown, authenticated = true) {
  return new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer session' } : {}) }, body: JSON.stringify(body) });
}
const payload = () => ({ action: 'generate', projectId: null, analysis: planFixture(), brief: briefFixture(), draft: draftFixture() });
const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
afterAll(() => errorLog.mockRestore());

it('accepts AI labels for separate parts of combined plan spaces instead of returning 422', async () => {
  const analysis = planFixture();
  analysis.rooms = [{ ...analysis.rooms[0], name: 'Living & Dining', kind: 'living' }, { ...analysis.rooms[0], name: 'Kitchen + Utility', kind: 'kitchen' }];
  interpretRequirements.mockResolvedValueOnce({ exclusions: [{ roomName: 'Dining', workKeys: ['painting'] }, { roomName: 'Utility', workKeys: ['painting'] }], roomNames: ['Living and Dining room','Kitchen and Utility'] });
  generate.mockResolvedValueOnce({ sections: analysis.rooms.map(room => ({ title: room.name, roomName: room.name, items: [{ ...proposalFixture().sections[0].items[0], productName: room.kind === 'kitchen' ? 'Kitchen base cabinets' : 'TV unit' }] })), assumptions: [] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), automatic: true, roomNames: analysis.rooms.map(room => room.name), requestNotes: 'No painting in the dining or utility spaces.' } }));
  expect(response.status).toBe(200);
  expect((await response.json()).estimate.workExclusions.map((row: { roomName: string }) => row.roomName)).toEqual(['Living & Dining','Kitchen + Utility']);
});

it('does not reject a global exclusion for an unselected room when generating kitchen-only work', async () => {
  const analysis = planFixture(); analysis.rooms.push({ ...analysis.rooms[0], name: 'Kitchen', kind: 'kitchen' });
  interpretRequirements.mockResolvedValueOnce({ exclusions: [{ roomName: 'All rooms', workKeys: ['painting'] }] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), scope: 'kitchen', roomNames: ['Kitchen'], automatic: true, requestNotes: 'No painting.' } }));
  expect(response.status).toBe(200);
  expect((await response.json()).estimate.workExclusions).toEqual([{ roomName: 'Kitchen', workKeys: ['painting'] }]);
});

it('returns an actionable room error and reference for a genuinely ambiguous requirement', async () => {
  const analysis = planFixture(); analysis.rooms = [{ ...analysis.rooms[0], name: 'Bedroom 1' }, { ...analysis.rooms[0], name: 'Bedroom 2' }];
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], roomRequirements: [{ roomName: 'Bedroom', includedWorkKeys: ['wardrobe'] }] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), roomNames: ['Bedroom 1','Bedroom 2'], requestNotes: 'A wardrobe in the bedroom.' } }));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ code: 'AI_ROOM_AMBIGUOUS', stage: 'requirements', requestId: expect.any(String) });
  expect(generate).not.toHaveBeenCalled();
});

it('lets explicit note-selected rooms override a conflicting scope filter instead of producing 422', async () => {
  const analysis = planFixture(); analysis.rooms.push({ ...analysis.rooms[0], name: 'Kitchen', kind: 'kitchen' });
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], roomNames: ['bedroom'], roomRequirements: [{ roomName: 'Bedroom', includedWorkKeys: ['wardrobe'] }] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), scope: 'kitchen', roomNames: ['Kitchen'], automatic: true, requestNotes: 'Instead, do the bedroom wardrobe.' } }));
  expect(response.status).toBe(200);
  expect((await response.json()).estimate.draft.sections.map((section: { title: string }) => section.title)).toEqual(['Bedroom']);
});

it('classifies invalid AI requirements output as an upstream failure and logs no customer note values', async () => {
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], finishTier: 'not-a-tier' });
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), requestNotes: 'Private customer note, never log this.' } }));
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ code: 'AI_INVALID_OUTPUT', stage: 'requirements', requestId: expect.any(String) });
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain('Private customer note');
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
});
it('prioritises an explicit Luxury brief over the Standard selector and carries custom details to search', async () => {
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], finishTier: 'Luxury', designDirection: 'Warm minimalist luxury with walnut veneer and Blum hardware.', roomRequirements: [{ roomName: 'Bedroom', items: [{ workKey: 'wardrobe', details: 'Walnut veneer, Blum soft-close hardware, warm minimalist detailing.' }] }] });
  libraryRows = [{ id: 'standard', product_name: 'Wardrobe', product_details: 'Laminate', preferred_rate: 1200, country_code: 'IN', updated_at: new Date().toISOString() }];
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true, requestNotes: 'I want luxury walnut veneer wardrobes with Blum soft-close hardware in a warm minimalist style.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.finishTier).toBe('Luxury');
  expect(generate).toHaveBeenCalledWith(expect.objectContaining({ brief: expect.objectContaining({ finish: 'Luxury', requirements: expect.objectContaining({ designDirection: expect.stringContaining('walnut') }) }) }), expect.anything());
  expect(research).toHaveBeenCalledWith(expect.objectContaining({ finish: 'Luxury', products: expect.arrayContaining([expect.objectContaining({ name: 'Wardrobe', specification: expect.stringContaining('Blum soft-close') })]) }), expect.anything());
  expect(result.estimate.draft.sections[0].items[0].productDetails).toContain('Walnut veneer');
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).not.toBe(1200);
});

it('researches the actual material requirement instead of substituting same-tier kitchen controls or catalogue prices', async () => {
  const analysis = planFixture(); analysis.rooms[0] = { ...analysis.rooms[0], name: 'Kitchen', kind: 'kitchen' };
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], designDirection: 'Marine plywood kitchen with Blum hardware.', roomRequirements: [{ roomName: 'Kitchen', items: [{ workKey: 'base_cabinets', details: 'Marine plywood carcass with Blum hardware and matte walnut finish.' }] }] });
  libraryRows = [{ id: 'generic', product_name: 'Kitchen base cabinets', product_details: '18mm MDF', preferred_rate: 1400, country_code: 'IN', updated_at: new Date().toISOString() }];
  generate.mockResolvedValueOnce({ sections: [{ title: 'Kitchen', roomName: 'Kitchen', items: [{ ...proposalFixture().sections[0].items[0], productName: 'Kitchen base cabinets', description: '18mm MDF with standard hardware', specifications: [{ label: 'Material', value: 'MDF' }] }] }], assumptions: [] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), roomNames: ['Kitchen'], automatic: true, kitchenPreferences: { carcass: 'hdhmr' }, requestNotes: 'Use marine plywood and Blum hardware, not the default kitchen material.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  const cabinet = result.estimate.draft.sections[0].items.find((item: { productName: string }) => item.productName === 'Kitchen base cabinets');
  expect(cabinet.productDetails).toContain('Marine plywood');
  expect(cabinet.productDetails).not.toContain('MDF');
  expect(cabinet.ratePerSft).not.toBe(1400);
  expect(research.mock.calls.flatMap(([input]) => input.products).find(product => product.name === 'Kitchen base cabinets').specification).toContain('Blum hardware');
});

it('researches and applies different finish tiers for different rooms described in the primary brief', async () => {
  const analysis = planFixture(); analysis.rooms = [{ ...analysis.rooms[0], name: 'Master bedroom' }, { ...analysis.rooms[0], name: 'Guest bedroom' }];
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], designDirection: 'Luxury master bedroom and Basic guest bedroom.', roomRequirements: [{ roomName: 'Master bedroom', finishTier: 'Luxury' }, { roomName: 'Guest bedroom', finishTier: 'Basic' }] });
  generate.mockResolvedValueOnce({ sections: analysis.rooms.map(room => ({ title: room.name, roomName: room.name, items: proposalFixture().sections[0].items })), assumptions: [] });
  research.mockImplementationOnce(async input => ({ rates: input.products.map((product: { name: string; specification: string }) => ({ id: `market-${input.finish}`, name: product.name, description: product.specification, source: 'market_estimate', finishTier: input.finish, rate: 3500, unit: 'sqft', currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(), sourceUrl: 'https://supplier.example/luxury', inclusions: '' })), limitations: [] }));
  research.mockImplementationOnce(async input => ({ rates: input.products.map((product: { name: string; specification: string }) => ({ id: `market-${input.finish}`, name: product.name, description: product.specification, source: 'market_estimate', finishTier: input.finish, rate: 900, unit: 'sqft', currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(), sourceUrl: 'https://supplier.example/basic', inclusions: '' })), limitations: [] }));
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), roomNames: analysis.rooms.map(room => room.name), requestNotes: 'Luxury master bedroom, but keep the guest bedroom Basic.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(research.mock.calls.map(([input]) => input.finish)).toEqual(['Luxury','Basic']);
  expect(result.estimate.draft.sections.map((section: { items: { ratePerSft: number }[] }) => section.items[0].ratePerSft)).toEqual([3500,900]);
  expect(result.estimate.evidence.map((row: { price: { finishTier: string } }) => row.price.finishTier)).toEqual(['Luxury','Basic']);
});

it('lets an explicit whole-home request override a kitchen-only scope default using rooms from the plan', async () => {
  const analysis = planFixture(); analysis.rooms.push({ ...analysis.rooms[0], name: 'Kitchen', kind: 'kitchen' });
  interpretRequirements.mockResolvedValueOnce({ exclusions: [], scope: 'complete', designDirection: 'Full-home interior.', roomNames: [] });
  generate.mockResolvedValueOnce({ sections: analysis.rooms.map(room => ({ title: room.name, roomName: room.name, items: [{ ...proposalFixture().sections[0].items[0], productName: room.kind === 'kitchen' ? 'Kitchen base cabinets' : 'Wardrobe' }] })), assumptions: [] });
  const response = await POST(request({ ...payload(), analysis, brief: { ...briefFixture(), automatic: true, scope: 'kitchen', roomNames: ['Kitchen'], requestNotes: 'Please do the full home interior, not just the kitchen.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections.map((section: { title: string }) => section.title)).toEqual(['Bedroom','Kitchen']);
  expect(generate).toHaveBeenCalledWith(expect.objectContaining({ brief: expect.objectContaining({ scope: 'complete', roomNames: ['Bedroom','Kitchen'] }) }), expect.anything());
});
it.each(['No wall painting or false ceiling.', 'No wall painting and no seling.'])('enforces notes over defaults and unwanted model output: %s', requestNotes => {
  return (async () => {
    const proposal = proposalFixture();
    proposal.sections[0].items.push({ ...proposal.sections[0].items[0], productName: 'Wall painting' }, { ...proposal.sections[0].items[0], productName: 'False ceiling' });
    generate.mockResolvedValueOnce(proposal);
    const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true, quoteExtras: ['painting','ceiling'], requestNotes } }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(interpretRequirements).toHaveBeenCalledWith(expect.objectContaining({ requestNotes }), expect.anything());
    expect(result.estimate.draft.sections[0].items.map((item: { productName: string }) => item.productName)).toEqual(['Wardrobe', 'Loft storage']);
    expect(result.estimate.workExclusions[0].workKeys).toEqual(expect.arrayContaining(['painting','ceiling']));
    expect(research.mock.calls.flatMap(([input]) => input.products).map(product => product.name)).not.toEqual(expect.arrayContaining(['Wall painting','False ceiling']));
  })();
});

it('applies semantic requirements and keeps room-specific exceptions local', async () => {
  const plan = planFixture();
  plan.rooms.push({ ...plan.rooms[0], name: 'Kitchen', kind: 'kitchen' });
  interpretRequirements.mockResolvedValueOnce({ exclusions: [{ roomName: 'Bedroom', workKeys: ['painting'] }] });
  generate.mockResolvedValueOnce({ ...proposalFixture(), sections: [...proposalFixture().sections, { title: 'Kitchen', roomName: 'Kitchen', items: [{ ...proposalFixture().sections[0].items[0], productName: 'Kitchen base cabinets' }] }] });
  const response = await POST(request({ ...payload(), analysis: plan, brief: { ...briefFixture(), automatic: true, roomNames: ['Bedroom','Kitchen'], requestNotes: 'Leave the existing walls as they are except in the kitchen.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items.some((item: { productName: string }) => item.productName === 'Wall painting')).toBe(false);
  expect(result.estimate.draft.sections[1].items.some((item: { productName: string }) => item.productName === 'Wall painting')).toBe(true);
});

it('removes excluded work during pricing retry without mismatching retained item identities', async () => {
  const proposal = proposalFixture();
  proposal.sections[0].items.unshift({ ...proposal.sections[0].items[0], productName: 'Wall painting' });
  storedEstimate = buildEstimate(proposal, planFixture(), briefFixture(), [], draftFixture());
  const wardrobeId = storedEstimate.draft.sections[0].items[1].id;
  const response = await POST(request({ ...payload(), action: 'retry_pricing', projectId: '11111111-1111-4111-8111-111111111111', brief: { ...briefFixture(), requestNotes: 'No wall painting.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items).toHaveLength(1);
  expect(result.estimate.draft.sections[0].items[0]).toMatchObject({ id: wardrobeId, productName: 'Wardrobe' });
  expect(result.estimate.evidence).toHaveLength(1);
});

it('allows rooms with no remaining work after exclusions without restoring defaults or failing the whole quote', async () => {
  const plan = planFixture();
  plan.rooms.push({ ...plan.rooms[0], name: 'Balcony', kind: 'balcony' });
  const response = await POST(request({ ...payload(), analysis: plan, brief: { ...briefFixture(), automatic: true, roomNames: ['Bedroom','Balcony'], requestNotes: 'No ceiling or painting.' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections.find((section: { title: string }) => section.title === 'Balcony').items).toHaveLength(0);
  expect(result.estimate.scopeGaps).toEqual([]);
});
it.each(['Basic', 'Premium', 'Luxury'] as const)('searches for %s pricing when only ungraded library rates exist', async finish => {
  libraryRows = [{ id: 'standard-only', product_name: 'Wardrobe', product_details: '18mm plywood', preferred_rate: 1200, country_code: 'IN', updated_at: new Date().toISOString() }];
  research.mockImplementationOnce(async (input) => ({ rates: input.products.map((product: { name: string; specification: string }) => ({
    id: 'tier-market', name: product.name, description: product.specification, rate: finish === 'Luxury' ? 3500 : 1800,
    unit: 'sqft', source: 'market_estimate', finishTier: finish, currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(),
    sourceUrl: 'https://supplier.example/tier-rates', inclusions: 'Installed, excluding GST',
  })), limitations: [] }));
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), finish } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(research).toHaveBeenCalledWith(expect.objectContaining({ finish, products: [expect.objectContaining({ specification: expect.stringContaining(`Requested finish tier: ${finish}`) })] }), expect.anything());
  expect(result.estimate.finishTier).toBe(finish);
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(finish === 'Luxury' ? 3500 : 1800);
  expect(result.estimate.evidence[0].price).toMatchObject({ source: 'market_estimate', finishTier: finish });
  expect(result.estimate.assumptions.join(' ')).toContain('excluded');
});

it('does not fall back to a Standard close-match rate after Luxury search finds no sources', async () => {
  referenceRows = [{ id: 'standard', section: 'Bedroom', product_name: 'Wardrobe', material: 'Laminate', specification: 'Standard finish', unit: 'sqft', recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5, tax: 'excluded', installation_included: true, location: 'Bengaluru', currency: 'INR', price_date: new Date().toISOString(), project_type: 'Apartment' }];
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), finish: 'Luxury', automatic: true } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(research).toHaveBeenCalledWith(expect.objectContaining({ finish: 'Luxury' }), expect.anything());
  expect(result.estimate.evidence.every((row: { price: unknown }) => row.price === null)).toBe(true);
  expect(autoComplete).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ finish: 'Luxury' }), [], 'INR', expect.anything());
});

it('keeps an explicitly Luxury library rate unchanged when it matches the requested tier', async () => {
  libraryRows = [{ id: 'luxury', product_name: 'Wardrobe', product_details: 'Luxury bespoke veneer finish', preferred_rate: 3200, country_code: 'IN', updated_at: new Date().toISOString() }];
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), finish: 'Luxury' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(3200);
  expect(research).not.toHaveBeenCalled();
});

it('researches Luxury again on retry instead of locking the old Standard catalogue rate', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  storedEstimate.draft.sections[0].items[0].ratePerSft = 1200;
  storedEstimate.evidence[0].price = { id: 'old-standard', name: 'Wardrobe', description: 'Proposed wardrobe', rate: 1200, unit: 'sqft', source: 'market_estimate', finishTier: 'Standard', currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(), sourceUrl: 'https://supplier.example/standard', inclusions: '' };
  const response = await POST(request({ ...payload(), action: 'retry_pricing', projectId: '11111111-1111-4111-8111-111111111111', brief: { ...briefFixture(), finish: 'Luxury' } }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(research).toHaveBeenCalledWith(expect.objectContaining({ finish: 'Luxury' }), expect.anything());
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBeNull();
});

it('requires full regeneration when changing finish tier during partial-room regeneration', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  const response = await POST(request({ ...payload(), projectId: '11111111-1111-4111-8111-111111111111', regenerateRooms: ['Bedroom'], brief: { ...briefFixture(), finish: 'Luxury' } }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('full estimate');
  expect(generate).not.toHaveBeenCalled();
});
beforeEach(() => {
  jest.clearAllMocks(); walletBalance = 60; walletError = false; projectExists = true; referenceRows = []; libraryRows = []; storedEstimate = null; metricProfile = false; measurementUpdateFails = false;
  projectPaid = false; projectCost = 20;
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'secret', OPENAI_FLOOR_PLAN_MODEL: 'configured-vision-model', QUOTATION_AI_LIMITER: { limit } } });
  from.mockImplementation(database);
  rpc.mockImplementation(defaultRpc);
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser }, from, rpc, storage: { from: () => ({ upload, remove }) } });
  (OpenAIFloorPlanProvider as jest.Mock).mockReturnValue({ analyse, generate, requirements: interpretRequirements });
  interpretRequirements.mockResolvedValue({ exclusions: [] });
  (OpenAIWebMarketPricing as jest.Mock).mockReturnValue({ research });
  (OpenAIEstimateCompletion as jest.Mock).mockReturnValue({ complete: autoComplete });
  autoComplete.mockImplementation(async estimate => estimate);
  research.mockResolvedValue({ rates: [], limitations: ['No comparable published rates found.'] });
  generate.mockResolvedValue(proposalFixture()); analyse.mockResolvedValue(planFixture());
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
});
it('completes stored estimates with validated measurements and no provider calls', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  const itemId = storedEstimate.draft.sections[0].items[0].id;
  const response = await POST(request({ action: 'complete', projectId: '00000000-0000-4000-8000-000000000001', changes: [{ itemId, widthFt: 8, heightFt: 7, ratePerSft: 1200 }] }));
  expect(response.status).toBe(200); expect((await response.json()).estimate.totals.total).toBe(75331.2);
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled();
  projectExists = false;
  expect((await POST(request({ action: 'complete', projectId: '00000000-0000-4000-8000-000000000001', changes: [{ itemId, widthFt: 8, heightFt: 7, ratePerSft: 1200 }] }))).status).toBe(403);
});
it('automatically finishes all default full-interior items when research returns no rates', async () => {
  autoComplete.mockImplementation(async (estimate: Estimate, _analysis, brief, _rates, currency) => applyCompletion(estimate, {
    items: completionItems(estimate).map(item => ({ itemId: item.id, widthFt: item.widthFt ?? 8, heightFt: item.heightFt ?? 7,
      ratePerSqft: item.productName === 'Wall painting' ? 25 : 1200, low: item.productName === 'Wall painting' ? 20 : 1000,
      high: item.productName === 'Wall painting' ? 35 : 1500, measurementAssumption: 'Proposed work face; verify on site.', pricingAssumption: 'Installed allowance excluding GST.' })),
  }, brief, currency));
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(estimate.incomplete).toBe(false);
  const items = toQuotation(estimate.draft, true).flatMap(section => section.items);
  expect(items.map(item => item.productName)).toEqual(expect.arrayContaining(['Wardrobe', 'Wall painting', 'False ceiling', 'Loft storage']));
  expect(items.every(item => item.widthFt > 0 && item.heightFt > 0 && item.ratePerSft > 0 && item.amount > 0)).toBe(true);
  expect(estimate.evidence.every(row => row.price.source === 'ai_estimate' && !row.reason.includes('Price pending'))).toBe(true);
  expect(OpenAIEstimateCompletion).toHaveBeenCalledWith('secret', 'gpt-6-astra');
});
it('does not save an apparently complete quotation when automatic estimation fails', async () => {
  autoComplete.mockRejectedValueOnce(new Error('Estimation model unavailable. Retry automatic estimation.'));
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  expect(response.status).toBe(422);
  expect(insert).not.toHaveBeenCalledWith('quotation_plan_projects', expect.anything());
});
it('retries only pricing while preserving quotation item IDs and quantities', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  research.mockResolvedValueOnce({ rates: [{ id: 'market-1', name: 'Wardrobe', description: 'Proposed wardrobe', rate: 1300, unit: 'sqft', currency: 'INR', location: 'Bengaluru', source: 'market_estimate', verifiedAt: '2026-10-15', sourceUrl: 'https://supplier.example/rates', inclusions: 'Installed, excluding GST' }], limitations: [] });
  const response = await POST(request({ ...payload(), action: 'retry_pricing', projectId: '00000000-0000-4000-8000-000000000001' }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(generate).not.toHaveBeenCalled(); expect(research).toHaveBeenCalledTimes(1);
  expect(result.estimate.draft.sections[0].items[0]).toMatchObject({ id: storedEstimate.draft.sections[0].items[0].id, sftArea: 56, ratePerSft: 1300 });
});
it('uses reviewed global quotation references before paid market research', async () => {
  referenceRows = [{ id: 'admin-rate', section: 'Bedroom', product_name: 'Wardrobe', material: 'Laminate', specification: 'Reviewed specification', unit: 'sqft', recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5, tax: 'excluded', installation_included: true, location: 'Bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10), source_page: 2, notes: '', project_type: 'Apartment' }];
  const proposal = proposalFixture(); proposal.sections[0].items[0].rateId = 'admin-rate'; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1400);
  expect(result.estimate.evidence[0].price.source).toBe('admin_reference');
  expect(research).not.toHaveBeenCalled();
  expect(generate).toHaveBeenCalledWith(expect.objectContaining({ reviewedPatterns: [expect.objectContaining({ product: 'Wardrobe' })] }), expect.anything());
});
it('uses the user preferred library rate before global PDF rates and web research', async () => {
  libraryRows = [{ id: 'preferred', product_name: 'Wardrobe', product_details: '18mm plywood', preferred_rate: 1550, country_code: 'IN', updated_at: new Date().toISOString() }];
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1550);
  expect(result.estimate.evidence[0].price.id).toBe('library-preferred');
  expect(research).not.toHaveBeenCalled();
});
it('finds preferred rates beyond the first 500 owner library entries', async () => {
  libraryRows = Array.from({ length: 500 }, (_, index) => ({ id: `other-${index}`, product_name: `Other ${index}`, preferred_rate: null }));
  libraryRows.push({ id: 'last', product_name: 'Wardrobe', product_details: '18mm plywood', preferred_rate: 1490, updated_at: new Date().toISOString() });
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.evidence[0].price.id).toBe('library-last');
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1490);
  expect(research).not.toHaveBeenCalled();
});
it('fills missing full-interior painting prices through research and calculates plan-based work dimensions', async () => {
  const input = payload(); input.brief = { ...input.brief, automatic: true };
  research.mockReset();
  research.mockImplementation(async (input: { products: { name: string; specification: string }[] }) => ({ rates: input.products.filter(row => row.name === 'Wall painting').map(row => ({ id: 'paint', name: row.name, description: row.specification, rate: 25, unit: 'sqft', source: 'market_estimate', location: 'Bengaluru', currency: 'INR', verifiedAt: new Date().toISOString(), sourceUrl: 'https://supplier.example/paint', inclusions: 'Installed, GST excluded' })), limitations: [] }));
  const response = await POST(request(input));
  expect(response.status).toBe(200);
  const result = await response.json();
  const painting = toQuotation(result.estimate.draft, true)[0].items.find(item => item.productName === 'Wall painting');
  expect(painting).toMatchObject({ widthFt: 44, heightFt: 10, sftArea: 440, ratePerSft: 25, amount: 11000 });
  expect(result.estimate.evidence.find(row => row.itemId === painting.id).price.source).toBe('market_estimate');
});
it('fills a product key from the live catalogue basis before market research', async () => {
  referenceRows = [{ id: 'admin-tv', product_name: 'TV Unit', material: 'Laminate', specification: '18mm plywood', unit: 'sqft',
    recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 1, source_count: 1,
    tax: 'unknown', installation_included: false, location: 'bangalore', currency: 'INR', price_date: '2026-10-15' }];
  const proposal = proposalFixture();
  Object.assign(proposal.sections[0].items[0], { productName: 'tv_unit', description: 'Proposed TV unit', rateId: null });
  generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(estimate.draft.sections[0].items[0].ratePerSft).toBe(1400);
  expect(estimate.evidence[0].price).toMatchObject({ source: 'admin_reference', confidence: 'low', match: { type: 'close' } });
  expect(estimate.evidence[0].price.basisWarnings).toHaveLength(2);
  expect(research).not.toHaveBeenCalled();
});
it('calculates a live-style base unit reference through measurement completion and editor export', async () => {
  referenceRows = [{ id: 'base-reference', product_name: 'base unit', material: '18mm ply BWP IS 710 grade with 1mm laminate, soft close and shelves installed', specification: '56.16 sqft', unit: 'sqft',
    recent_rate: '1200.00', recent_low: '1200.00', recent_high: '1200.00', recent_source_count: 1, source_count: 1,
    tax: 'unknown', installation_included: true, location: 'bangalore', currency: 'INR', price_date: '2026-10-15' }];
  const proposal = proposalFixture();
  Object.assign(proposal.sections[0].items[0], { productName: 'Kitchen base cabinets', description: '18mm ply BWP IS 710 grade with 1mm laminate, soft close and shelves installed; retain sink clearance.', rateId: null, quantity: null, measurementStatus: 'unknown' });
  generate.mockResolvedValueOnce(proposal);
  const generated = await POST(request(payload()));
  expect(generated.status).toBe(200);
  storedEstimate = (await generated.json()).estimate;
  const item = storedEstimate!.draft.sections[0].items[0];
  expect(item).toMatchObject({ ratePerSft: 1200, sftArea: null });
  expect(storedEstimate!.totals.total).toBe(0);
  expect(research).not.toHaveBeenCalled();
  const completed = await POST(request({ action: 'complete', projectId: '00000000-0000-4000-8000-000000000001', changes: [{ itemId: item.id, widthFt: null, heightFt: null, areaSqft: workAreaSqft('feet', 18.72, 3), ratePerSft: null }] }));
  expect(completed.status).toBe(200);
  const { estimate } = await completed.json();
  expect(estimate.incomplete).toBe(false);
  expect(estimate.totals).toEqual({ subtotal: 67392, discount: 3369.6, tax: 11524.03, total: 75546.43 });
  expect(reviewDraft(estimate.draft)).toMatchObject({ missing: [], ...estimate.totals });
  const exported = toQuotation(estimate.draft)[0].items[0];
  expect(exported).toMatchObject({ sftArea: 56.16, widthFt: 0, heightFt: 0, ratePerSft: 1200, amount: 67392 });
  expect(exported.productDetails).toContain('retain sink clearance');
  expect(exported.productDetails).not.toContain('Source tax treatment');
  expect(estimate.evidence[0].price.basisWarnings).toContain('Source tax treatment: unknown. The reference rate is reused unchanged; confirm tax before applying the quotation\'s GST to avoid double counting.');
  expect(estimate.evidence[0].price.source).toBe('admin_reference');
});
it('rejects a model-selected price ID for an incompatible material', async () => {
  referenceRows = [{ id: 'wrong-material', product_name: 'Wardrobe', material: '18mm plywood laminate', specification: '', unit: 'sqft', recent_rate: 1400, recent_low: 1400, recent_high: 1400, recent_source_count: 1, tax: 'unknown', installation_included: false, location: 'bangalore', currency: 'INR', price_date: '2026-10-15' }];
  const proposal = proposalFixture(); Object.assign(proposal.sections[0].items[0], { description: '12mm MDF acrylic wardrobe', rateId: 'wrong-material' });
  generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect((await response.json()).estimate.draft.sections[0].items[0].ratePerSft).toBeNull();
});
it('automatically prices an empty catalogue using retrieved market evidence', async () => {
  research.mockResolvedValueOnce({ rates: [{ id: 'market-1', name: 'Wardrobe', description: 'Proposed wardrobe', rate: 1300, unit: 'sqft', currency: 'INR', location: 'Bengaluru', source: 'market_estimate', verifiedAt: '2026-10-15', sourceUrl: 'https://supplier.example/rates', inclusions: 'Installed, excluding GST' }], limitations: [] });
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1300);
  expect(result.estimate.totals.subtotal).toBe(72800);
  expect(result.estimate.incomplete).toBe(false);
});
it('matches prices beyond the first catalogue page and outside the model context', async () => {
  const reference = { section: 'Bedroom', material: 'laminate', specification: 'reviewed specification', unit: 'sqft',
    recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5,
    tax: 'excluded', installation_included: true, location: 'bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10) };
  referenceRows = Array.from({ length: 500 }, (_, index) => ({ ...reference, id: `unrelated-${index}`, product_name: `Other ${index}` }));
  referenceRows.push({ ...reference, id: 'last-page', product_name: 'Wardrobe' });
  const proposal = proposalFixture(); proposal.sections[0].items[0].description = 'laminate. reviewed specification';
  proposal.sections[0].items[0].rateId = null; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.evidence[0].price).toMatchObject({ id: 'last-page', rate: 1400 });
  expect(research).not.toHaveBeenCalled();
});
it('generates large plans in small batches and includes every confirmed field despite sparse model output', async () => {
  const input = payload();
  input.analysis.rooms = Array.from({ length: 25 }, (_, index) => ({ ...planFixture().rooms[0], name: `Bedroom ${index + 1}` }));
  input.brief.roomNames = input.analysis.rooms.map(room => room.name);
  const brief = { ...input.brief, roomWork: input.analysis.rooms.map(room => defaultRoomWork(room, 'complete')) };
  generate.mockImplementation(async ({ rooms }) => ({ sections: [{ ...proposalFixture().sections[0], title: rooms[0].name, roomName: rooms[0].name }], assumptions: [] }));
  const response = await POST(request({ ...input, brief }));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(generate).toHaveBeenCalledTimes(7);
  expect(generate.mock.calls.every(([context]) => context.rooms.length <= 4)).toBe(true);
  expect(estimate.draft.sections).toHaveLength(25);
  expect(estimate.draft.sections.flatMap((section: { items: unknown[] }) => section.items)).toHaveLength(75);
  expect(estimate.scopeGaps).toEqual([]);
});
it('uses a labelled detail-based close reference when exact pricing and market evidence are missing', async () => {
  referenceRows = [{ id: 'close-reference', section: 'Bedroom', product_name: 'Wardrobe', material: 'Laminate', specification: '18mm plywood', unit: 'sqft',
    recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5,
    tax: 'excluded', installation_included: true, location: 'bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10) }];
  const proposal = proposalFixture(); proposal.sections[0].items[0].description = '18mm plywood laminate wardrobe with shelving';
  proposal.sections[0].items[0].rateId = null; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(estimate.evidence[0].price).toMatchObject({ rate: 1400, confidence: 'low', match: { type: 'close' } });
  expect(estimate.draft.sections[0].items[0].productDetails).toBe(proposal.sections[0].items[0].description);
});
it('does not charge or save an estimate when market research fails', async () => {
  research.mockRejectedValueOnce(new Error('private upstream billing details'));
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  expect(response.status).toBe(422);
  expect((await response.json()).error).toBe("We're facing a technical issue. We'll be back soon.");
  expect(insert).not.toHaveBeenCalled();
  expect(rpc.mock.calls.some(([name]) => name === 'debit_coins')).toBe(false);
});

it('does not search when the city is unknown', async () => {
  const input = payload(); input.brief.location = 'Unknown';
  const response = await POST(request(input));
  expect(response.status).toBe(200); expect(research).not.toHaveBeenCalled();
  expect((await response.json()).estimate.assumptions.join()).toContain('city is unknown');
});
it('requires a valid user before touching storage, data or provider', async () => {
  expect((await POST(request(payload(), false))).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('expired') });
  expect((await POST(request(payload()))).status).toBe(401);
  expect(from).not.toHaveBeenCalled(); expect(OpenAIFloorPlanProvider).not.toHaveBeenCalled();
});
it('automatically switches metric profiles to imperial with owner-scoped persistence', async () => {
  metricProfile = true;
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect(profileUpdate).toHaveBeenCalledWith({ measurement_system: 'imperial' });
  expect(eq).toHaveBeenCalledWith('profiles', 'id', 'owner');
  expect(await response.json()).toMatchObject({ measurementSystem: 'imperial', measurementChanged: true });
});
it('does not generate mislabeled estimates if the automatic measurement switch fails', async () => {
  metricProfile = true; measurementUpdateFails = true;
  const response = await POST(request(payload()));
  expect(response.status).toBe(422);
  expect((await response.json()).error).toContain('automatically');
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled();
});
it('leaves an existing imperial setting alone', async () => {
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect(profileUpdate).not.toHaveBeenCalled();
});
it('enforces rate limits before reading a plan', async () => {
  limit.mockResolvedValueOnce({ success: false });
  expect((await POST(request(payload()))).status).toBe(429);
  expect(analyse).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
});
it('denies another account’s project before generating', async () => {
  projectExists = false;
  const response = await POST(request({ ...payload(), projectId: '00000000-0000-4000-8000-000000000001' }));
  expect(response.status).toBe(403); expect(eq).toHaveBeenCalledWith('quotation_plan_projects', 'user_id', 'owner');
  expect(generate).not.toHaveBeenCalled();
});
it('ignores arbitrary rates from the caller and stores tenant-scoped evidence', async () => {
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.incomplete).toBe(true);
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBeNull();
  expect(insert).toHaveBeenCalledWith('quotation_plan_projects', expect.objectContaining({ user_id: 'owner' }));
  expect(eq).toHaveBeenCalledWith('item_usage_patterns', 'user_id', 'owner');
  expect(createClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ global: { headers: { Authorization: 'Bearer session' } } }));
});
it('rejects invalid messages and oversized chunked bodies before provider work', async () => {
  expect((await POST(request({ ...payload(), brief: { ...briefFixture(), budget: -1 } }))).status).toBe(400);
  const response = await POST(request({ padding: 'x'.repeat(1048577) }));
  expect(response.status).not.toBe(200); expect(generate).not.toHaveBeenCalled();
});
it('validates actual bytes and cleans up private uploads on analysis failure', async () => {
  const form = new FormData(); form.append('files', new File(['%PDF-1.7\ncontent\n%%EOF'], 'plan.pdf', { type: 'text/plain' }));
  analyse.mockRejectedValueOnce(new Error('Unreadable plan'));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(422);
  expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\//), expect.any(Uint8Array), expect.objectContaining({ contentType: 'application/pdf' }));
  expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner\//)]);
  expect(rpc.mock.calls.some(([name]) => name === 'debit_coins')).toBe(false);
  expect(insert).not.toHaveBeenCalled();
});
it('rejects a renamed executable without storing it', async () => {
  const form = new FormData(); form.append('files', new File(['<script>bad</script>'], 'plan.png', { type: 'image/png' }));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(422); expect(upload).not.toHaveBeenCalled();
});

it('does not charge coins or expose internal details when automatic estimation fails', async () => {
  autoComplete.mockRejectedValueOnce(new Error('OpenAI billing exhausted: secret model'));
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  const body = await response.json();
  expect(response.status).toBe(422);
  expect(body.error).toBe("We're facing a technical issue. We'll be back soon.");
  expect(rpc.mock.calls.some(([name]) => name === 'debit_coins')).toBe(false);
});
it('returns a delivery receipt after saving the estimate without deducting coins before display', async () => {
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ delivery: { amount: 20, paid: false, ready: true } });
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
  expect(rpc).not.toHaveBeenCalledWith('confirm_quotation_coin_delivery', expect.anything());
  const statusIndex = rpc.mock.calls.findIndex(([name]) => name === 'get_quotation_coin_delivery');
  expect(rpc.mock.invocationCallOrder[statusIndex]).toBeGreaterThan(insert.mock.invocationCallOrder[0]);
});
it('does not charge when switching measurement settings fails', async () => {
  metricProfile = true; measurementUpdateFails = true;
  const response = await POST(request({ ...payload(), brief: { ...briefFixture(), automatic: true } }));
  expect(response.status).toBe(422);
  expect(rpc.mock.calls.some(([name]) => name === 'debit_coins')).toBe(false);
});

it('does not deduct coins during generation even without automatic mode', async () => {
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect((await response.json()).delivery.amount).toBe(20);
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
});
it('keeps delivery confirmation separate and returns an actionable insufficient-balance error', async () => {
  rpc.mockImplementation(async (name, args) => name === 'confirm_quotation_coin_delivery' ? { data: null, error: { message: 'Insufficient coins' } } : defaultRpc(name,args));
  const response = await POST(request({ action: 'confirm_delivery', projectId: '11111111-1111-4111-8111-111111111111' }));
  expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({ code: 'COINS_REQUIRED', error: expect.stringContaining('price is ready') });
  expect(generate).not.toHaveBeenCalled();
});
it('reports wallet outages as service failures instead of insufficient coins', async () => {
  rpc.mockImplementation(async (name,args) => name === 'confirm_quotation_coin_delivery' ? { data: null, error: { message: 'Database unavailable' } } : defaultRpc(name,args));
  const response = await POST(request({ action: 'confirm_delivery', projectId: '11111111-1111-4111-8111-111111111111' }));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: 'COIN_CONFIRMATION_PENDING', error: expect.stringContaining('price is ready') });
});

it('does not deduct coins after successful floor-plan analysis', async () => {
  walletBalance = 40;
  const form = new FormData();
  form.append('files', new File(['%PDF-1.7\ncontent\n%%EOF'], 'plan.pdf', { type: 'application/pdf' }));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(200);
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
  expect(rpc).not.toHaveBeenCalledWith('confirm_quotation_coin_delivery', expect.anything());
});

it.each([0, 5, 39])('blocks floor-plan uploads with %i coins before storage or AI', async balance => {
  walletBalance = balance;
  const form = new FormData(); form.append('files', new File(['%PDF-1.7\ncontent\n%%EOF'], 'plan.pdf', { type: 'application/pdf' }));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({ code: 'COINS_REQUIRED', requiredCoins: 40, balance });
  expect(upload).not.toHaveBeenCalled(); expect(analyse).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
});
it.each([0, 5, 19])('blocks new quotations with %i coins before AI or persistence', async balance => {
  walletBalance = balance;
  const response = await POST(request(payload()));
  expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({ code: 'COINS_REQUIRED', requiredCoins: 20, balance });
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled(); expect(autoComplete).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled();
});
it('allows a new quotation with exactly 20 coins', async () => {
  walletBalance = 20;
  expect((await POST(request(payload()))).status).toBe(200);
});
it('fails closed before AI when the wallet cannot be read', async () => {
  walletError = true;
  expect((await POST(request(payload()))).status).toBe(422);
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled();
});

it('does not require more coins to continue an already-paid floor-plan project', async () => {
  projectPaid = true;
  walletBalance = 0;
  const response = await POST(request({ ...payload(), projectId: '00000000-0000-4000-8000-000000000001' }));
  expect(response.status).toBe(200);
  expect(rpc).not.toHaveBeenCalledWith('debit_coins', expect.anything());
});

it('uses the same project receipt when delivery confirmation is retried', async () => {
  const payload = { action: 'confirm_delivery', projectId: '11111111-1111-4111-8111-111111111111' };
  expect((await POST(request(payload))).status).toBe(200);
  expect((await POST(request(payload))).status).toBe(200);
  expect(rpc.mock.calls.filter(([name]) => name === 'confirm_quotation_coin_delivery').map(([, args]) => args)).toEqual([{ p_project_id: payload.projectId }, { p_project_id: payload.projectId }]);
  expect(generate).not.toHaveBeenCalled();
});

it('checks the final 40-coin fee before generating an unpaid uploaded plan, without deducting it', async () => {
  walletBalance=39; projectCost=40;
  const response=await POST(request({ ...payload(),projectId:'11111111-1111-4111-8111-111111111111' }));
  expect(response.status).toBe(402);
  expect(generate).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith('confirm_quotation_coin_delivery',expect.anything());
});
