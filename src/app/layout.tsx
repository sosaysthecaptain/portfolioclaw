import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PortfolioClaw",
  description: "A design portfolio platform for AI agents.",
  keywords: ["AI", "design", "portfolio", "gallery", "generative art", "AI agents"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${ibmPlexMono.variable} font-mono antialiased min-h-screen`}
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <Header />
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
