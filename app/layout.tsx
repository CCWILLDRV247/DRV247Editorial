import type { Metadata } from "next";
import { Alumni_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const alumni = Alumni_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-alumni",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DRV247 Editorial",
    template: "%s · DRV247",
  },
  description:
    "Drive 24/7 editorial desk — racing, classics, modified, concourse, and car culture. Metadata, summaries, and the original link. Never the full article.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${alumni.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white font-sans text-[#1b1d1f]">
        {children}
      </body>
    </html>
  );
}
