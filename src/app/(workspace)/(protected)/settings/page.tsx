import type { Metadata } from "next";
import View from "@/views/Settings";

export const metadata: Metadata = {
  title: "Settings",
  alternates: { canonical: "/settings" },
};

export default function Page() {
  return <View />;
}
