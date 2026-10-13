"use client";

import NextLink from "next/link";
import { useParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { forwardRef, useCallback, useMemo, type ComponentProps } from "react";
import { safeInternalPath } from "./safe-navigation";

export { useParams };

// Feature adapters; all routing and history are owned by Next.js.
export function useNavigate() {
  const router = useRouter();
  return useCallback((to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
      else window.history.go(to);
      return;
    }
    const href = safeInternalPath(to);
    if (options?.replace) router.replace(href);
    else router.push(href);
  }, [router]);
}

export function useLocation() {
  const pathname = usePathname();
  const params = useNextSearchParams();
  const query = params.toString();
  return useMemo(() => ({ pathname, search: query ? `?${query}` : "" }), [pathname, query]);
}

export function useSearchParams() {
  const params = useNextSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const query = params.toString();
  const current = useMemo(() => new URLSearchParams(query), [query]);
  const setParams = useCallback((next: URLSearchParams, options?: { replace?: boolean }) => {
    const search = next.toString();
    const href = `${pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    if (options?.replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [pathname, router]);
  return [current, setParams] as const;
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string };
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...props }, ref) => <NextLink ref={ref} href={to} {...props} />);
Link.displayName = "Link";
