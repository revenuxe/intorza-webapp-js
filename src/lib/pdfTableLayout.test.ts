import { describe, expect, it } from "@jest/globals";
import { fitFixedColumnWidths } from "./pdfTableLayout";

describe("fitFixedColumnWidths", () => {
  it("reserves enough width for the flexible description column", () => {
    const columnCount = 8;
    const padding = 1.25;
    const descriptionWidth = 40;
    const widths = fitFixedColumnWidths(
      [12, 26, 12, 12, 14, 23, 24],
      180 - padding * 2 * columnCount,
      descriptionWidth,
    );
    const availableDescriptionWidth = 180 - widths.reduce((sum, width) => sum + width, 0) - padding * 2 * columnCount;
    expect(availableDescriptionWidth).toBeGreaterThanOrEqual(descriptionWidth);
  });

  it("scales columns proportionally when a decorated page has less room", () => {
    const widths = fitFixedColumnWidths([12, 26, 14, 12, 12, 14, 23, 24], 126 - 2 * 1 * 9, 29);
    expect(widths.every((width) => width > 0)).toBe(true);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(79);
  });
});
