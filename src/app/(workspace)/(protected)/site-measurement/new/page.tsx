import type { Metadata } from "next";
import View from "@/views/SiteMeasurementNew";

export const metadata: Metadata = {
  title: "New Site Measurement",
  alternates: { canonical: "/site-measurement/new" },
};

export default function Page() {
  return <View />;
}
