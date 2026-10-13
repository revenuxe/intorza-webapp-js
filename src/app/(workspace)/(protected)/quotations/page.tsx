import type { Metadata } from "next";
import View from "@/views/Quotations";

export const metadata: Metadata = {
  title: "Quotations",
  alternates: { canonical: "/quotations" },
};

export default function Page() {
  return <View />;
}
