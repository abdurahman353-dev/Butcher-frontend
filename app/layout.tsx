import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/contexts/DialogContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Prime Cut POS — Butcher Point of Sale",
  description: "Fast, weight-based butcher point of sale system with real-time inventory, M-Pesa & Cash payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans h-full antialiased bg-[#f5f5f5] text-zinc-900`}>
        <DialogProvider>
          {children}
        </DialogProvider>
      </body>
    </html>
  );
}
