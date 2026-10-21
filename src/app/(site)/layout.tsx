import Link from "next/link";

// 소개 영역: 랜딩 · 가족방 만들기 · 데모
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="appbar">
        <div className="appbar-inner">
          <Link href="/" className="brand">
            <span className="ms fill brand-mark" aria-hidden="true">
              family_home
            </span>
            가족 안부 허브
          </Link>
          <Link href="/start" className="appbar-action">
            가족방 만들기
          </Link>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
