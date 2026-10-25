import { defaultRoomWork, ensureRoomWorkCoverage, roomWorkOptions } from './room-work';
import { buildEstimate, generatedSchema, preserveRefinedItems, resolveFinishTier, scopedRooms } from './floor-plan';
import { appendFloorPlanEstimate } from './apply-estimate';
import { fromQuotation } from './domain';
import { completeEstimate } from './floor-plan';
import { planFixture, briefFixture, draftFixture, proposalFixture } from '@/test/floor-plan-fixtures';

it('offers work specific to detected room types and filters kitchen/bedroom-only scopes', () => {
  const room = planFixture().rooms[0];
  expect(roomWorkOptions(room, 'bedrooms').map(option => option.key)).toContain('wardrobe');
  expect(roomWorkOptions(room, 'bedrooms').map(option => option.key)).not.toContain('base_cabinets');
  expect(roomWorkOptions(room, 'kitchen-wardrobes').map(option => option.key)).toEqual(['wardrobe', 'loft']);
  const plan = { ...planFixture(), rooms: [room, { ...room, name: 'Kitchen', kind: 'kitchen' as const }] };
  expect(scopedRooms(plan, { scope: 'kitchen', roomNames: ['Bedroom','Kitchen'] }).map(room => room.name)).toEqual(['Kitchen']);
  expect(scopedRooms(plan, { scope: 'bedrooms', roomNames: ['Bedroom','Kitchen'] }).map(room => room.name)).toEqual(['Bedroom']);
});
it('resolves recommended finish against the budget and known estimate without changing explicit tiers', () => {
  expect(resolveFinishTier('Recommend', null, null)).toBe('Standard');
  expect(resolveFinishTier('Recommend', 70000, 100000)).toBe('Basic');
  expect(resolveFinishTier('Recommend', 200000, 100000)).toBe('Premium');
  expect(resolveFinishTier('Recommend', 100000, 100000)).toBe('Standard');
  expect(resolveFinishTier('Luxury', 1, 100000)).toBe('Luxury');
});
it('fills every selected work field when AI returns only one item, preserving unknowns and user details', () => {
  const plan = planFixture(), brief = { ...briefFixture(), roomWork: [defaultRoomWork(plan.rooms[0], 'complete')] };
  brief.roomWork[0].items[0].details = 'Sliding shutters; retain existing window access.';
  const raw = ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief);
  expect(raw.sections[0].items.map(item => item.productName)).toEqual(['Wardrobe','False ceiling','Wall painting']);
  const result = buildEstimate(raw, plan, brief, [], draftFixture());
  expect(result.draft.sections[0].items[0]).toMatchObject({ sftArea: null, ratePerSft: null });
  expect(result.draft.sections[0].items[0].productDetails).toContain('Sliding shutters');
  expect(result.draft.sections[0].items[1].sftArea).toBe(120);
  expect(result.scopeGaps).toEqual([]);
});
it('uses confirmed work measurements rather than the room floor area', () => {
  const plan = planFixture(), answer = defaultRoomWork(plan.rooms[0], 'complete');
  answer.items[0] = { ...answer.items[0], widthFt: 8, heightFt: 7 };
  answer.items.find(item => item.key === 'ceiling')!.areaSqft = 50;
  const brief = { ...briefFixture(), roomWork: [answer] };
  const result = buildEstimate(ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief), plan, brief, [], draftFixture());
  expect(result.draft.sections[0].items[0]).toMatchObject({ widthFt: 8, heightFt: 7, measurementMode: 'dimensions', sftArea: null });
  expect(result.draft.sections[0].items[1].sftArea).toBe(50);
});
it('transfers more than 12 rooms and 60 items to the editor without dropping pending rows', () => {
  const plan = { ...planFixture(), rooms: Array.from({ length: 25 }, (_, index) => ({ ...planFixture().rooms[0], name: `Bedroom ${index + 1}` })) };
  const brief = { ...briefFixture(), roomNames: plan.rooms.map(room => room.name), roomWork: plan.rooms.map(room => defaultRoomWork(room, 'complete')) };
  const proposal = ensureRoomWorkCoverage({ sections: [], assumptions: [] }, plan.rooms, brief);
  const estimate = buildEstimate(proposal, plan, brief, [], draftFixture());
  const applied = appendFloorPlanEstimate(draftFixture(), estimate.draft);
  expect(applied.sections).toHaveLength(25);
  expect(applied.sections.flatMap(section => section.items)).toHaveLength(75);
  expect(fromQuotation(applied.draft.project, applied.sections, applied.draft.pricing).sections.flatMap(section => section.items)).toHaveLength(75);
});
it('refining an older estimate cannot remove omitted items or manual edits', () => {
  const plan = planFixture(), brief = briefFixture(), proposal = proposalFixture();
  proposal.sections[0].items.push({ ...proposal.sections[0].items[0], productName: 'Loft storage', rateId: null });
  const previous = buildEstimate(proposal, plan, brief, [], draftFixture());
  const original = previous.draft.sections[0].items[0];
  original.ratePerSft = 1777;
  previous.evidence[0].price = { id: 'manual', name: original.productName, description: original.productDetails, source: 'manual', rate: 1777, unit: 'sqft', currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(), sourceUrl: null, inclusions: '' };
  const next = buildEstimate(proposalFixture(), plan, brief, [], draftFixture());
  const retained = preserveRefinedItems(previous, next, brief);
  expect(retained.draft.sections[0].items).toHaveLength(2);
  expect(retained.draft.sections[0].items[0]).toMatchObject({ id: original.id, ratePerSft: 1777 });
});
it('keeps separately billed work visible without assigning an invented square-foot price', () => {
  const plan = planFixture(), answer = defaultRoomWork(plan.rooms[0], 'complete');
  answer.items.push({ key: 'electrical', widthFt: null, heightFt: null, areaSqft: null, details: 'Two socket relocations' });
  const brief = { ...briefFixture(), roomWork: [answer] };
  const result = buildEstimate(ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief), plan, brief, [], draftFixture());
  const electrical = result.draft.sections[0].items.find(item => item.productName === 'Electrical points')!;
  expect(electrical).toMatchObject({ sftArea: null, ratePerSft: null });
  expect(electrical.productDetails).toContain('Billing: piece; price separately');
  expect(appendFloorPlanEstimate(draftFixture(), result.draft).sections[0].items).toHaveLength(4);
});
it('rejects inconsistent yes/no work choices and preserves the confirmed design direction', () => {
  const plan = planFixture(), answer = defaultRoomWork(plan.rooms[0], 'complete');
  answer.decisions = Object.fromEntries(roomWorkOptions(plan.rooms[0], 'complete').map(option => [option.key, answer.items.some(item => item.key === option.key)]));
  const brief = { ...briefFixture(), roomWork: [answer], design: { coordinatedLook: true, retainExisting: true, notes: 'Retain existing bedroom flooring.' } };
  const result = ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief);
  expect(result.assumptions.join(' ')).toContain('Retain existing bedroom flooring');
  answer.decisions.wardrobe = false;
  expect(() => ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief)).toThrow('yes/no');
});
it('automatically covers every detected room without requiring user work answers', () => {
  const plan = planFixture();
  const brief = { ...briefFixture(), automatic: true };
  const result = ensureRoomWorkCoverage(generatedSchema.parse(proposalFixture()), plan.rooms, brief);
  expect(result.sections[0].items.map(item => item.productName)).toEqual(['Wardrobe','False ceiling','Wall painting','Loft storage']);
  expect(result.sections[0].items[0].quantity).toBe(56);
  expect(result.sections[0].items.find(item => item.productName === 'Loft storage').quantity).toBeNull();
});
it('keeps modular scope free of painting and respects explicit full-interior finish exclusions', () => {
  const plan = planFixture();
  const raw = generatedSchema.parse(proposalFixture());
  raw.sections[0].items.push({ ...raw.sections[0].items[0], productName: 'Wall painting' });
  const modular = ensureRoomWorkCoverage(raw, plan.rooms, { ...briefFixture(), scope: 'modular', automatic: true });
  expect(modular.sections[0].items.map(item => item.productName)).toEqual(['Wardrobe', 'Loft storage']);
  const excluded = ensureRoomWorkCoverage(raw, plan.rooms, { ...briefFixture(), automatic: true, requestNotes: 'No wall painting, skip false ceiling.' });
  expect(excluded.sections[0].items.map(item => item.productName)).toEqual(['Wardrobe', 'Loft storage']);
});
it('keeps automatic kitchen scope to quotation-supported cabinetry instead of generic finish work', () => {
  const plan = planFixture(); plan.rooms[0] = { ...plan.rooms[0], name: 'Kitchen', kind: 'kitchen' };
  const brief = { ...briefFixture(), scope: 'modular' as const, automatic: true, roomNames: ['Kitchen'] };
  const proposal = generatedSchema.parse({ sections: [{ ...proposalFixture().sections[0], title: 'Kitchen', roomName: 'Kitchen', items: [{ ...proposalFixture().sections[0].items[0], productName: 'Kitchen base cabinets' }] }], assumptions: [] });
  const result = ensureRoomWorkCoverage(proposal, plan.rooms, brief);
  expect(result.sections[0].items.map(item => item.productName)).toEqual(['Kitchen base cabinets', 'Kitchen wall cabinets', 'Kitchen countertop', 'Loft storage']);
});
it('keeps modular kitchen countertop and backsplash choices and includes countertop in automatic kitchen scope', () => {
  const plan = planFixture(); plan.rooms[0] = { ...plan.rooms[0], name: 'Kitchen', kind: 'kitchen' };
  const options = roomWorkOptions(plan.rooms[0], 'modular');
  expect(options.map(option => option.key)).toContain('countertop');
  expect(options.map(option => option.key)).toContain('backsplash');
  const brief = { ...briefFixture(), scope: 'modular' as const, automatic: true, roomNames: ['Kitchen'] };
  const result = ensureRoomWorkCoverage({ sections: [], assumptions: [] }, plan.rooms, brief);
  expect(result.sections[0].items.map(item => item.productName)).toContain('Kitchen countertop');
  expect(result.sections[0].items.map(item => item.productName)).not.toContain('Kitchen backsplash');
});
it('completes unknown work using direct sqft and transfers no feet dimensions to the quotation', () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].measurementStatus = 'unknown';
  const estimate = buildEstimate(proposal, planFixture(), briefFixture(), [], draftFixture());
  const completed = completeEstimate(estimate, [{ itemId: estimate.draft.sections[0].items[0].id, widthFt: null, heightFt: null, areaSqft: 56, ratePerSft: 1200 }]);
  const item = appendFloorPlanEstimate(draftFixture(), completed.draft).sections[0].items[0];
  expect(item).toMatchObject({ sftArea: 56, widthFt: 0, heightFt: 0, amount: 67200 });
});
