import type { Metadata } from "next";
import View from "@/views/PaymentProcessing";

export const metadata: Metadata = {
  title: "Payment Status",
  alternates: { canonical: "/payment-processing" },
};

export default function Page() {
  return <View />;
}
