import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionTimingCoordinator } from "@/components/session-timing-coordinator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Work Session Tracker",
  description:
    "Set a daily outcome, execute focused work sessions, and track standalone project deadlines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full min-w-[1024px] bg-background text-foreground">
        <SessionTimingCoordinator />
        {children}
      </body>
    </html>
  );
}
