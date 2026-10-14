import type { Metadata } from "next";
import View from "@/views/MyProjectDetail";

export const metadata: Metadata = {
  title: "Project Details",
};

export default function Page() {
  return <View />;
}
