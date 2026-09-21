import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Parity — AAPL cash vs AAPLx vs AAPLon",
  description:
    "Cash AAPL has one price. Solana has two wrappers that do not share a book. Parity shows which mid is an actual Solana DEX fill.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
