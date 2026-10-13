import type { Metadata } from "next";
import View from "@/components/next/IndexClient";

export const metadata: Metadata = {
  title: "Create Quotation",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <View />;
}
