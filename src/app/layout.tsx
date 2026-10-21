import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "가족 안부 허브",
  description: "엄마가 먼저 묻는 가족방 — 형제·가족·친구가 함께 쓰는 부모님 안부·소통 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafd" },
    { media: "(prefers-color-scheme: dark)", color: "#131314" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* Google Material Symbols (아이콘 폰트) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block"
        />
      </head>
      <body className={noto.className}>
        <header className="appbar no-print">
          <Link href="/" className="brand">
            <span className="ms fill brand-mark" aria-hidden="true">
              family_home
            </span>
            가족 안부 허브
          </Link>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
