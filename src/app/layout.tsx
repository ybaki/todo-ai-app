import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akıllı Todo & Takvim Planlayıcı",
  description:
    "Yapay zekâ destekli görev sınıflandırması, haftalık takvim ve Görev ata ile akıllı zaman planlama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
