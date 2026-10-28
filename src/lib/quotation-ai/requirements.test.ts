import { excludedWork, exclusionsForBrief, explicitNoteExclusions, itemFinishTier, itemRequirements, mergeExclusions, requestedWork, requirementsSchema, resolveRequirementsRooms } from './requirements';
const rooms = [{ name: 'Bedroom', kind: 'bedroom' }, { name: 'Kitchen', kind: 'kitchen' }];
it('matches formatting differences, combined-space labels and unique room-kind aliases', () => {
  const planRooms = [{ name: 'Bedroom 1', kind: 'bedroom' }, { name: 'Living & Dining', kind: 'living' }, { name: 'Kitchen + Utility', kind: 'kitchen' }, { name: 'Toilet', kind: 'bathroom' }];
  const result = resolveRequirementsRooms(requirementsSchema.parse({ exclusions: [{ roomName: 'Dining', workKeys: ['painting'] }], roomNames: ['bedroom1','Living and Dining room','Utility','Bathroom'] }), planRooms);
  expect(result.roomNames).toEqual(['Bedroom 1','Living & Dining','Kitchen + Utility','Toilet']);
  expect(result.exclusions[0].roomName).toBe('Living & Dining');
});
it('expands explicit room groups and refuses ambiguous or invented rooms', () => {
  const planRooms = [{ name: 'Bedroom 1', kind: 'bedroom' }, { name: 'Bedroom 2', kind: 'bedroom' }];
  expect(resolveRequirementsRooms(requirementsSchema.parse({ exclusions: [], roomNames: ['all bedrooms'] }), planRooms).roomNames).toEqual(['Bedroom 1','Bedroom 2']);
  expect(() => resolveRequirementsRooms(requirementsSchema.parse({ exclusions: [], roomNames: ['Bedroom'] }), planRooms)).toThrow('more than one');
  expect(() => resolveRequirementsRooms(requirementsSchema.parse({ exclusions: [], roomNames: ['Gym'] }), planRooms)).toThrow('could not be matched');
});
it('does not let older design notes contradict the primary Explain it your way brief', () => {
  const exclusions = exclusionsForBrief({ requestNotes: 'Include wall painting.', design: { notes: 'No wall painting.' } }, rooms);
  expect(excludedWork('Wall painting', 'Bedroom', exclusions)).toBe(false);
});
it('preserves the interpreted material details and gives item/room quality precedence over defaults', () => {
  const requirements = requirementsSchema.parse({ exclusions: [], roomRequirements: [{ roomName: 'Bedroom', finishTier: 'Premium', items: [{ workKey: 'wardrobe', finishTier: 'Luxury', details: 'Walnut veneer, brass handles and Blum hardware.' }], includedWorkKeys: ['study_storage'] }] });
  expect(itemFinishTier('Wardrobe', 'Bedroom', requirements, 'Basic')).toBe('Luxury');
  expect(itemFinishTier('Loft storage', 'Bedroom', requirements, 'Basic')).toBe('Premium');
  expect(itemFinishTier('Kitchen base cabinets', 'Kitchen', requirements, 'Basic')).toBe('Basic');
  expect(itemRequirements('Wardrobe', 'Bedroom', requirements)).toContain('Blum');
  expect(requestedWork('Bedroom', requirements)).toEqual(['study_storage','wardrobe']);
});

it.each(['No false ceiling or wall painting.', 'No wall painting and no seling.', "I don't need wall painting or ceiling.", 'Wall painting and ceiling not required.'])('recognises clear exclusion lists: %s', notes => {
  const result = explicitNoteExclusions(notes, rooms);
  for (const room of rooms) {
    expect(excludedWork('Wall painting', room.name, result)).toBe(true);
    expect(excludedWork('False ceiling', room.name, result)).toBe(true);
    expect(excludedWork('Wardrobe', room.name, result)).toBe(false);
  }
});
it.each(['No dark paint.', 'No glossy finish on wall painting.', 'Do not exclude painting.', 'No painting except in the kitchen.', 'No painting in Bedroom.', 'Include painting but no ceiling.'])('does not globally exclude painting for nuanced notes: %s', notes => {
  expect(excludedWork('Wall painting', 'Bedroom', explicitNoteExclusions(notes, rooms))).toBe(false);
});
it('keeps semantic room-specific exclusions local and merges without duplicates', () => {
  const result = mergeExclusions([{ roomName: 'Bedroom', workKeys: ['painting'] }], [{ roomName: 'Bedroom', workKeys: ['painting','ceiling'] }]);
  expect(result[0].workKeys).toEqual(['painting','ceiling']);
  expect(excludedWork('Wall painting', 'Bedroom', result)).toBe(true);
  expect(excludedWork('Wall painting', 'Kitchen', result)).toBe(false);
  expect(excludedWork('Kitchen base cabinets', 'Kitchen', [{ roomName: 'Kitchen', workKeys: ['base_cabinets'] }])).toBe(true);
});
