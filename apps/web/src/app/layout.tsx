import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Gymory — Find gyms with the equipment you need",
    template: "%s | Gymory",
  },
  description:
    "Search nearby gyms by racks, machines, and real training gear. Find the right gym — not just the nearest one.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
