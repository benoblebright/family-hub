import Link from "next/link";
import { notFound } from "next/navigation";
import { findChild } from "@/lib/db";
import { josa, kstDate } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// 월간 종이 가족신문 — 통화 속 엄마 이야기 + 가족 소식으로 지면을 채운다 (Famileo 모델)
export default async function News({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { token } = await params;
  const { month } = await searchParams;
  const found = await findChild(token);
  if (!found) notFound();
  const { db, family, parent, siblings } = found;

  const ym = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : kstDate().slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const inMonth = (iso: string) => kstDate(iso).slice(0, 7) === ym;
  const prev = new Date(y, m - 2, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  const ids = new Set(siblings.map((s) => s.id));
  const roleOf = (id: string) => siblings.find((s) => s.id === id)?.role ?? "";
  const reports = db.reports.filter((r) => r.familyId === family.id && r.weekOf.slice(0, 7) === ym);
  const stories = db.stories.filter((s) => s.familyId === family.id && inMonth(s.createdAt));
  const questions = db.questions.filter((q) => q.familyId === family.id && q.status === "closed" && q.summary && inMonth(q.createdAt));
  const letters = db.mailbox.filter((x) => ids.has(x.childId) && x.text && inMonth(x.createdAt));
  const checks = db.checks.filter((c) => ids.has(c.childId) && inMonth(c.createdAt));
  const momLines = reports.flatMap((r) => r.summary).slice(0, 6);
  const empty = momLines.length + stories.length + questions.length + letters.length === 0;

  return (
    <>
      <div className="row no-print" style={{ marginBottom: 14 }}>
        <Link className="btn small secondary" href={`/f/${token}`}>
          ← 가족방
        </Link>
        <Link className="btn small secondary" href={`/f/${token}/news?month=${prevYm}`}>
          지난달
        </Link>
        <span className="grow" />
      </div>

      <article className="paper">
        <h1>{family.name} 소식</h1>
        <div className="issue">
          {y}년 {m}월호 · {parent.name}께 드리는 우리 가족 이야기
        </div>

        {empty && <p>이번 달은 아직 실을 이야기가 모이지 않았어요. 우체통에 글을 남기면 다음 호에 실려요.</p>}

        {momLines.length > 0 && (
          <>
            <h2>이달의 {parent.name}</h2>
            {momLines.map((l) => (
              <p key={l} style={{ margin: "4px 0" }}>
                · {l}
              </p>
            ))}
          </>
        )}

        {stories.length > 0 && (
          <>
            <h2>{parent.name}의 옛날 이야기</h2>
            {stories.map((s) => (
              <p key={s.id}>
                <span className="from">〈{s.topic}〉</span> {s.text}
              </p>
            ))}
          </>
        )}

        {letters.length > 0 && (
          <>
            <h2>가족방에서 보낸 편지</h2>
            {letters.map((x) => (
              <p key={x.id}>
                <span className="from">{roleOf(x.childId)}:</span> {x.text}
              </p>
            ))}
          </>
        )}

        {questions.length > 0 && (
          <>
            <h2>이달의 {parent.name} 질문</h2>
            {questions.map((q) => (
              <p key={q.id}>
                <span className="from">“{q.text}”</span>
                <br />→ {q.summary!.sms}
              </p>
            ))}
          </>
        )}

        <h2>이달에 {josa(parent.name, "과", "와")} 통화한 횟수</h2>
        <p>
          {siblings.map((s) => `${s.role} ${checks.filter((c) => c.childId === s.id).length}번`).join(" · ")}
        </p>
      </article>

      <div className="no-print" style={{ marginTop: 14 }}>
        <PrintButton />
        <p className="muted" style={{ marginTop: 8 }}>
          스탠다드 요금제부터 매달 인쇄해서 우편으로 보내드려요. 지금은 미리보기예요.
        </p>
      </div>
    </>
  );
}
