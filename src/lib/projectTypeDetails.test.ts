import { displayProjectTypeDetails, floorOptions, formatProjectTypeDetails, parseProjectTypeDetails, projectFloorNames } from './projectTypeDetails';

it('omits the Floors label from preview text without changing saved values', () => {
  expect(displayProjectTypeDetails('Residential - 2 BHK | Floors: G+1')).toBe('Residential - 2 BHK | G+1');
  expect(displayProjectTypeDetails('Residential | Floors: Ground Floor')).toBe('Residential | Ground Floor');
});
it('uses compact floor labels in previews without losing individual home layouts', () => {
  const saved = 'Residential | Floors: G+2 | Homes: Ground Floor=1 BHK; First Floor=2 BHK; Second Floor=2 BHK';
  expect(displayProjectTypeDetails(saved)).toBe('Residential | G+2 | G 1 BHK, 1F 2 BHK, 2F 2 BHK');
  expect(parseProjectTypeDetails(saved).floorSizes).toEqual({ 'Ground Floor': '1 BHK', 'First Floor': '2 BHK', 'Second Floor': '2 BHK' });
});
it('reads older part-of-home choices using the shorter label', () => {
  const saved = 'Residential | Floors: G+1 | Homes: First Floor=Part of same home';
  expect(parseProjectTypeDetails(saved).floorSizes).toEqual({ 'First Floor': 'Part of home' });
  expect(displayProjectTypeDetails(saved)).toBe('Residential | G+1 | 1F Part of home');
});

it.each(floorOptions)('preserves BHK and %s through quotation save/reload values', floors => {
  const details = { type: 'Residential', size: '2 BHK', floors };
  expect(parseProjectTypeDetails(formatProjectTypeDetails(details))).toEqual(details);
});
it.each(['Residential', 'Residential - 3 BHK', 'Office', 'Boutique Experience Center'])('keeps existing project types readable: %s', value => {
  expect(formatProjectTypeDetails(parseProjectTypeDetails(value))).toBe(value);
});
it('preserves floor selection when switching to a non-residential project and removes BHK', () => {
  const previous = parseProjectTypeDetails('Residential - 2 BHK | Floors: G+2');
  expect(formatProjectTypeDetails({ ...previous, type: 'Office' })).toBe('Office | Floors: G+2');
});
it('clears floors without clearing BHK', () => {
  const previous = parseProjectTypeDetails('Residential - Studio | Floors: Ground Floor');
  expect(formatProjectTypeDetails({ ...previous, floors: '' })).toBe('Residential - Studio');
});
it('saves different home layouts on ground and first floor without a building-wide BHK', () => {
  const details = { type: 'Residential', size: '', floors: 'G+1', floorSizes: { 'Ground Floor': '1 BHK', 'First Floor': '2 BHK' } };
  expect(parseProjectTypeDetails(formatProjectTypeDetails(details))).toEqual(details);
});
it('drops home layouts for removed floors and preserves layouts on remaining floors', () => {
  const value = formatProjectTypeDetails({ type: 'Residential', size: '', floors: 'Ground Floor', floorSizes: { 'Ground Floor': '1 BHK', 'First Floor': '2 BHK' } });
  expect(parseProjectTypeDetails(value).floorSizes).toEqual({ 'Ground Floor': '1 BHK' });
});
it('supports six independently described floors and non-residential home uses', () => {
  const floors = projectFloorNames('G+5');
  expect(floors).toHaveLength(6);
  const details = { type: 'Residential', size: '', floors: 'G+5', floorSizes: Object.fromEntries(floors.map((floor, index) => [floor, index === 0 ? 'Parking / No residence' : '3 BHK'])) };
  expect(parseProjectTypeDetails(formatProjectTypeDetails(details))).toEqual(details);
});
