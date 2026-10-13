import { GlobalLoader } from "@/components/GlobalLoader";

export default function Loading() {
  return <div role="status" aria-live="polite"><GlobalLoader message="Loading your workspace…" fullScreen={false} /></div>;
}
