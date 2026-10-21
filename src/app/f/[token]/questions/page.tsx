import Link from "next/link";
import { Icon } from "@/components/Icon";
import { loadFamilyPage } from "@/lib/family-page";
import { josa, timeAgo, untilDeadline } from "@/lib/format";

export const dynamic = "force-dynamic";

// 질문 탭: 엄마가 물어본 것 — 답할 질문 / 지난 질문
export default async function Questions({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { db, child, family, parent, siblings, now } = await loadFamilyPage(token);
  const questions = db.questions.filter((q) => q.familyId === family.id).reverse();
  const open = questions.filter((q) => q.status === "open");
  const closed = questions.filter((q) => q.status === "closed");

  return (
    <>
      <div className="hello">
        <small>{josa(parent.name, "이", "가")} 물어보면 모두에게 가요</small>
        <h1>{parent.name} 질문</h1>
      </div>

      {open.length === 0 && (
        <section className="card empty">
          <Icon name="forum" />
          <p>지금 답할 질문이 없어요.</p>
          <p className="muted">
            {parent.name}께서 문자나 전화로 물어보시면 여기에 떠요. <Link href={`/f/${token}/sim`}>엄마 폰</Link>에서 직접 보내 볼 수 있어요.
          </p>
        </section>
      )}

      {open.map((q) => {
        const answered = new Set(db.replies.filter((r) => r.questionId === q.id).map((r) => r.childId));
        const mine = answered.has(child.id);
        return (
          <section className="card" key={q.id}>
            <h2>
              답할 질문
              <span className="tag">{untilDeadline(q.deadline, now)}</span>
            </h2>
            <div className="question">“{q.text}”</div>
            <p className="muted">
              {siblings.length}명 중 {answered.size}명 답함{!mine && " · 아직 내 답이 없어요"}
            </p>
            <Link className={`btn ${mine ? "secondary" : ""}`} href={`/f/${token}/q/${q.id}`}>
              {mine ? "답장 보기·고치기" : "답장하기"}
            </Link>
          </section>
        );
      })}

      {closed.length > 0 && (
        <section className="card">
          <h2>
            <Icon name="task_alt" /> 지난 질문
          </h2>
          <ul className="plain">
            {closed.map((q) => (
              <li key={q.id}>
                <Link href={`/f/${token}/q/${q.id}`} className="list-link">
                  <span className="grow">
                    “{q.text}”
                    {q.summary && <span className="muted block">→ {q.summary.sms}</span>}
                  </span>
                  <span className="muted">{timeAgo(q.createdAt, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
