import type { Metadata } from "next";
import View from "@/views/Gallery";

export const metadata: Metadata = {
  title: "Gallery",
  alternates: { canonical: "/gallery" },
};

export default function Page() {
  return <View />;
}
