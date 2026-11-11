import type { Metadata } from "next";
import View from "@/views/admin/AdminLogin";

export const metadata: Metadata = {
  title: "Admin Login",
  alternates: { canonical: "https://admin.intorza.com/login" },
};

export default function Page() {
  return <View />;
}
