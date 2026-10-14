import type { Metadata } from "next";
import View from "@/views/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  alternates: { canonical: "/dashboard" },
};

export default function Page() {
  return <View />;
}
