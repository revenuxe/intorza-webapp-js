import type { Metadata } from "next";
import View from "@/views/admin/AdminLogin";

export const metadata: Metadata = {
  title: "Admin Login",
  alternates: { canonical: "/admin/login" },
};

export default function Page() {
  return <View />;
}
