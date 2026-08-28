import type { Metadata, Viewport } from "next";
import { Montserrat, Bebas_Neue } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAF7F2"
};

export const metadata: Metadata = {
  title: "FeelProd Voice — Assistant Vocal & Dictée TDT",
  description: "Application officielle de dictée vocale, transcription Gemini 2.5 Flash, synthèse clinique et export PDF pour iPhone & Mac de Guillaume Philippe.",
  appleWebApp: {
    capable: true,
    title: "FeelProd Voice",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${montserrat.variable} ${bebasNeue.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
