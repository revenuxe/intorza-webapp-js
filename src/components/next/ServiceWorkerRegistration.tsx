"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // A production worker must not intercept development chunks.
      void navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          if (registration.active?.scriptURL === `${window.location.origin}/sw.js`) void registration.unregister();
        }
      });
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(error => console.error("Service worker registration failed", error));
  }, []);
  return null;
}
