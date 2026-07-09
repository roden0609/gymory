import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { RouteChangePageViewTracker } from "@/components/analytics/RouteChangePageViewTracker";

import "./globals.css";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldLoadGoogleAnalytics =
    Boolean(gaMeasurementId) &&
    cookies().get("gymory_no_ga")?.value !== "1";

  return (
    <html className="overflow-x-hidden">
      <body className="min-w-0 overflow-x-hidden">
        {children}
        <Analytics />
        {shouldLoadGoogleAnalytics ? (
          <>
            <Suspense fallback={null}>
              <RouteChangePageViewTracker />
            </Suspense>
            <GoogleAnalytics gaId={gaMeasurementId!} />
          </>
        ) : null}
      </body>
    </html>
  );
}
