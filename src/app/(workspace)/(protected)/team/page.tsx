import type { Metadata } from "next";
import View from "@/views/Team";

export const metadata: Metadata = {
  title: "Team Management",
  alternates: { canonical: "/team" },
};

export default function Page() {
  return <View />;
}
