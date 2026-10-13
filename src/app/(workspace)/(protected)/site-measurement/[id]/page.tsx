import type { Metadata } from "next";
import View from "@/views/SiteMeasurementDetail";

export const metadata: Metadata = {
  title: "Site Measurement",
};

export default function Page() {
  return <View />;
}
