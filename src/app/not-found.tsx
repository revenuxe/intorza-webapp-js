import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">This link may have moved or is no longer available.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-primary-foreground">Return to workspace</Link>
      </div>
    </main>
  );
}
