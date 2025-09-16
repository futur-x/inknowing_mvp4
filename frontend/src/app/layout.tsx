import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MainLayout from "@/components/layout/main-layout";
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
  title: "InKnowing - AI-Powered Book Dialogue Platform",
  description: "Have conversations with books and their characters. Ask questions, explore ideas, and discover knowledge through AI-powered dialogues.",
  keywords: ["AI", "books", "dialogue", "conversation", "knowledge", "learning"],
  authors: [{ name: "InKnowing Team" }],
  openGraph: {
    title: "InKnowing - AI-Powered Book Dialogue Platform",
    description: "Have conversations with books and their characters. Ask questions, explore ideas, and discover knowledge through AI-powered dialogues.",
    type: "website",
    locale: "en_US",
    siteName: "InKnowing",
  },
  twitter: {
    card: "summary_large_image",
    title: "InKnowing - AI-Powered Book Dialogue Platform",
    description: "Have conversations with books and their characters.",
    creator: "@inknowing",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
