import type { Metadata } from "next";
import View from "@/views/SiteMeasurement";

export const metadata: Metadata = {
  title: "Site Measurement",
  alternates: { canonical: "/site-measurement" },
};

export default function Page() {
  return <View />;
}
