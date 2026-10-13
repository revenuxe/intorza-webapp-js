import type { Metadata } from "next";
import View from "@/views/team/ProjectDetail";

export const metadata: Metadata = {
  title: "Team Project",
};

export default function Page() {
  return <View />;
}
