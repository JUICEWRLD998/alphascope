import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AlphaScope — Crypto Token Analytics",
    template: "%s | AlphaScope",
  },
  description:
    "Professional onchain token analytics. Discover new tokens, spot breakouts, and evaluate risk with real-time Birdeye data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-screen bg-space-950 text-slate-100 antialiased">
        <Sidebar />
        {/* Content area — offset for fixed 256 px sidebar */}
        <div className="ml-64 flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
