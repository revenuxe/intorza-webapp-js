import type { Metadata } from "next";
import View from "@/views/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy-policy" },
};

export default function Page() {
  return <View />;
}
