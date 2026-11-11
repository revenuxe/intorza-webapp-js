import type { Metadata } from "next";
import View from "@/views/team/TeamSignup";

export const metadata: Metadata = {
  title: "Team Signup",
  alternates: { canonical: "https://team.intorza.com/team/signup" },
};

export default function Page() {
  return <View />;
}
