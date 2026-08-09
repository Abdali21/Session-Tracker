import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Work Session Tracker",
  description:
    "Track your three daily work sessions: Skill Mastery, Client Acquisition, and Execution.",
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
      <body className="flex min-h-full min-w-[1180px] flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
