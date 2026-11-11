import type { Metadata } from "next";
import View from "@/views/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  alternates: { canonical: "https://admin.intorza.com/admin/dashboard" },
};

export default function Page() {
  return <View />;
}
