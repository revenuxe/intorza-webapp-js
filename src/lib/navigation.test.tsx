import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNavigation = {
  push: jest.fn(), replace: jest.fn(), back: jest.fn(), forward: jest.fn(),
  pathname: '/quotations', query: 'id=abc&continueAction=save',
};
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockNavigation.push, replace: mockNavigation.replace, back: mockNavigation.back, forward: mockNavigation.forward }),
  usePathname: () => mockNavigation.pathname,
  useSearchParams: () => new URLSearchParams(mockNavigation.query),
  useParams: () => ({ id: 'abc' }),
}));
// Load after registering the mock; Next's SWC does not hoist imported jest calls.
const { useNavigate, useSearchParams } = require("./navigation") as typeof import("./navigation");

describe('Next.js feature navigation', () => {
  beforeEach(() => { jest.clearAllMocks(); window.location.hash = ''; });
  it('routes push, replace and back through Next', () => {
    const { result } = renderHook(useNavigate);
    act(() => { result.current('/invoices/123'); result.current('/auth', { replace: true }); result.current(-1); });
    expect(mockNavigation.push).toHaveBeenCalledWith('/invoices/123');
    expect(mockNavigation.replace).toHaveBeenCalledWith('/auth');
    expect(mockNavigation.back).toHaveBeenCalledTimes(1);
  });
  it('removes a continued action while retaining the quotation and scroll position', () => {
    window.location.hash = '#editor';
    const { result } = renderHook(useSearchParams);
    const params = new URLSearchParams(result.current[0]);
    params.delete('continueAction');
    act(() => result.current[1](params, { replace: true }));
    expect(mockNavigation.replace).toHaveBeenCalledWith('/quotations?id=abc#editor', { scroll: false });
  });
});
