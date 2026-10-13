import { describe, expect, it } from "@jest/globals";
import { safeInternalPath } from "./safe-navigation";

describe("payment and auth return paths", () => {
  it("preserves internal deep links and their query parameters", () => {
    expect(safeInternalPath('/quotations/abc?id=123&continueAction=save#details')).toBe('/quotations/abc?id=123&continueAction=save#details');
  });
  it.each(['javascript:alert(1)', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com', '', null])('rejects unsafe target %s', target => {
    expect(safeInternalPath(target, '/dashboard')).toBe('/dashboard');
  });
});
