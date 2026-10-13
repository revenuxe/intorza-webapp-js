import type { Metadata } from "next";
import View from "@/views/team/TeamLogin";

export const metadata: Metadata = {
  title: "Team Login",
  alternates: { canonical: "/team/login" },
};

export default function Page() {
  return <View />;
}
