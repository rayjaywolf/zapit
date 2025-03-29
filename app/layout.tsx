import type { Metadata } from "next";
import { Inter, Oxanium } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const oxanium = Oxanium({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-oxanium",
});

export const metadata: Metadata = {
  title: "ZapIt",
  description: "P2P File Sharing App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${oxanium.variable}`}>
      <body className="antialiased font-sans">
        <ThemeProvider defaultTheme="dark" storageKey="zapit-theme">
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
