import type { Metadata, Viewport } from "next";
import "../styles/tokens.css";
import "../styles/globals.css";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "UrbanGaon AI Todo Platform • Enterprise Operating System",
  description: "A voice-first, calendar-integrated deliverable management application built for high-performance teams and executive leadership.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/urbangaon-icon.png", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: "/urbangaon-icon.png"
  }
};

// Next.js 15: viewport must be exported separately
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
