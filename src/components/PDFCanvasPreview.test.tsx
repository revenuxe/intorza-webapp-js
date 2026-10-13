import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import React from "react";

// Mock pdfjs-dist BEFORE importing the component under test.
let deferPageMetadata = false;
let pendingPageResolvers: Array<() => void> = [];

const makeFakePage = () => ({
  getViewport: ({ scale = 1 }: { scale?: number }) => ({
    width: 595 * scale,
    height: 842 * scale,
  }),
  render: () => ({ promise: Promise.resolve() }),
});

const makeFakeDoc = (numPages: number) => ({
  numPages,
  getPage: jest.fn((_n: number): Promise<ReturnType<typeof makeFakePage>> => {
    const page = makeFakePage();
    if (!deferPageMetadata) return Promise.resolve(page);
    return new Promise((resolve) => pendingPageResolvers.push(() => resolve(page)));
  }),
  destroy: jest.fn(),
});
let lastFakeDoc: ReturnType<typeof makeFakeDoc>;

jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "test",
  getDocument: jest.fn(() => {
    lastFakeDoc = makeFakeDoc(3);
    return { promise: Promise.resolve(lastFakeDoc) };
  }),
}));

// URL.createObjectURL isn't in jsdom.
if (!("createObjectURL" in URL)) {
  (URL as any).createObjectURL = () => "blob:mock";
  (URL as any).revokeObjectURL = () => {};
}

// fetch shim (always override — jsdom's fetch tries real network)
(globalThis as any).fetch = () =>
  Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

// canvas.toBlob shim
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({})) as any;
HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
  cb(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }));
} as any;

const flush = async (ms = 100) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};

describe("PDFCanvasPreview scroll preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deferPageMetadata = false;
    pendingPageResolvers = [];
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

    const onActive = jest.fn();
    const { rerender } = render(<Harness url="blob:v1" onActive={onActive} />);
    await flush(150);
    await flush(150);

    // Verify at least one page rendered after initial load.
    const pagesAfterLoad = await screen.findAllByTestId(/pdf-page-\d+/, {}, { timeout: 3000 });
    expect(pagesAfterLoad.length).toBeGreaterThanOrEqual(1);

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

  it("loads page dimensions concurrently instead of delaying the preview page by page", async () => {
    deferPageMetadata = true;
    const { PDFCanvasPreview } = await import("./PDFCanvasPreview");

    render(<PDFCanvasPreview pdfBlobUrl="blob:v1" zoom={100} />);
    await flush(20);

    expect(lastFakeDoc.getPage).toHaveBeenCalledTimes(3);

    deferPageMetadata = false;
    pendingPageResolvers.splice(0).forEach((resolve) => resolve());
    await flush(150);
  });
});
