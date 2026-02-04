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
  title: "portfolioclaw",
  description: "The design portfolio platform for AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} font-mono antialiased bg-white text-zinc-900 min-h-screen`}>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
