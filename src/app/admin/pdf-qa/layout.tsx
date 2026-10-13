import AdminGuard from '@/components/next/AdminGuard';

export default function AdminQALayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
