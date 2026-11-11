"use client";

import { WorkspaceAccountGuard } from '@/components/WorkspaceAccountGuard';
import { Layout } from "@/components/Layout";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceAccountGuard><Layout>{children}</Layout></WorkspaceAccountGuard>;
}
