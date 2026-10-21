import { Icon } from "@/components/Icon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findChild } from "@/lib/db";
import { josa, timeAgo, untilDeadline } from "@/lib/format";
import { ReplyForm } from "@/components/Forms";
import { familyNow } from "@/lib/checkin";

export const dynamic = "force-dynamic";

const SOURCE = { call: "전화로", sms: "문자로", ars: "ARS로" } as const;

// 알림톡 "답장하기" 버튼이 여는 페이지 — 토큰으로 누가 어느 질문에 답하는지 식별
export default async function ReplyPage({ params }: { params: Promise<{ token: string; qid: string }> }) {
  const { token, qid } = await params;
  const found = await findChild(token);
  if (!found) notFound();
  const { db, child, parent, siblings } = found;
  const q = db.questions.find((x) => x.id === qid && x.familyId === child.familyId);
  if (!q) notFound();

  const replies = db.replies.filter((r) => r.questionId === q.id);
  const mine = replies.filter((r) => r.childId === child.id).at(-1);

  return (
    <>
      <div className="hello">
        <small>{child.name}님, {parent.name}의 질문이에요</small>
        <h1>{parent.name}께 답장하기</h1>
      </div>

      <section className="card">
        <div className="question">
          <span className="from">
            {josa(parent.name, "이", "가")} {SOURCE[q.source]} 남기셨어요 · {timeAgo(q.createdAt, familyNow(found.family))}
          </span>
          “{q.text}”
        </div>
        <p className="muted">
          {q.status === "open"
            ? `${untilDeadline(q.deadline, familyNow(found.family))} · 답이 모이면 AI가 정리해서 ${parent.name}께 전화와 문자로 전해드려요.`
            : `마감되어 ${parent.name}께 전달했어요.`}
        </p>
      </section>

      <section className="card">
        <h2>모두의 답장</h2>
        <ul className="plain">
          {siblings.map((s) => {
            const r = replies.filter((x) => x.childId === s.id).at(-1);
            return (
              <li key={s.id} className="row">
                <span className="avatar">{s.role.slice(0, 1)}</span>
                <span className="grow">
                  <b>{s.role}</b> {s.id === child.id && <span className="muted">(나)</span>}
                  <br />
                  <span className="muted">
                    {r ? [r.choice, r.hideFromMom ? "메모(엄마께는 비공개)" : r.text, r.audio && "음성 답장"].filter(Boolean).join(" · ") : "아직 답 없음"}
                  </span>
                </span>
                {r ? <span className="tag ok">답함</span> : <span className="tag gray">대기</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {q.status === "open" ? (
        <section className="card">
          <h2>{mine ? "답장 고치기" : "내 답장"}</h2>
          {mine && <p className="muted">이미 답했어요. 다시 보내면 마지막 답으로 바뀌어요.</p>}
          <ReplyForm token={token} questionId={q.id} options={q.options ?? []} />
        </section>
      ) : (
        q.summary && (
          <section className="card">
            <h2>{parent.name}께 전해드린 내용</h2>
            <div className="sms"><Icon name="smartphone" /> {q.summary.sms}</div>
            <p>{q.summary.long}</p>
          </section>
        )
      )}

      <p className="footer">
        <Link href={`/f/${token}`}>← 가족방으로</Link>
      </p>
    </>
  );
}
