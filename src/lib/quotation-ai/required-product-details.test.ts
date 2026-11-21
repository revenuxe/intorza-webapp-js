import { requiredProductDetails } from './required-product-details';

it('incorporates a layout instruction without replacing the actual product specification', () => {
  expect(requiredProductDetails("Base cabinets should be arranged in a U-shaped layout as per the customer's request.", 'Base storage cabinets with laminate finish and soft-close hardware.'))
    .toEqual({ description: 'U-shaped layout. Base storage cabinets with laminate finish and soft-close hardware.', preserveSpecifications: true });
});
it('keeps explicit material and hardware requirements ahead of incompatible model details', () => {
  expect(requiredProductDetails('Marine plywood carcass with Blum hardware and matte walnut finish.', '18mm MDF with standard hardware'))
    .toEqual({ description: 'Marine plywood carcass with Blum hardware and matte walnut finish.', preserveSpecifications: false });
});
it('does not classify a layout plus a material requirement as layout only', () => {
  expect(requiredProductDetails('U-shaped kitchen with marine plywood.', 'MDF cabinets').preserveSpecifications).toBe(false);
});
it('does not duplicate an existing layout description', () => {
  expect(requiredProductDetails('U-shaped layout', 'U-shaped base cabinets with storage.').description).toBe('U-shaped base cabinets with storage.');
});
