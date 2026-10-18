import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가족 안부 허브",
  description: "엄마가 먼저 묻는 가족방 — 형제들이 함께 쓰는 부모님 안부·소통 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3ee",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
