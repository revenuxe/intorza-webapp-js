import type { Metadata } from "next";
import View from "@/views/MyLibrary";

export const metadata: Metadata = {
  title: "My Library",
  alternates: { canonical: "/library" },
};

export default function Page() {
  return <View />;
}
