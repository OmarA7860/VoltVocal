import type { Metadata, Viewport } from "next";
import "./globals.css";

/** Long-running Groq calls (transcribe + estimate) from Server Actions. */
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "VoltVocal — Field Estimating",
  description:
    "Record voice notes on site and generate professional PDF estimates instantly.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoltVocal",
  },
};

export const viewport: Viewport = {
  themeColor: "#3A8F5F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/voltvocal-logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="VoltVocal" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090D0B] text-[#E0EDE5]">
        {children}
      </body>
    </html>
  );
}
