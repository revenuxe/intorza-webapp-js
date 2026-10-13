import type { Metadata } from "next";
import View from "@/views/Auth";

export const metadata: Metadata = {
  title: "Login",
  alternates: { canonical: "/auth" },
};

export default function Page() {
  return <View />;
}
