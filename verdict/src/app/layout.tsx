import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Sidebar } from "./sidebar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERDICT — ZK Game Integrity Protocol",
  description:
    "Universal zero-knowledge game integrity verification on Midnight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono">
        <Sidebar />
        <main className="flex-1 ml-56 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
