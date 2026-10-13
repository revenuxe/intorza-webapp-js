import type { Metadata } from "next";
import View from "@/views/TermsAndConditions";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  alternates: { canonical: "/terms-and-conditions" },
};

export default function Page() {
  return <View />;
}
