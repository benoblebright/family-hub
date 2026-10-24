import { Icon } from "@/components/Icon";
import Link from "next/link";
import { headers } from "next/headers";
import { loadFamilyPage } from "@/lib/family-page";
import { josa, kstAt, kstDate, kstLabel, timeAgo, untilDeadline, weekStart } from "@/lib/format";
import { CallCheckForm } from "@/components/Forms";
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
  const { db, child, family, parent, siblings, now } = await loadFamilyPage(token);
  const today = kstDate(now);
  const checkins = db.checkins.filter((c) => c.familyId === family.id);
  const todayCheckin = checkins.find((c) => c.date === today);
  const alerts = db.events
    .filter((e) => e.familyId === family.id && e.kind === "alert" && new Date(e.at).getTime() <= now && now - new Date(e.at).getTime() < 3 * 86400_000)
    .sort((a, b) => b.at.localeCompare(a.at)); // 최신 알림 먼저
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const report = db.reports.filter((r) => r.familyId === family.id).at(-1);
  const questions = db.questions.filter((q) => q.familyId === family.id).reverse();
  const open = questions.filter((q) => q.status === "open");

  const since = weekStart(now);
  const siblingIds = new Set(siblings.map((s) => s.id));
  const weekChecks = db.checks.filter((c) => siblingIds.has(c.childId) && new Date(c.createdAt) >= since);

  return (
    <>
      <div className="hello">
        <small>
          {Number(today.slice(5, 7))}월 {Number(today.slice(8, 10))}일 ({["일", "월", "화", "수", "목", "금", "토"][new Date(`${today}T12:00:00+09:00`).getUTCDay()]})
        </small>
        <h1>
          {child.name}님, {parent.name} 이번 주 소식이에요
        </h1>
      </div>

      {(welcome || child.payer) && siblings.length > 1 && (
        <InviteCard origin={origin} me={child} siblings={siblings} familyName={family.name} motherName={parent.name} open={Boolean(welcome)} />
      )}

      {alerts.slice(0, 2).map((a) => (
        <div key={a.id} className="alert-card" role="status">
          <Icon name="notifications_active" fill />
          <span>
            {a.text.replace(/^[^\p{L}\p{N}]+/u, "")}
            <span className="muted" style={{ display: "block", color: "inherit", opacity: 0.8 }}>
              {kstLabel(a.at)}
            </span>
          </span>
        </div>
      ))}

      <section className="card">
        <h2>
          <Icon name="wb_sunny" /> 오늘 {parent.name} 안부
          <span className={`tag ${todayCheckin?.answer === 3 || todayCheckin?.callResult === "missed" ? "warn" : todayCheckin?.answer || todayCheckin?.callResult === "answered" ? "ok" : "gray"}`}>
            {!todayCheckin
              ? `${kstAt(today, parent.checkinTime ?? "09:00").getTime() > now ? "오늘" : "내일"} ${parent.checkinTime ?? "09:00"} 문자 예정`
              : todayCheckin.answer
                ? ["", "좋아", "그냥", "별로"][todayCheckin.answer]
                : todayCheckin.callResult === "answered"
                  ? "확인콜로 확인"
                  : todayCheckin.callResult === "missed"
                    ? "응답 없음"
                    : "답 기다리는 중"}
          </span>
        </h2>
        <ResponseCalendar checkins={checkins} today={today} />
      </section>

      {open.length > 0 && (
        <Link href={`/f/${token}/questions`} className="card link-card">
          <h2>
            <Icon name="forum" /> {josa(parent.name, "이", "가")} 물어보셨어요
            <span className="tag">{open.length}개</span>
          </h2>
          <div className="question">“{open[0].text}”</div>
          <span className="muted">
            {untilDeadline(open[0].deadline, now)} · 질문 탭에서 답장하기 <Icon name="chevron_right" />
          </span>
        </Link>
      )}

      {report && (
        <section className="card">
          <h2>
            <Icon name="summarize" /> AI 안부콜 주간 요약
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
          <h2><Icon name="forum" /> 이번 주 {parent.name}께 물어볼 것</h2>
          <ol className="topics">
            {report.topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h2>
          <Icon name="call" /> 이번 주 누가 통화했나
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

      <p className="footer">가족 안부 허브 · 링크는 {child.name}님 전용이에요</p>
    </>
  );
}
