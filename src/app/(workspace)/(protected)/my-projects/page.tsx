import type { Metadata } from "next";
import View from "@/views/MyProjects";

export const metadata: Metadata = {
  title: "My Projects",
  alternates: { canonical: "/my-projects" },
};

export default function Page() {
  return <View />;
}
