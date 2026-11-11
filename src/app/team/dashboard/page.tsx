import type { Metadata } from "next";
import View from "@/views/team/TeamDashboard";

export const metadata: Metadata = {
  title: "Team Dashboard",
  alternates: { canonical: "https://team.intorza.com/team/dashboard" },
};

export default function Page() {
  return <View />;
}
