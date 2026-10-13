"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("INTORZA page error", error); }, [error]);
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">We couldn’t open this page</h1>
        <p className="mt-3 text-muted-foreground">Try again, or return to your workspace.</p>
        <button onClick={reset} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-primary-foreground">Try again</button>
        <Link href="/" className="ml-4 text-sm underline">Open workspace</Link>
      </div>
    </main>
  );
}
