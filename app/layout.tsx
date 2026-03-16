import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import Providers from "@/components/providers/RainbowKitProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyMind — AI Prediction Analyzer for Polymarket",
  description:
    "PolyMind uses AI to analyze Polymarket prediction events. Get intelligent insights, probability analysis, and market sentiment to make better prediction market decisions.",
  keywords: [
    "Polymarket",
    "prediction market",
    "AI analysis",
    "market prediction",
    "forecasting",
    "Polymarket analyzer",
  ],
  authors: [{ name: "PolyMind" }],
  openGraph: {
    type: "website",
    title: "PolyMind — AI Prediction Analyzer for Polymarket",
    description:
      "PolyMind uses AI to analyze Polymarket prediction events. Get intelligent insights, probability analysis, and market sentiment.",
    siteName: "PolyMind",
  },
  twitter: {
    card: "summary",
    title: "PolyMind — AI Prediction Analyzer for Polymarket",
    description:
      "PolyMind uses AI to analyze Polymarket prediction events. Get intelligent insights, probability analysis, and market sentiment.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0f1117" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </head>
      <body>
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

