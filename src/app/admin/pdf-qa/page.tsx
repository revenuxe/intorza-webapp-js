import type { Metadata } from "next";
import View from "@/components/next/adminPDFPreviewQAClient";

export const metadata: Metadata = {
  title: "PDF Preview QA",
  alternates: { canonical: "https://admin.intorza.com/pdf-qa" },
};

export default function Page() {
  return <View />;
}
