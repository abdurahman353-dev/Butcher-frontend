import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/contexts/DialogContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopSettingsProvider } from "@/contexts/ShopSettingsContext";
import { DynamicTitle } from "@/components/shared/DynamicTitle";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Butchery POS — Point of Sale System",
  description: "Fast, weight-based butcher point of sale system with real-time inventory, M-Pesa & Cash payments.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans h-full antialiased bg-[#f5f5f5] text-zinc-900`} suppressHydrationWarning>
        <AuthProvider>
          <ShopSettingsProvider>
            <DynamicTitle />
            <DialogProvider>
              {children}
            </DialogProvider>
          </ShopSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
