import { Icon } from "@/components/Icon";
import Link from "next/link";
import { readDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { familyKpi, pct } from "@/lib/kpi";
import { planName, PLANS, won } from "@/lib/plans";
import { timeAgo } from "@/lib/format";
import { AdminNav } from "@/components/AdminNav";
import { resetDemo, setLeadStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS = { trial: ["무료 체험", ""], active: ["유료", "ok"], paused: ["중지", "gray"] } as const;
const LEAD = { new: "신규", contacted: "연락함", onboarded: "등록됨", dropped: "보류" } as const;
const PHONE = { "2g": "폴더폰", smart: "스마트폰", landline: "집전화" } as const;

export default async function AdminHome() {
  await requireAdminPage();
  const db = await readDB();
  const hasAI = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

  // 체험 가족방(평가자·방문자가 만든 데모)은 목록에서 빼고 개수만 보여 준다
  const demoCount = db.families.filter((f) => f.demo).length;
  const rows = db.families.filter((f) => !f.demo).map((f) => ({
    f,
    parent: db.parents.find((p) => p.familyId === f.id),
    kpi: familyKpi(db, f.id),
    open: db.questions.filter((q) => q.familyId === f.id && q.status === "open").length,
  }));
  const paying = db.families.filter((f) => !f.demo && f.status === "active");
  const mrr = paying.reduce((s, f) => s + (PLANS.find((p) => p.id === f.plan)?.price ?? 0), 0);
  const totalSiblingCalls = rows.reduce((s, r) => s + r.kpi.siblingCalls, 0);
  const alerts = rows.filter((r) => r.kpi.missedStreak >= 2 || r.kpi.flags.length > 0);
  const leads = [...db.leads].reverse();

  return (
    <>
      <AdminNav current="home" />
      <div className="hello">
        <small>운영자 · 0~1단계 수동 운영</small>
        <h1>가족 안부 허브</h1>
      </div>

      <div className="kpis">
        <div className="kpi">
          <b>{rows.length}</b>
          <span>가족 (유료 {paying.length}) · 체험 가족방 {demoCount}개</span>
        </div>
        <div className="kpi">
          <b>{won(mrr)}</b>
          <span>월 구독 매출</span>
        </div>
        <div className="kpi">
          <b>{totalSiblingCalls}번</b>
          <span>최근 4주 엄마께 건 통화 (핵심 지표)</span>
        </div>
        <div className="kpi">
          <b>{db.leads.filter((l) => l.status === "new").length}명</b>
          <span>새 무료 신청</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <section className="card">
          <h2><Icon name="error" /> 확인할 가족</h2>
          <ul className="plain">
            {alerts.map(({ f, kpi }) => (
              <li key={f.id}>
                <Link href={`/admin/f/${f.id}`}>
                  <b>{f.name}</b>
                </Link>
                <div className="muted">
                  {kpi.missedStreak >= 2 && `안부콜 ${kpi.missedStreak}번 연속 미응답 · `}
                  {kpi.flags.map((x) => `${x.flag}(${timeAgo(x.at)})`).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>
          <Icon name="family_restroom" /> 가족 <span className="tag gray">AI {hasAI ? "Claude" : "템플릿"}</span>
        </h2>
        <ul className="plain">
          {rows.map(({ f, parent, kpi, open }) => (
            <li key={f.id}>
              <div className="row">
                <Link href={`/admin/f/${f.id}`} className="grow">
                  <b>{f.name}</b>
                </Link>
                <span className={`tag ${STATUS[f.status ?? "trial"][1]}`}>{STATUS[f.status ?? "trial"][0]}</span>
              </div>
              <div className="muted">
                {planName(f.plan)} · {parent?.callTimes ?? "콜 시간 미정"} · 응답률 {pct(kpi.answerRate)} · 평균 {kpi.avgMinutes ?? "–"}분 · 가족
                통화 {kpi.siblingCalls}번 · 답장률 {pct(kpi.replyRate)}
                {open > 0 && ` · 열린 질문 ${open}`}
                {!parent?.consent?.recording && " · 녹음 동의 전"}
              </div>
            </li>
          ))}
        </ul>
        <Link className="btn secondary" href="/admin/new" style={{ marginTop: 12 }}>
          + 새 가족 등록
        </Link>
        <form action={resetDemo} style={{ marginTop: 8 }}>
          <button className="btn small secondary"><Icon name="restart_alt" /> 데모 가족(엄마네 가족방) 처음 상태로</button>
        </form>
      </section>

      <section className="card">
        <h2>
          <Icon name="edit_note" /> 첫 달 무료 신청 <span className="tag">{leads.length}명</span>
        </h2>
        {leads.length === 0 && <p className="muted">아직 신청이 없어요. 랜딩페이지(/)를 지인들에게 공유해 보세요.</p>}
        <ul className="plain">
          {leads.map((l) => (
            <li key={l.id}>
              <div className="row">
                <span className="grow">
                  <b>{l.name}</b> {l.phone}
                </span>
                <span className={`tag ${l.status === "onboarded" ? "ok" : l.status === "dropped" ? "gray" : ""}`}>{LEAD[l.status]}</span>
              </div>
              <div className="muted">
                {timeAgo(l.createdAt)} · 가족 {l.siblings}명 · 부모님 {PHONE[l.parentPhone]} · {planName(l.plan)}
                {l.memo && ` · ${l.memo}`}
              </div>
              {l.status !== "onboarded" && (
                <div className="row" style={{ marginTop: 6 }}>
                  <Link className="btn small" href={`/admin/new?lead=${l.id}`}>
                    가족으로 등록
                  </Link>
                  {(["contacted", "dropped"] as const).map((s) => (
                    <form action={setLeadStatus} key={s}>
                      <input type="hidden" name="leadId" value={l.id} />
                      <input type="hidden" name="status" value={s} />
                      <button className="btn small secondary" disabled={l.status === s}>
                        {LEAD[s]}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
