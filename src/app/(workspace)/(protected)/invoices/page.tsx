import type { Metadata } from "next";
import View from "@/views/Invoices";

export const metadata: Metadata = {
  title: "Invoices",
  alternates: { canonical: "/invoices" },
};

export default function Page() {
  return <View />;
}
