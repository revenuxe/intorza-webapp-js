import "@testing-library/jest-dom";

if (typeof window !== 'undefined') {
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

if (typeof (globalThis as any).requestAnimationFrame !== "function") {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Stub fetch so PDF preview tests never touch the real network.
(globalThis as any).fetch = () =>
  Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

// URL.createObjectURL isn't in jsdom.
if (!("createObjectURL" in URL)) {
  (URL as any).createObjectURL = () => "blob:mock";
  (URL as any).revokeObjectURL = () => {};
}
}
