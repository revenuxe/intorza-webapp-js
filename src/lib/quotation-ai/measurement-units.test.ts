import { workAreaSqft } from './measurement-units';
it('converts feet dimensions, sqft, sqm and metre dimensions to a consistent sqft area', () => {
  expect(workAreaSqft('feet', 8, 7)).toBe(56);
  expect(workAreaSqft('sqft', 56)).toBe(56);
  expect(workAreaSqft('sqm', 10)).toBe(107.6391);
  expect(workAreaSqft('metres', 2, 5)).toBe(107.6391);
});
it('never converts a lone length into area or accepts invalid measurements', () => {
  expect(() => workAreaSqft('feet', 8)).toThrow('both');
  expect(() => workAreaSqft('metres', 8)).toThrow('both');
  expect(() => workAreaSqft('sqft', -1)).toThrow('positive');
  expect(() => workAreaSqft('sqm', Infinity)).toThrow('positive');
});
