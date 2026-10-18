import Link from "next/link";
import { readDB } from "@/lib/db";
import { timeAgo, untilDeadline } from "@/lib/format";
import { closeQuestion, createQuestion, markPlayed, saveReport } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { schedule: "일정형", yesno: "예/아니오형", free: "자유형" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key = "" } = await searchParams;
  if (process.env.ADMIN_KEY && key !== process.env.ADMIN_KEY) {
    return <p className="muted">운영자 키가 필요해요. 주소 끝에 ?key=... 를 붙여 주세요.</p>;
  }

  const db = await readDB();
  const hasAI = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const KeyField = () => <input type="hidden" name="key" value={key} />;

  return (
    <>
      <div className="hello">
        <small>운영자 화면 · 0~1단계 수동 운영용</small>
        <h1>가족 안부 허브 운영</h1>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        AI 분류·요약: {hasAI ? "Claude API 사용" : "API 키 없음 → 규칙 기반 템플릿으로 동작"}
      </p>

      {db.families.map((family) => {
        const parent = db.parents.find((p) => p.familyId === family.id)!;
        const children = db.children.filter((c) => c.familyId === family.id);
        const questions = db.questions.filter((q) => q.familyId === family.id).reverse();
        const report = db.reports.filter((r) => r.familyId === family.id).at(-1);
        const ids = new Set(children.map((c) => c.id));
        const mailbox = db.mailbox.filter((m) => ids.has(m.childId) && !m.played);

        return (
          <div key={family.id}>
            <section className="card">
              <h2>
                👪 {family.name} <span className="tag">{family.plan}</span>
              </h2>
              <p className="muted">
                {parent.name} · {parent.phone} (대표번호 발신번호 식별 키)
              </p>
              <ul className="plain">
                {children.map((c) => (
                  <li key={c.id} className="row">
                    <span className="grow">
                      <b>{c.role}</b> {c.name}
                    </span>
                    <Link className="btn small secondary" href={`/f/${c.token}`}>
                      가족방 링크
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <h2>💌 엄마 질문 등록</h2>
              <p className="muted">통화·문자로 들어온 엄마 질문을 적으면 AI가 유형과 빠른 답 버튼을 정해요.</p>
              <form action={createQuestion} style={{ marginTop: 10 }}>
                <KeyField />
                <input type="hidden" name="familyId" value={family.id} />
                <input type="text" name="text" placeholder="예: 김장 같이 할 사람 있니?" required />
                <div className="row">
                  <select name="source" defaultValue="call" className="grow">
                    <option value="call">안부콜 중에</option>
                    <option value="ars">ARS 2번</option>
                    <option value="sms">문자</option>
                  </select>
                  <select name="hours" defaultValue="6" className="grow">
                    <option value="3">3시간 뒤 마감</option>
                    <option value="6">6시간 뒤 마감</option>
                    <option value="24">내일 마감</option>
                  </select>
                </div>
                <button className="btn">질문 보내기</button>
              </form>
            </section>

            {questions.map((q) => {
              const replies = db.replies.filter((r) => r.questionId === q.id);
              const answered = new Set(replies.map((r) => r.childId));
              return (
                <section className="card" key={q.id}>
                  <h2>
                    “{q.text}”
                    <span className={`tag ${q.status === "open" ? "" : "gray"}`}>
                      {q.status === "open" ? untilDeadline(q.deadline) : "마감"}
                    </span>
                  </h2>
                  <p className="muted">
                    {TYPE_LABEL[q.type]}
                    {q.options?.length ? ` · 버튼: ${q.options.join(" / ")}` : ""} · {timeAgo(q.createdAt)} · {answered.size}/
                    {children.length}명 답함
                  </p>
                  <ul className="plain" style={{ margin: "10px 0" }}>
                    {children.map((c) => {
                      const r = replies.filter((x) => x.childId === c.id).at(-1);
                      return (
                        <li key={c.id}>
                          <b>{c.role}</b>{" "}
                          {r ? (
                            <>
                              {[r.choice, r.text].filter(Boolean).join(" · ")}
                              {r.hideFromMom && <span className="tag warn"> 엄마께 비공개</span>}
                              {r.audio && <audio src={`/api/audio/${r.audio}`} controls style={{ width: "100%", height: 36 }} />}
                            </>
                          ) : (
                            <span className="muted">답 없음 · 알림톡 링크 /f/{c.token}/q/{q.id}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {q.status === "open" ? (
                    <form action={closeQuestion}>
                      <KeyField />
                      <input type="hidden" name="questionId" value={q.id} />
                      <button className="btn secondary">마감하고 엄마께 보낼 요약 만들기</button>
                    </form>
                  ) : (
                    q.summary && (
                      <div className="stack">
                        <div className="sms">
                          📱 문자 ({q.summary.sms.length}자): {q.summary.sms}
                        </div>
                        <div className="sms">📞 ARS로 읽어드릴 말: {q.summary.long}</div>
                        <p className="muted">요약: {q.summary.by === "claude" ? "Claude" : "템플릿"}</p>
                      </div>
                    )
                  )}
                </section>
              );
            })}

            <section className="card">
              <h2>📋 이번 주 안부콜 요약 입력</h2>
              <p className="muted">통화 내용을 Claude로 요약한 뒤 붙여 넣으세요. 한 줄에 하나씩, 최대 3줄.</p>
              <form action={saveReport} style={{ marginTop: 10 }}>
                <KeyField />
                <input type="hidden" name="familyId" value={family.id} />
                <label className="field">3줄 요약</label>
                <textarea name="summary" defaultValue={report?.summary.join("\n")} required />
                <label className="field">이번 주 물어볼 것 3가지</label>
                <textarea name="topics" defaultValue={report?.topics.join("\n")} />
                <div className="row">
                  <select name="mood" defaultValue={report?.mood ?? "보통"} className="grow">
                    <option>좋음</option>
                    <option>보통</option>
                    <option>조금 걱정</option>
                  </select>
                  <input type="text" name="answered" placeholder="받은 콜" defaultValue={report?.calls.answered} className="grow" />
                  <input type="text" name="scheduled" placeholder="예정 콜" defaultValue={report?.calls.scheduled} className="grow" />
                </div>
                <button className="btn">저장 (형제 가족방에 바로 반영)</button>
              </form>
            </section>

            <section className="card">
              <h2>
                📮 엄마 우체통 <span className="tag">{mailbox.length}개 대기</span>
              </h2>
              {mailbox.length === 0 && <p className="muted">비었어요. 형제들에게 &ldquo;엄마 우체통이 비었어요&rdquo; 알림을 보낼 때예요.</p>}
              <ul className="plain">
                {mailbox.map((m) => (
                  <li key={m.id}>
                    <b>{children.find((c) => c.id === m.childId)?.role}</b> <span className="muted">{timeAgo(m.createdAt)}</span>
                    {m.text && <div>{m.text}</div>}
                    {m.audio && <audio src={`/api/audio/${m.audio}`} controls style={{ width: "100%", height: 36 }} />}
                    <form action={markPlayed} style={{ marginTop: 6 }}>
                      <KeyField />
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn small secondary">엄마께 들려드림</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        );
      })}
    </>
  );
}
