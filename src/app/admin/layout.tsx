import Link from "next/link";

// 운영자 영역: 가족방·소개와 분리된 상단 바
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="appbar admin no-print">
        <div className="appbar-inner">
          <Link href="/admin" className="brand">
            <span className="ms fill brand-mark" aria-hidden="true">
              admin_panel_settings
            </span>
            운영자
          </Link>
          <Link href="/" className="appbar-action">
            서비스 화면
          </Link>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
