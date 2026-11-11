import type { Metadata } from "next";
import View from "@/views/team/TeamLogin";

export const metadata: Metadata = {
  title: "Team Login",
  alternates: { canonical: "https://team.intorza.com/login" },
};

export default function Page() {
  return <View />;
}
