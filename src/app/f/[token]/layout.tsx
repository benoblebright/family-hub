import Link from "next/link";
import { notFound } from "next/navigation";
import { findChild, readDBCached } from "@/lib/db";
import { FamilyNav } from "@/components/FamilyNav";
import { Icon } from "@/components/Icon";

// 가족방 영역: 상단 바(가족방 이름·설정) + 하단 탭(홈·질문·우체통·가족신문·엄마 폰)
export default async function FamilyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findChild(token, await readDBCached());
  if (!found) notFound();
  const { db, child, family } = found;
  const myAnswers = new Set(db.replies.filter((r) => r.childId === child.id).map((r) => r.questionId));
  // 내가 아직 답하지 않은 열린 질문 수 → 질문 탭 배지
  const badges = {
    questions: db.questions.filter((q) => q.familyId === family.id && q.status === "open" && !myAnswers.has(q.id)).length,
  };

  return (
    <>
      <header className="appbar no-print">
        <div className="appbar-inner">
          <Link href={`/f/${token}`} className="brand">
            <span className="ms fill brand-mark" aria-hidden="true">
              family_home
            </span>
            <span className="brand-text">
              {family.name}
              <small>
                {child.role} {child.name}
              </small>
            </span>
          </Link>
          <Link href={`/f/${token}/settings`} className="icon-btn" aria-label="내 설정">
            <Icon name="settings" />
          </Link>
        </div>
      </header>
      <main className="wrap has-nav">{children}</main>
      <FamilyNav token={token} badges={badges} />
    </>
  );
}
