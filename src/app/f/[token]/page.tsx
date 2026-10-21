import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { findChild } from "@/lib/db";
import { familyNow, processFamily } from "@/lib/checkin";
import { josa, kstDate, kstLabel, timeAgo, untilDeadline, weekStart } from "@/lib/format";
import { CallCheckForm, MailboxForm } from "@/components/Forms";
import { ResponseCalendar } from "@/components/ResponseCalendar";
import { InviteCard } from "@/components/InviteCard";

export const dynamic = "force-dynamic";

const MOOD_TAG = { 좋음: "ok", 보통: "gray", "조금 걱정": "warn" } as const;

// 가족 대시보드 — 주간 알림톡 링크로 들어오는 가족 공동 공간
export default async function FamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { token } = await params;
  const { welcome } = await searchParams;
  const first = await findChild(token);
  if (!first) notFound();
  // 안부 문자 흐름(재문자·확인콜·알림)과 마감된 질문을 먼저 처리한다
  await processFamily(first.family.id);
  const { db, child, family, parent, siblings } = (await findChild(token))!;
  const now = familyNow(family);
  const today = kstDate(now);
  const checkins = db.checkins.filter((c) => c.familyId === family.id);
  const todayCheckin = checkins.find((c) => c.date === today);
  const alerts = db.events
    .filter((e) => e.familyId === family.id && e.kind === "alert" && new Date(e.at).getTime() <= now && now - new Date(e.at).getTime() < 3 * 86400_000)
    .reverse();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const report = db.reports.filter((r) => r.familyId === family.id).at(-1);
  const questions = db.questions.filter((q) => q.familyId === family.id).reverse();
  const open = questions.filter((q) => q.status === "open");
  const closed = questions.filter((q) => q.status === "closed").slice(0, 3);

  const since = weekStart(now);
  const siblingIds = new Set(siblings.map((s) => s.id));
  const weekChecks = db.checks.filter((c) => siblingIds.has(c.childId) && new Date(c.createdAt) >= since);
  const mailbox = db.mailbox.filter((m) => siblingIds.has(m.childId)).reverse();
  const unplayed = mailbox.filter((m) => !m.played).length;
  const nameOf = (id: string) => siblings.find((s) => s.id === id)?.role ?? "";

  return (
    <>
      <div className="hello">
        <small>{family.name}</small>
        <h1>
          {child.name}님, {parent.name} 이번 주 소식이에요
        </h1>
      </div>

      {(welcome || child.payer) && siblings.length > 1 && (
        <InviteCard origin={origin} me={child} siblings={siblings} familyName={family.name} motherName={parent.name} open={Boolean(welcome)} />
      )}

      {alerts.slice(0, 2).map((a) => (
        <div key={a.id} className="alert-card">
          {a.text}
          <span className="muted"> · {kstLabel(a.at)}</span>
        </div>
      ))}

      <section className="card">
        <h2>
          ☀️ 오늘 {parent.name} 안부
          <span className={`tag ${todayCheckin?.answer === 3 || todayCheckin?.callResult === "missed" ? "warn" : todayCheckin?.answer || todayCheckin?.callResult === "answered" ? "ok" : "gray"}`}>
            {!todayCheckin
              ? `${parent.checkinTime ?? "09:00"} 문자 예정`
              : todayCheckin.answer
                ? ["", "좋아 😊", "그냥 😐", "별로 😟"][todayCheckin.answer]
                : todayCheckin.callResult === "answered"
                  ? "확인콜로 확인"
                  : todayCheckin.callResult === "missed"
                    ? "응답 없음"
                    : "답 기다리는 중"}
          </span>
        </h2>
        <ResponseCalendar checkins={checkins} today={today} />
        <Link className="btn secondary" href={`/f/${token}/sim`} style={{ marginTop: 12 }}>
          📱 {parent.name} 폰 시뮬레이터 열기
        </Link>
      </section>

      {open.map((q) => {
        const answered = new Set(db.replies.filter((r) => r.questionId === q.id).map((r) => r.childId));
        const mineDone = answered.has(child.id);
        return (
          <section className="card" key={q.id}>
            <h2>
              💌 {josa(parent.name, "이", "가")} 물어보셨어요
              <span className="tag">{untilDeadline(q.deadline, now)}</span>
            </h2>
            <div className="question">“{q.text}”</div>
            <p className="muted">
              {siblings.length}명 중 {answered.size}명 답함
              {!mineDone && " · 아직 내 답이 없어요"}
            </p>
            <Link className={`btn ${mineDone ? "secondary" : ""}`} href={`/f/${token}/q/${q.id}`}>
              {mineDone ? "답장 보기·고치기" : "답장하기"}
            </Link>
          </section>
        );
      })}

      {report && (
        <section className="card">
          <h2>
            📋 AI 안부콜 주간 요약
            <span className={`tag ${MOOD_TAG[report.mood]}`}>기분 {report.mood}</span>
          </h2>
          <ul className="plain">
            {report.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 10 }}>
            이번 주 안부콜 {report.calls.scheduled}번 중 {report.calls.answered}번 받으셨어요.
          </p>
        </section>
      )}

      {report && (
        <section className="card">
          <h2>💬 이번 주 {parent.name}께 물어볼 것</h2>
          <ol className="topics">
            {report.topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h2>
          📞 이번 주 누가 통화했나
          <span className="tag ok">{weekChecks.length}번</span>
        </h2>
        <ul className="plain" style={{ marginBottom: 14 }}>
          {siblings.map((s) => {
            const mine = weekChecks.filter((c) => c.childId === s.id);
            const last = mine.at(-1);
            return (
              <li key={s.id} className="row">
                <span className="avatar">{s.role.slice(0, 1)}</span>
                <span className="grow">
                  <b>{s.role}</b> {s.id === child.id && <span className="muted">(나)</span>}
                  <br />
                  <span className="muted">
                    {last ? `${timeAgo(last.createdAt)}${last.memo ? ` · ${last.memo}` : ""}` : "이번 주 아직"}
                  </span>
                </span>
                {mine.length > 0 ? <span className="tag ok">{mine.length}번</span> : <span className="tag gray">0번</span>}
              </li>
            );
          })}
        </ul>
        <CallCheckForm token={token} motherName={parent.name} />
      </section>

      <section className="card">
        <h2>
          📮 {parent.name} 우체통
          <span className="tag">{unplayed > 0 ? `안 들으신 소식 ${unplayed}개` : "비었어요"}</span>
        </h2>
        <p className="muted">
          {josa(parent.name, "이", "가")} 대표번호로 전화하시면 1번 &lsquo;소식 듣기&rsquo;로 여기 남긴 목소리를 들으세요.
          {unplayed === 0 && " 들을 거리가 있어야 먼저 전화하세요!"}
        </p>
        {mailbox.length > 0 && (
          <ul className="plain" style={{ margin: "10px 0 14px" }}>
            {mailbox.slice(0, 4).map((m) => (
              <li key={m.id}>
                <b>{nameOf(m.childId)}</b> <span className="muted">· {timeAgo(m.createdAt)}</span>{" "}
                {m.played ? <span className="tag gray">들으심</span> : <span className="tag">대기</span>}
                {m.text && <div>{m.text}</div>}
                {m.audio && <audio src={`/api/audio/${m.audio}`} controls style={{ width: "100%", height: 36 }} />}
              </li>
            ))}
          </ul>
        )}
        <MailboxForm token={token} />
      </section>

      {closed.length > 0 && (
        <section className="card">
          <h2>✅ 지난 질문</h2>
          <ul className="plain">
            {closed.map((q) => (
              <li key={q.id}>
                <Link href={`/f/${token}/q/${q.id}`}>“{q.text}”</Link>
                {q.summary && <div className="muted">→ {q.summary.sms}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row" style={{ marginTop: 6 }}>
        <Link className="btn secondary" href={`/f/${token}/news`}>
          📰 이달의 가족신문
        </Link>
        <Link className="btn secondary" href={`/f/${token}/settings`}>
          ⚙️ 내 설정
        </Link>
      </div>

      <p className="footer">가족 안부 허브 · 링크는 {child.name}님 전용이에요</p>
    </>
  );
}
