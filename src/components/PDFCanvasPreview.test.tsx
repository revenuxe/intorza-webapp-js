import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

// Mock pdfjs-dist BEFORE importing the component under test.
const makeFakeDoc = (numPages: number) => ({
  numPages,
  getPage: vi.fn(async (n: number) => ({
    getViewport: ({ scale = 1 }: { scale?: number }) => ({
      width: 595 * scale,
      height: 842 * scale,
    }),
    render: () => ({ promise: Promise.resolve() }),
  })),
  destroy: vi.fn(),
});

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "test",
  getDocument: vi.fn(() => ({ promise: Promise.resolve(makeFakeDoc(3)) })),
}));

// URL.createObjectURL isn't in jsdom.
if (!("createObjectURL" in URL)) {
  (URL as any).createObjectURL = () => "blob:mock";
  (URL as any).revokeObjectURL = () => {};
}

// fetch shim
if (typeof globalThis.fetch !== "function") {
  (globalThis as any).fetch = () =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
}

// canvas.toBlob shim
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as any;
HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
  cb(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }));
} as any;

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
};

describe("PDFCanvasPreview scroll preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the user's scroll position when the PDF is regenerated after an edit", async () => {
    // Import lazily so mocks are applied first.
    const { PDFCanvasPreview } = await import("./PDFCanvasPreview");

    // Build a scrollable ancestor so the component's getScrollParent finds it.
    const Harness: React.FC<{ url: string; onActive: (i: number) => void }> = ({ url, onActive }) => (
      <div
        data-testid="scroll-root"
        style={{ height: 400, overflowY: "auto" }}
      >
        <PDFCanvasPreview
          pdfBlobUrl={url}
          zoom={100}
          onActivePageChange={onActive}
        />
      </div>
    );

    const onActive = vi.fn();
    const { rerender } = render(<Harness url="blob:v1" onActive={onActive} />);
    await flush();

    // Verify all 3 pages present after initial render.
    const pagesAfterLoad = await screen.findAllByTestId(/pdf-page-\d+/);
    expect(pagesAfterLoad.length).toBeGreaterThanOrEqual(3);

    // Simulate the user scrolling to page 2.
    const scrollRoot = screen.getByTestId("scroll-root");
    Object.defineProperty(scrollRoot, "scrollTop", { value: 900, writable: true, configurable: true });
    scrollRoot.dispatchEvent(new Event("scroll"));
    await flush();

    const scrollBeforeEdit = scrollRoot.scrollTop;
    expect(scrollBeforeEdit).toBeGreaterThan(0);

    // Simulate a style/terms edit → new PDF blob URL.
    rerender(<Harness url="blob:v2" onActive={onActive} />);
    await flush();
    await flush();

    // Regression assertion: scroll must NOT have snapped back to 0.
    // (Anchoring may nudge slightly but never to the top of doc.)
    expect(scrollRoot.scrollTop).toBeGreaterThan(0);
  });
});
