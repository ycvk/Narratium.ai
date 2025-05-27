import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/styles/local-fonts.css";
import "@/app/styles/fonts.css";
import MainLayout from "@/components/MainLayout";
import { LanguageProvider } from "@/app/i18n/LanguageProvider";
import { SoundProvider } from "@/app/contexts/SoundContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  title: "Narratium",
  description: "交互式故事体验",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: { url: "/logo.png", sizes: "180x180" },
    shortcut: { url: "/logo.png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#171717] text-white">
        <GoogleAnalytics />
        <SoundProvider>
          <LanguageProvider>
            <MainLayout>{children}</MainLayout>
          </LanguageProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
