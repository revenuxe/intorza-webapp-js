import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Stable rAF for tests
if (!('requestAnimationFrame' in globalThis)) {
  // @ts-expect-error jsdom shim
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number;
  // @ts-expect-error jsdom shim
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}
