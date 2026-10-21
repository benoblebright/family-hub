import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 프리텐다드 (가변 폰트, SIL OFL) — 한글 UI용
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "가족 안부 허브",
  description: "엄마가 먼저 묻는 가족방 — 형제·가족·친구가 함께 쓰는 부모님 안부·소통 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafd" },
    { media: "(prefers-color-scheme: dark)", color: "#131314" },
  ],
};

// 화면 틀(상단 바·하단 탭)은 영역별 레이아웃에서: (site) 소개, f/[token] 가족방, admin 운영자
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        {/* Google Material Symbols (아이콘 폰트) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
