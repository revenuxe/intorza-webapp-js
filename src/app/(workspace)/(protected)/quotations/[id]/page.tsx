import type { Metadata } from "next";
import View from "@/views/QuotationDetail";

export const metadata: Metadata = {
  title: "Quotation Details",
};

export default function Page() {
  return <View />;
}
