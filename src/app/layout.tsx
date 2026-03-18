import type { Metadata } from "next";
import HeroContainer from "@/containers/heroContainer"
import { Sora, JetBrains_Mono, Kanit } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Grid Geography Game",
  description: "IBM Ponder This — March 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${sora.variable} ${jetbrainsMono.variable} ${kanit.variable} antialiased`}
        style={{ fontFamily: "var(--font-kanit), var(--font-sora), sans-serif" }}
      >
        <HeroContainer>
          {children}
        </HeroContainer>
      </body>
    </html>
  );
}
