import type { Metadata } from "next";
import View from "@/views/InvoiceDetail";

export const metadata: Metadata = {
  title: "Invoice Details",
};

export default function Page() {
  return <View />;
}
