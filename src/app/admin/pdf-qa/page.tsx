import type { Metadata } from "next";
import View from "@/components/next/adminPDFPreviewQAClient";

export const metadata: Metadata = {
  title: "PDF Preview QA",
  alternates: { canonical: "/admin/pdf-qa" },
};

export default function Page() {
  return <View />;
}
