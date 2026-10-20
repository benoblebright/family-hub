import Link from "next/link";
import { notFound } from "next/navigation";
import { findChild } from "@/lib/db";
import { familyNow, openCheckin, processFamily, RULES } from "@/lib/checkin";
import { kstDate, kstLabel, kstTime } from "@/lib/format";
import { simCall, simForward, simReset, simSend } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL = { sms_out: "문자 발송", sms_in: "엄마 문자", call_out: "확인콜", call_in: "통화", alert: "형제 알림", system: "시스템" } as const;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export default async function Simulator({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const first = await findChild(token);
  if (!first) notFound();
  await processFamily(first.family.id);

  const { db, family, parent } = (await findChild(token))!;
  const now = familyNow(family);
  const offset = family.simOffsetMin ?? 0;
  const events = db.events.filter((e) => e.familyId === family.id && new Date(e.at).getTime() <= now);
  const sms = events.filter((e) => e.kind === "sms_out" || e.kind === "sms_in").slice(-14);
  const ringing = db.checkins.find((c) => c.familyId === family.id && c.callAt && !c.callResult);
  const waiting = openCheckin(db, family.id, now);
  const today = kstDate(now);
  const dow = DOW[new Date(`${today}T12:00:00+09:00`).getUTCDay()];
  const T = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return (
    <>
      <div className="hello">
        <small>{family.name} · 실제 문자 대신 화면으로 재현해요</small>
        <h1>📱 {parent.name} 폰 시뮬레이터</h1>
      </div>

      <section className="card sim-clock">
        <div className="row">
          <div className="grow">
            <div className="muted">가상 시각 (KST)</div>
            <b style={{ fontSize: 22 }}>
              {Number(today.slice(5, 7))}월 {Number(today.slice(8, 10))}일 ({dow}) {kstTime(now)}
            </b>
            {offset > 0 && <div className="muted">실제보다 {offset >= 1440 ? `${Math.floor(offset / 1440)}일 ` : ""}{Math.floor((offset % 1440) / 60)}시간 {offset % 60}분 앞</div>}
          </div>
          {waiting && !ringing && <span className="tag warn">답 기다리는 중</span>}
          {ringing && <span className="tag">확인콜 중</span>}
        </div>
        <div className="ff">
          <form action={simForward}>
            {T("token", token)}
            {T("minutes", "30")}
            <button className="btn small secondary">+30분</button>
          </form>
          <form action={simForward}>
            {T("token", token)}
            {T("minutes", "120")}
            <button className="btn small secondary">+2시간</button>
          </form>
          <form action={simForward}>
            {T("token", token)}
            {T("minutes", "next")}
            <button className="btn small">⏩ 다음 안부 문자 ({parent.checkinTime ?? "09:00"})</button>
          </form>
          <form action={simReset}>
            {T("token", token)}
            <button className="btn small secondary">↺ 지금으로</button>
          </form>
        </div>
      </section>

      <div className="phone">
        <div className="phone-top">
          <span>{kstTime(now)}</span>
          <span>📶 🔋</span>
        </div>
        <div className="phone-screen">
          {ringing ? (
            <div className="incoming">
              <div className="muted">걸려오는 전화</div>
              <b>가족방 (AI 확인콜)</b>
              <p className="muted">&ldquo;{parent.name}, 오늘 문자에 답이 없으셔서 전화드렸어요. 별일 없으시죠?&rdquo;</p>
              <div className="row">
                <form action={simCall} className="grow">
                  {T("token", token)}
                  {T("answer", "yes")}
                  <button className="btn ok">받기</button>
                </form>
                <form action={simCall} className="grow">
                  {T("token", token)}
                  {T("answer", "no")}
                  <button className="btn secondary">거절</button>
                </form>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                그냥 두면 {RULES.alertAfterMin}분 뒤 형제들에게 알림이 가요
              </p>
            </div>
          ) : sms.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>
              아직 문자가 없어요.
              <br />⏩ 버튼으로 다음 안부 문자 시각까지 가 보세요.
            </p>
          ) : (
            sms.map((e) => (
              <div key={e.id} className={`bubble ${e.kind === "sms_in" ? "me" : ""}`}>
                {e.text}
                <span>{kstLabel(e.at)}</span>
              </div>
            ))
          )}
        </div>
        <div className="keypad">
          {(["1", "2", "3"] as const).map((n) => (
            <form action={simSend} key={n}>
              {T("token", token)}
              {T("text", n)}
              <button className="key" aria-label={`${n} ${{ "1": "좋아", "2": "그냥", "3": "별로" }[n]}`}>
                {n}
                <small>{{ "1": "좋아", "2": "그냥", "3": "별로" }[n]}</small>
              </button>
            </form>
          ))}
        </div>
        <form action={simSend} className="phone-input">
          {T("token", token)}
          <input type="text" name="text" placeholder="자녀들에게 물어볼 말 (예: 김장 같이 할 사람?)" maxLength={80} aria-label="엄마가 보낼 문자" />
          <button className="btn small">전송</button>
        </form>
      </div>

      <section className="card">
        <h2>이렇게 동작해요</h2>
        <ol className="topics">
          <li>매일 {parent.checkinTime ?? "09:00"}에 안부 문자가 가요. 숫자 하나로 답하시면 끝.</li>
          <li>{RULES.resendAfterMin / 60}시간 안에 답이 없으면 재문자, 그 뒤 {RULES.callAfterMin}분 안에도 없으면 AI 확인콜.</li>
          <li>확인콜을 안 받으시면 형제 모두에게 알림이 가요.</li>
          <li>&lsquo;3 별로&rsquo;라고 하시면 형제들에게 &ldquo;전화 한 통 어떠세요&rdquo; 알림.</li>
          <li>숫자가 아닌 글은 형제들에게 질문으로 가고, 답이 모이면 {RULES.smsMaxChars}자 이내 요약 문자가 와요.</li>
        </ol>
      </section>

      <section className="card">
        <h2>
          이벤트 로그 <span className="tag gray">{events.length}건</span>
        </h2>
        <ul className="plain">
          {[...events]
            .reverse()
            .slice(0, 25)
            .map((e) => (
              <li key={e.id}>
                <span className={`tag ${e.kind === "alert" ? "warn" : e.kind === "sms_in" || e.kind === "call_in" ? "ok" : "gray"}`}>{KIND_LABEL[e.kind]}</span>{" "}
                <span className="muted">{kstLabel(e.at)}</span>
                <div>{e.text}</div>
              </li>
            ))}
        </ul>
      </section>

      <p className="footer">
        <Link href={`/f/${token}`}>← 가족 홈에서 결과 보기</Link>
      </p>
    </>
  );
}
