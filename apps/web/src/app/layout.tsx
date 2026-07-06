import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";

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
    <html>
      <body>
        {children}
        <Analytics />
        {shouldLoadGoogleAnalytics ? (
          <GoogleAnalytics gaId={gaMeasurementId!} />
        ) : null}
      </body>
    </html>
  );
}
