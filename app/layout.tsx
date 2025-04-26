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

export const metadata = {
  title: 'Bolt - Instant File Sharing',
  description: 'Share files instantly between any devices - phones, tablets, computers. No app installation, no sign-up required.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${oxanium.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider defaultTheme="dark" storageKey="zapit-theme">
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
