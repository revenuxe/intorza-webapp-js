"use client";

import dynamic from "next/dynamic";
import { GlobalLoader } from "@/components/GlobalLoader";

const View = dynamic(() => import("@/views/admin/PDFPreviewQA"), {
  ssr: false,
  loading: () => <GlobalLoader message="Opening your workspace…" fullScreen={false} />,
});

export default View;
