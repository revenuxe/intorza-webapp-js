import type { Metadata } from "next";
import View from "@/views/CancellationRefundPolicy";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  alternates: { canonical: "/cancellation-refund-policy" },
};

export default function Page() {
  return <View />;
}
