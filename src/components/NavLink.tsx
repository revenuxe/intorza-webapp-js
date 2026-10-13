"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  to: string;
  end?: boolean;
  activeClassName?: string;
};
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, end, className, activeClassName, ...props }, ref) => {
    const pathname = usePathname();
    const active = pathname === to || (!end && to !== "/" && pathname.startsWith(to + "/"));
    return <NextLink ref={ref} href={to} aria-current={active ? "page" : undefined} className={cn(className, active && activeClassName)} {...props} />;
  },
);
NavLink.displayName = "NavLink";
