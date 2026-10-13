import { describe, expect, it } from "@jest/globals";
import { fitFixedColumnWidths } from "./pdfTableLayout";

describe("fitFixedColumnWidths", () => {
  it("reserves enough width for the flexible description column", () => {
    const widths = fitFixedColumnWidths([12, 26, 14, 14, 14, 16, 23, 24], 180, 30);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(150);
  });

  it("scales columns proportionally when a decorated page has less room", () => {
    const widths = fitFixedColumnWidths([12, 26, 14, 14, 14, 16, 23, 24], 126, 24);
    expect(widths.every((width) => width > 0)).toBe(true);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(102);
  });
});
