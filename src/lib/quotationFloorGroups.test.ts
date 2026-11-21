import { floorRoomTitle, groupFloorSections, nextQuotationFloor, splitFloorRoomTitle } from './quotationFloorGroups';

it('assigns initial rooms to ground floor only when a floor count is selected', () => {
  const sections = [{ id: 'one', title: 'Kitchen', items: [{ amount: 1200 }] }];
  expect(groupFloorSections(sections, 'Residential')).toEqual(sections);
  expect(groupFloorSections(sections, 'Residential | Floors: G+1')[0].title).toBe('Ground Floor — Kitchen');
  expect(sections[0].title).toBe('Kitchen');
});
it('groups rooms in floor order while preserving IDs, item values and room order within each floor', () => {
  const rows = [
    { id: 'upper', title: floorRoomTitle('First Floor', 'Bedroom'), items: [{ amount: 900 }] },
    { id: 'lower1', title: floorRoomTitle('Ground Floor', 'Kitchen'), items: [{ amount: 1200 }] },
    { id: 'lower2', title: floorRoomTitle('Ground Floor', 'Living'), items: [{ amount: 300 }] },
  ];
  const grouped = groupFloorSections(rows, 'Residential | Floors: G+1');
  expect(grouped).toEqual([rows[1], rows[2], rows[0]]);
  expect(grouped.flatMap(row => row.items).reduce((sum, item) => sum + item.amount, 0)).toBe(2400);
});
it('offers the next unused configured floor by name and stops at the selected limit', () => {
  const type = 'Residential | Floors: G+2';
  const rows = [{ title: floorRoomTitle('Ground Floor', 'Kitchen') }];
  expect(nextQuotationFloor(rows, type)).toBe('First Floor');
  rows.push({ title: floorRoomTitle('First Floor', 'Bedroom') });
  expect(nextQuotationFloor(rows, type)).toBe('Second Floor');
  rows.push({ title: floorRoomTitle('Second Floor', 'Bedroom') });
  expect(nextQuotationFloor(rows, type)).toBeUndefined();
});
it('retains existing upper-floor rooms after the project floor count is reduced', () => {
  const rows = [{ title: floorRoomTitle('Second Floor', 'Study'), id: 'saved' }];
  expect(groupFloorSections(rows, 'Residential | Floors: Ground Floor')).toEqual(rows);
});
it('round-trips saved floor-qualified titles and leaves legacy room titles alone', () => {
  expect(splitFloorRoomTitle(floorRoomTitle('First Floor', 'Kitchen — East'))).toEqual({ floor: 'First Floor', room: 'Kitchen — East' });
  expect(splitFloorRoomTitle('Kitchen')).toEqual({ floor: '', room: 'Kitchen' });
  expect(splitFloorRoomTitle(floorRoomTitle('Ground Floor', ''))).toEqual({ floor: 'Ground Floor', room: '' });
});
