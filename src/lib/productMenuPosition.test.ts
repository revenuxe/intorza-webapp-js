import { productMenuPosition } from './productMenuPosition';
it('anchors below the input instead of clamping over it', () => {
  const menu = productMenuPosition({ top: 400, bottom: 440, left: 30, width: 300 }, { top: 0, left: 0, width: 393, height: 800 }, 64);
  expect(menu.top).toBe(446); expect(menu.transform).toBeUndefined(); expect(menu.width).toBe(300);
});
it('flips above the input when a keyboard leaves little space underneath', () => {
  const menu = productMenuPosition({ top: 350, bottom: 390, left: 30, width: 300 }, { top: 0, left: 0, width: 393, height: 450 }, 64);
  expect(menu.top).toBe(344); expect(menu.transform).toBe('translateY(-100%)');
  expect(menu.maxHeight).toBeLessThanOrEqual(350 - 64 - 8 - 6);
});
it('respects a panned visible viewport and keeps the menu inside its horizontal edges', () => {
  const menu = productMenuPosition({ top: 350, bottom: 390, left: 200, width: 300 }, { top: 100, left: 20, width: 280, height: 350 });
  expect(menu.left).toBeGreaterThanOrEqual(28);
  expect(menu.left + menu.width).toBeLessThanOrEqual(292);
  expect(menu.maxHeight).toBeLessThanOrEqual(350 - 108 - 6);
});
it('hides suggestions if neither side has usable space', () => {
  const menu = productMenuPosition({ top: 80, bottom: 120, left: 20, width: 200 }, { top: 60, left: 0, width: 393, height: 100 }, 64);
  expect(menu.visibility).toBe('hidden');
});
