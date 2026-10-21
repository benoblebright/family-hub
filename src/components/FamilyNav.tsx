"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

// 가족방 하단 탭 (Material 3 Navigation bar)
export function FamilyNav({ token, badges }: { token: string; badges: { questions: number } }) {
  const path = usePathname();
  const base = `/f/${token}`;
  const tabs = [
    { href: base, icon: "home", label: "홈", match: (p: string) => p === base },
    { href: `${base}/questions`, icon: "forum", label: "질문", badge: badges.questions, match: (p: string) => p.startsWith(`${base}/questions`) || p.startsWith(`${base}/q/`) },
    { href: `${base}/mailbox`, icon: "markunread_mailbox", label: "우체통", match: (p: string) => p.startsWith(`${base}/mailbox`) },
    { href: `${base}/news`, icon: "newspaper", label: "가족신문", match: (p: string) => p.startsWith(`${base}/news`) },
    { href: `${base}/sim`, icon: "smartphone", label: "엄마 폰", match: (p: string) => p.startsWith(`${base}/sim`) },
  ];
  return (
    <nav className="bottomnav no-print" aria-label="가족방 메뉴">
      {tabs.map((t) => {
        const active = t.match(path);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="indicator">
              <Icon name={t.icon} fill={active} />
              {t.badge ? <span className="badge">{t.badge}</span> : null}
            </span>
            <span className="label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
