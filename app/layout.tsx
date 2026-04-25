import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

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
  icons: {
    icon: "/crosshair-focus.svg",
    shortcut: "/crosshair-focus.svg",
    apple: "/crosshair-focus.svg",
  },
  openGraph: {
    title: "AlphaScope — Crypto Token Analytics",
    description:
      "Professional onchain token analytics. Discover new tokens, spot breakouts, and evaluate risk with real-time Birdeye data.",
    images: [
      {
        url: "/alphascope-logo2.png",
        width: 1200,
        height: 630,
        alt: "AlphaScope Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlphaScope — Crypto Token Analytics",
    description:
      "Professional onchain token analytics. Discover new tokens, spot breakouts, and evaluate risk with real-time Birdeye data.",
    images: ["/alphascope-logo2.png"],
  },
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
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-space-950 text-slate-100 antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
