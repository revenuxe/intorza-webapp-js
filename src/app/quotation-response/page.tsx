import type { Metadata } from "next";
import View from "@/views/QuotationResponse";

export const metadata: Metadata = {
  title: "Quotation Response",
  alternates: { canonical: "/quotation-response" },
};

export default function Page() {
  return <View />;
}
