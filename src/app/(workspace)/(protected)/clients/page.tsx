import type { Metadata } from "next";
import View from "@/views/Clients";

export const metadata: Metadata = {
  title: "Clients",
  alternates: { canonical: "/clients" },
};

export default function Page() {
  return <View />;
}
