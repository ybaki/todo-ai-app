import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akıllı Todo & Takvim Planlayıcı",
  description:
    "Yapay zekâ destekli Eisenhower sınıflandırması, Outlook uygunluk analizi ve otomatik zaman önerisi",
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
