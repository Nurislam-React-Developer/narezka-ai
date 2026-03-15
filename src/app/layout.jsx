import { Inter } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Narezka AI",
  description: "Advanced AI-Powered Video Clipping Tool",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050510",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="flex flex-col min-h-screen noise relative">
        <Header />
        <main className="flex-1 pt-[64px] sm:pt-[72px] flex flex-col relative z-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
