"use client";
import { ProtectedRoute } from '@/components/ProtectedRoute';
export default function TeamSessionBoundary({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute loginPath="/team/login">{children}</ProtectedRoute>;
}
