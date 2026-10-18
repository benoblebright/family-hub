import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { readDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { familyKpi, pct } from "@/lib/kpi";
import { planName } from "@/lib/plans";
import { MEMORY_QUESTIONS, nextMemoryQuestion } from "@/lib/prompts";
import { timeAgo, untilDeadline, weekStart } from "@/lib/format";
import { AdminNav } from "@/components/AdminNav";
import {
  addCall,
  addMemory,
  addStory,
  closeQuestion,
  createQuestion,
  deleteCall,
  deleteMemory,
  markPlayed,
  saveConsent,
  saveReport,
  setFamilyStatus,
} from "../../actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { schedule: "일정형", yesno: "예/아니오형", free: "자유형" } as const;
const KIND = { regular: "정기콜", ars: "엄마 ARS", callback: "원벨 콜백", transfer: "자녀 연결" } as const;
const FLAGS = ["건강 언급", "기분 저하", "외출 없음", "식사 거름"];

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function FamilyAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const db = await readDB();
  const family = db.families.find((f) => f.id === id);
  if (!family) notFound();

  const parent = db.parents.find((p) => p.familyId === id)!;
  const children = db.children.filter((c) => c.familyId === id);
  const childIds = new Set(children.map((c) => c.id));
  const kpi = familyKpi(db, id);
  const questions = db.questions.filter((q) => q.familyId === id).reverse();
  const calls = db.calls.filter((c) => c.familyId === id).sort((a, b) => b.at.localeCompare(a.at));
  const memories = db.memories.filter((m) => m.familyId === id).reverse();
  const stories = db.stories.filter((s) => s.familyId === id).reverse();
  const mailbox = db.mailbox.filter((m) => childIds.has(m.childId) && !m.played);
  const report = db.reports.filter((r) => r.familyId === id).at(-1);

  // 이번 주 리포트가 없으면 이번 주 통화 기록으로 초안을 채운다
  const since = weekStart();
  const weekCalls = calls.filter((c) => new Date(c.at) >= since);
  const thisWeek = report?.weekOf === since.toISOString().slice(0, 10) ? report : undefined;
  const nextMemory = nextMemoryQuestion(stories.map((s) => s.topic));
  const draft = thisWeek ?? {
    summary: weekCalls.filter((c) => c.summary).map((c) => c.summary!).slice(0, 3),
    topics: [...memories.slice(0, 2).map((m) => `${m.text} — 어떻게 됐는지 여쭤보기`), nextMemory.q],
    mood: weekCalls.find((c) => c.mood)?.mood ?? "보통",
    calls: { answered: weekCalls.filter((c) => c.answered).length, scheduled: weekCalls.filter((c) => c.kind === "regular").length },
  };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const weeklyMsg = (token: string, name: string) =>
    `[가족 안부 허브]\n${name}님, ${parent.name} 이번 주 안부 요약이 도착했어요.\n이번 주 ${parent.name}께 물어볼 것 3가지도 함께 확인해 보세요.\n\n▶ 가족방 열기\n${origin}/f/${token}`;

  return (
    <>
      <AdminNav current="family" familyId={id} />
      <div className="hello">
        <small>
          {planName(family.plan)} · {family.createdAt ? `${timeAgo(family.createdAt)} 등록` : ""}
        </small>
        <h1>{family.name}</h1>
      </div>

      <div className="row no-print" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        {(["trial", "active", "paused"] as const).map((s) => (
          <form action={setFamilyStatus} key={s}>
            <input type="hidden" name="familyId" value={id} />
            <input type="hidden" name="status" value={s} />
            <button className="btn small secondary" aria-current={family.status === s ? "page" : undefined} disabled={family.status === s}>
              {{ trial: "무료 체험", active: "유료 전환", paused: "중지" }[s]}
            </button>
          </form>
        ))}
        <Link className="btn small secondary" href={`/f/${children[0]?.token}/news`}>
          📰 가족신문
        </Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <b>{pct(kpi.answerRate)}</b>
          <span>안부콜 응답률 ({kpi.callCount}통)</span>
        </div>
        <div className="kpi">
          <b>{kpi.avgMinutes ?? "–"}분</b>
          <span>평균 통화 · 원가 관리 4분 이내</span>
        </div>
        <div className="kpi">
          <b>{kpi.siblingCalls}번</b>
          <span>형제가 엄마께 통화</span>
        </div>
        <div className="kpi">
          <b>
            {kpi.momQuestions}개 · {pct(kpi.replyRate)}
          </b>
          <span>엄마 질문 · 형제 답장률</span>
        </div>
      </div>
      <p className="muted" style={{ margin: "-6px 4px 14px" }}>
        최근 {kpi.days}일 기준 · 통화 {kpi.totalMinutes}분 (vox 기준 원가 약 {Math.round(kpi.totalMinutes * 252).toLocaleString()}원)
        {kpi.missedStreak >= 2 && ` · ⚠️ ${kpi.missedStreak}번 연속 미응답`}
      </p>

      <section className="card">
        <h2>📞 통화 기록 남기기</h2>
        <p className="muted">vox 연동 전까지 안부콜 결과를 여기에 적어요. 엄마 질문을 적으면 형제들에게 바로 질문이 열려요.</p>
        <form action={addCall} style={{ marginTop: 10 }}>
          <input type="hidden" name="familyId" value={id} />
          <div className="row">
            <select name="kind" defaultValue="regular" className="grow">
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input type="datetime-local" name="at" defaultValue={localNow()} className="grow" />
          </div>
          <div className="row">
            <label className="check grow">
              <input type="checkbox" name="answered" defaultChecked /> 받으셨어요
            </label>
            <input type="text" name="minutes" placeholder="통화 분" inputMode="numeric" style={{ width: 110 }} />
            <select name="mood" defaultValue="" style={{ width: 120 }}>
              <option value="">기분</option>
              <option>좋음</option>
              <option>보통</option>
              <option>조금 걱정</option>
            </select>
          </div>
          <textarea name="summary" placeholder="통화 요약 한두 줄 (예: 아침은 된장국. 무릎이 쑤셔 노인정은 쉬심.)" />
          <div className="row" style={{ flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
            {FLAGS.map((f) => (
              <label className="check" key={f} style={{ margin: 0 }}>
                <input type="checkbox" name="flag" value={f} /> {f}
              </label>
            ))}
          </div>
          <input type="text" name="memory" placeholder="기억 노트로 남길 사실 (예: 손주 운동회 10월 말)" />
          <input type="text" name="momQuestion" placeholder="엄마가 형제들에게 물어보신 것 (있으면)" />
          <div className="row">
            <select name="storyTopic" defaultValue={nextMemory.topic} style={{ width: 120 }}>
              {MEMORY_QUESTIONS.map((m) => (
                <option key={m.topic}>{m.topic}</option>
              ))}
            </select>
            <input type="text" name="storyText" placeholder="회상 이야기 (가족신문·회고록용)" className="grow" />
          </div>
          <button className="btn">통화 기록 저장</button>
        </form>
        <ul className="plain" style={{ marginTop: 14 }}>
          {calls.slice(0, 8).map((c) => (
            <li key={c.id} className="row" style={{ alignItems: "flex-start" }}>
              <span className="grow">
                <b>{KIND[c.kind]}</b>{" "}
                <span className="muted">
                  {timeAgo(c.at)} · {c.answered ? `${c.minutes}분` : "미응답"}
                  {c.mood && ` · ${c.mood}`}
                </span>
                {c.summary && <div>{c.summary}</div>}
                {c.flags.map((f) => (
                  <span key={f} className="tag warn" style={{ marginRight: 4 }}>
                    {f}
                  </span>
                ))}
              </span>
              <form action={deleteCall}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn small secondary" aria-label="통화 기록 삭제">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>💌 엄마 질문</h2>
        <form action={createQuestion}>
          <input type="hidden" name="familyId" value={id} />
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
          <button className="btn secondary">형제들에게 질문 열기</button>
        </form>
        {questions.map((q) => {
          const replies = db.replies.filter((r) => r.questionId === q.id);
          return (
            <div key={q.id} style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
              <div className="row">
                <b className="grow">“{q.text}”</b>
                <span className={`tag ${q.status === "open" ? "" : "gray"}`}>{q.status === "open" ? untilDeadline(q.deadline) : "마감"}</span>
              </div>
              <p className="muted">
                {TYPE_LABEL[q.type]}
                {q.options?.length ? ` · ${q.options.join(" / ")}` : ""} · {timeAgo(q.createdAt)}
              </p>
              <ul className="plain" style={{ margin: "6px 0 10px" }}>
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
                        <span className="muted">답 없음 · {origin}/f/{c.token}/q/{q.id}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {q.status === "open" ? (
                <form action={closeQuestion}>
                  <input type="hidden" name="questionId" value={q.id} />
                  <button className="btn small">마감하고 엄마께 보낼 요약 만들기</button>
                </form>
              ) : (
                q.summary && (
                  <>
                    <div className="sms">
                      📱 문자 ({q.summary.sms.length}자): {q.summary.sms}
                    </div>
                    <div className="sms">📞 ARS: {q.summary.long}</div>
                  </>
                )
              )}
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>📋 이번 주 요약 {thisWeek ? <span className="tag ok">발행됨</span> : <span className="tag">통화 기록으로 초안</span>}</h2>
        <form action={saveReport}>
          <input type="hidden" name="familyId" value={id} />
          <label className="field">3줄 요약 (한 줄에 하나)</label>
          <textarea name="summary" defaultValue={draft.summary.join("\n")} required />
          <label className="field">이번 주 물어볼 것 3가지</label>
          <textarea name="topics" defaultValue={draft.topics.join("\n")} />
          <div className="row">
            <select name="mood" defaultValue={draft.mood} className="grow">
              <option>좋음</option>
              <option>보통</option>
              <option>조금 걱정</option>
            </select>
            <input type="text" name="answered" defaultValue={draft.calls.answered} inputMode="numeric" className="grow" aria-label="받은 콜" />
            <input type="text" name="scheduled" defaultValue={draft.calls.scheduled} inputMode="numeric" className="grow" aria-label="예정 콜" />
          </div>
          <button className="btn">{thisWeek ? "고쳐서 다시 발행" : "형제 가족방에 발행"}</button>
        </form>
      </section>

      <section className="card">
        <h2>🧠 기억 노트 <span className="tag gray">다음 통화에 주입</span></h2>
        <ul className="plain" style={{ marginBottom: 10 }}>
          {memories.map((m) => (
            <li key={m.id} className="row">
              <span className="grow">{m.text}</span>
              <form action={deleteMemory}>
                <input type="hidden" name="id" value={m.id} />
                <button className="btn small secondary" aria-label="기억 노트 삭제">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addMemory} className="row">
          <input type="hidden" name="familyId" value={id} />
          <input type="text" name="text" placeholder="예: 막내 11월 이사" className="grow" />
          <button className="btn small" style={{ marginBottom: 12 }}>
            추가
          </button>
        </form>
      </section>

      <section className="card">
        <h2>📖 회상 이야기 <span className="tag gray">{stories.length}편</span></h2>
        <p className="muted">다음 회상 질문: “{nextMemory.q}”</p>
        <ul className="plain" style={{ margin: "10px 0" }}>
          {stories.map((s) => (
            <li key={s.id}>
              <span className="tag">{s.topic}</span> {s.text}
            </li>
          ))}
        </ul>
        <form action={addStory}>
          <input type="hidden" name="familyId" value={id} />
          <select name="topic" defaultValue={nextMemory.topic}>
            {MEMORY_QUESTIONS.map((m) => (
              <option key={m.topic}>{m.topic}</option>
            ))}
          </select>
          <textarea name="text" placeholder="엄마가 들려주신 이야기" />
          <button className="btn secondary">이야기 저장</button>
        </form>
      </section>

      <section className="card">
        <h2>
          📮 우체통 <span className="tag">{mailbox.length}개 대기</span>
        </h2>
        {mailbox.length === 0 ? (
          <p className="muted">비었어요. 형제들에게 &ldquo;엄마 우체통이 비었어요&rdquo; 알림을 보낼 때예요.</p>
        ) : (
          <Link className="btn secondary" href={`/admin/f/${id}/ars`}>
            ARS 대본에서 들려드리기
          </Link>
        )}
      </section>

      <section className="card">
        <h2>👵 {parent.name} 정보 · 동의</h2>
        <p className="muted">
          {parent.phone} · {{ "2g": "2G폰", smart: "스마트폰", landline: "집전화" }[parent.phoneType ?? "2g"]}
          {parent.consent?.at && ` · 동의 기록 ${timeAgo(parent.consent.at)} (${parent.consent.how})`}
        </p>
        <form action={saveConsent} style={{ marginTop: 10 }}>
          <input type="hidden" name="familyId" value={id} />
          <label className="check">
            <input type="checkbox" name="recording" defaultChecked={parent.consent?.recording} /> 통화 녹음에 동의하셨어요
          </label>
          <label className="check">
            <input type="checkbox" name="summaryToChildren" defaultChecked={parent.consent?.summaryToChildren} /> 요약을 자녀들에게 보내는 데 동의하셨어요
          </label>
          <input type="text" name="how" placeholder="동의 방법 (예: 첫 통화 음성 동의, 10/19)" defaultValue={parent.consent?.how} />
          <input type="text" name="callTimes" placeholder="안부콜 시간" defaultValue={parent.callTimes} />
          <textarea name="notes" placeholder="통화 설정 메모" defaultValue={parent.notes} />
          <button className="btn secondary">저장</button>
        </form>
      </section>

      <section className="card">
        <h2>🔗 형제 링크 · 알림톡 문구</h2>
        <p className="muted">알림톡 연동 전에는 아래 문구를 카톡으로 직접 보내세요.</p>
        {children.map((c) => (
          <div key={c.id} style={{ marginTop: 12 }}>
            <div className="row">
              <b className="grow">
                {c.role} {c.name} {c.payer && <span className="tag">대표 결제</span>}
              </b>
              <Link className="btn small secondary" href={`/f/${c.token}`}>
                열기
              </Link>
            </div>
            <p className="muted">
              {c.phone ?? "번호 없음"} · 연결 가능 {c.availableHours ?? "미설정"} · 알림 {c.notify?.weekly === false ? "주간 끔" : "주간"}/
              {c.notify?.questions === false ? "질문 끔" : "질문"}
            </p>
            <textarea className="copy" readOnly defaultValue={weeklyMsg(c.token, c.name)} />
          </div>
        ))}
      </section>
    </>
  );
}
