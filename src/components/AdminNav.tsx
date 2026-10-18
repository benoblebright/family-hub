import Link from "next/link";

export function AdminNav({ current, familyId }: { current: "home" | "new" | "family" | "ars"; familyId?: string }) {
  const items = [
    { id: "home", href: "/admin", label: "전체" },
    { id: "new", href: "/admin/new", label: "+ 가족 등록" },
    ...(familyId
      ? [
          { id: "family", href: `/admin/f/${familyId}`, label: "가족 운영" },
          { id: "ars", href: `/admin/f/${familyId}/ars`, label: "ARS 대본" },
        ]
      : []),
  ];
  return (
    <nav className="nav no-print">
      {items.map((i) => (
        <Link key={i.id} href={i.href} className="btn small secondary" aria-current={i.id === current ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
