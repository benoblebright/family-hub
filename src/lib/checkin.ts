import "server-only";
import type { Checkin, DB, Family, SimEvent } from "./types";
import { addDays, kstAt, kstDate } from "./format";
import { newId, readDB, updateDB } from "./db";
import { classifyQuestion, summarizeReplies } from "./ai";

// 안부 문자 흐름 규칙 (요구사항 R3-1 ~ R3-6)
export const RULES = {
  resendAfterMin: 120, // 2시간 안에 답이 없으면 재문자
  callAfterMin: 60, // 재문자 후 1시간 안에도 없으면 AI 확인콜
  alertAfterMin: 30, // 확인콜을 30분 안에 안 받으면 가족 알림
  smsMaxChars: 45, // 2G폰 단문 기준
};

const MIN = 60_000;
const iso = (t: number) => new Date(t).toISOString();

/** 가족별 가상 시계 (시뮬레이터 빨리감기 반영) */
export function familyNow(f: Pick<Family, "simOffsetMin">) {
  return Date.now() + (f.simOffsetMin ?? 0) * MIN;
}

export function checkinTimeOf(db: DB, familyId: string) {
  return db.parents.find((p) => p.familyId === familyId)?.checkinTime ?? "09:00";
}

export function pushEvent(db: DB, familyId: string, at: number, kind: SimEvent["kind"], text: string) {
  db.events.push({ id: newId(), familyId, at: iso(at), kind, text });
}

const momName = (db: DB, familyId: string) => db.parents.find((p) => p.familyId === familyId)?.name ?? "엄마";

/** 답을 기다리는 오늘(또는 가장 최근) 안부 문자 */
export function openCheckin(db: DB, familyId: string, now: number): Checkin | undefined {
  return db.checkins
    .filter((c) => c.familyId === familyId && !c.answer && c.callResult !== "answered" && !c.alertedAt && new Date(c.sentAt).getTime() <= now)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    .at(-1);
}

/** 마지막 처리 시각부터 now까지 일어났어야 할 일을 시간 순서대로 처리한다 */
export function tick(db: DB, familyId: string, now: number) {
  const family = db.families.find((f) => f.id === familyId);
  if (!family) return;
  const from = family.lastTick ? new Date(family.lastTick).getTime() : now;
  const time = checkinTimeOf(db, familyId);
  const mom = momName(db, familyId);

  // 1) 지난 구간 안에 들어온 안부 문자 발송 시각마다 문자 보내기
  for (let d = kstDate(from); d <= kstDate(now); d = addDays(d, 1)) {
    const send = kstAt(d, time).getTime();
    if (send <= from || send > now) continue;
    if (db.checkins.some((c) => c.familyId === familyId && c.date === d)) continue;
    db.checkins.push({ id: newId(), familyId, date: d, sentAt: iso(send) });
    pushEvent(db, familyId, send, "sms_out", `[가족방] ${mom}, 좋은 아침이에요. 오늘 기분은? 1좋아 2그냥 3별로`);
  }

  // 2) 답이 없는 안부 문자: 재문자 → 확인콜 → 가족 알림
  for (const c of db.checkins.filter((x) => x.familyId === familyId && !x.answer && !x.callResult)) {
    const sent = new Date(c.sentAt).getTime();
    if (!c.resentAt && now >= sent + RULES.resendAfterMin * MIN) {
      const t = sent + RULES.resendAfterMin * MIN;
      c.resentAt = iso(t);
      pushEvent(db, familyId, t, "sms_out", `[가족방] ${mom}, 아직 답이 없어 다시 여쭤요. 1좋아 2그냥 3별로`);
    }
    if (c.resentAt && !c.callAt && now >= new Date(c.resentAt).getTime() + RULES.callAfterMin * MIN) {
      const t = new Date(c.resentAt).getTime() + RULES.callAfterMin * MIN;
      c.callAt = iso(t);
      pushEvent(db, familyId, t, "call_out", "📞 AI 확인콜 발신 — 재문자에도 1시간 동안 답이 없으셨어요");
    }
    if (c.callAt && !c.callResult && now >= new Date(c.callAt).getTime() + RULES.alertAfterMin * MIN) {
      const t = new Date(c.callAt).getTime() + RULES.alertAfterMin * MIN;
      c.callResult = "missed";
      c.alertedAt = iso(t);
      pushEvent(db, familyId, t, "alert", `⚠️ ${mom}께서 오늘 안부 문자와 확인콜에 모두 답이 없으세요. 누구든 한 분이 전화해 주세요.`);
    }
  }

  family.lastTick = iso(now);
}

/** 엄마가 문자를 보냈을 때 (R3-2, R3-6, R3-7) — 질문이면 질문 텍스트를 돌려준다 */
export function momSms(db: DB, familyId: string, text: string, now: number): { question?: string } {
  const mom = momName(db, familyId);
  const t = text.trim();
  // 같은 문자를 15초 안에 또 보내면(두 번 누름) 무시한다
  const last = db.events.filter((e) => e.familyId === familyId && e.kind === "sms_in").at(-1);
  if (last && last.text === t && now - new Date(last.at).getTime() < 15_000) return {};
  pushEvent(db, familyId, now, "sms_in", t);
  const n = /^[1-3１-３]$/.test(t) ? (Number(t.replace(/[１-３]/, (x) => String(x.charCodeAt(0) - 0xff10))) as 1 | 2 | 3) : null;

  if (n) {
    const c = openCheckin(db, familyId, now);
    if (!c) {
      pushEvent(db, familyId, now, "sms_out", "[가족방] 고마워요! 내일 아침에 또 여쭐게요.");
      return {};
    }
    c.answer = n;
    c.answeredAt = iso(now);
    // 확인콜이 울리는 중에 문자로 답하셨으면 확인콜은 끊는다 (중복 처리 방지)
    if (c.callAt && !c.callResult) {
      c.callResult = "answered";
      pushEvent(db, familyId, now, "call_in", "📞 문자로 답하셔서 확인콜을 끊었어요");
    }
    if (n === 3) {
      c.alertedAt = iso(now);
      pushEvent(db, familyId, now, "sms_out", "[가족방] 그러셨구나. 가족방 사람들에게 전화드리라고 할게요.");
      pushEvent(db, familyId, now, "alert", `💛 ${mom}께서 오늘 '별로'라고 하셨어요. 전화 한 통 어떠세요?`);
    } else {
      pushEvent(db, familyId, now, "sms_out", `[가족방] 고마워요! ${n === 1 ? "좋은 하루 보내세요." : "가족방에 전할게요."}`);
    }
    return {};
  }

  pushEvent(db, familyId, now, "sms_out", "[가족방] 가족방 사람들에게 물어볼게요. 답이 모이면 문자로 알려드릴게요.");
  return { question: t };
}

/** 확인콜 받기·거절 (R3-5) */
export function momCall(db: DB, familyId: string, answer: boolean, now: number) {
  const c = db.checkins.find((x) => x.familyId === familyId && x.callAt && !x.callResult);
  if (!c) return;
  const mom = momName(db, familyId);
  if (answer) {
    c.callResult = "answered";
    pushEvent(db, familyId, now, "call_in", `📞 ${mom}께서 확인콜을 받으셨어요 — 안부 확인 완료`);
    db.calls.push({ id: newId(), familyId, at: iso(now), kind: "callback", answered: true, minutes: 2, summary: "아침 안부 문자 무응답 → 확인콜로 안부 확인", flags: [] });
  } else {
    c.callResult = "missed";
    c.alertedAt = iso(now);
    pushEvent(db, familyId, now, "call_in", "📞 확인콜 거절");
    pushEvent(db, familyId, now, "alert", `⚠️ ${mom}께서 안부 문자와 확인콜에 답이 없으세요. 누구든 한 분이 전화해 주세요.`);
  }
}

/** 가족 전원 답장 또는 마감 시각이 지난 질문 (R4-3) */
export function dueQuestions(db: DB, familyId: string, now: number) {
  const kids = db.children.filter((c) => c.familyId === familyId).map((c) => c.id);
  return db.questions.filter((q) => {
    if (q.familyId !== familyId || q.status !== "open") return false;
    if (new Date(q.deadline).getTime() <= now) return true;
    const answered = new Set(db.replies.filter((r) => r.questionId === q.id).map((r) => r.childId));
    return kids.every((k) => answered.has(k));
  });
}

/** 질문을 마감하고 요약을 만들어 엄마 폰으로 문자 발송 (R3-8) */
export async function closeQuestionWithSummary(questionId: string) {
  const db = await readDB();
  const q = db.questions.find((x) => x.id === questionId);
  if (!q || q.status === "closed") return;
  const family = db.families.find((f) => f.id === q.familyId)!;
  const parent = db.parents.find((p) => p.familyId === q.familyId)!;
  const children = db.children.filter((c) => c.familyId === q.familyId);
  const summary = await summarizeReplies(q, parent.name, children, db.replies.filter((r) => r.questionId === q.id));

  await updateDB((fresh) => {
    const target = fresh.questions.find((x) => x.id === questionId);
    if (!target || target.status === "closed") return;
    target.status = "closed";
    target.summary = summary;
    pushEvent(fresh, q.familyId, familyNow(family), "sms_out", `[가족방] ${summary.sms}`);
  });
}

/** 페이지·액션 진입 시 호출: 시간 흐름 처리 + 마감된 질문 요약 */
// 읽기 1번으로 끝내는 게 기본: 일어날 일이 없으면 쓰지 않는다 (lastTick만 바뀌는 쓰기 생략)
// tick은 같은 날짜·같은 단계를 두 번 처리하지 않으므로, lastTick을 저장하지 않아도 결과가 같다.
export async function processFamily(familyId: string, base?: DB): Promise<DB> {
  let db = base ?? (await readDB());
  const f = db.families.find((x) => x.id === familyId);
  if (!f) return db;
  const now = familyNow(f);

  const draft = structuredClone(db);
  tick(draft, familyId, now);
  const changed =
    !f.lastTick || // 처음엔 기준 시각을 한 번 저장해야 이후 발송 시각을 셀 수 있다
    draft.events.length !== db.events.length || JSON.stringify(draft.checkins) !== JSON.stringify(db.checkins);
  if (changed) db = await updateDB((fresh) => (tick(fresh, familyId, now), fresh));

  const due = dueQuestions(db, familyId, now);
  for (const q of due) await closeQuestionWithSummary(q.id);
  return due.length ? await readDB() : db;
}

/** 엄마 질문 열기 — 가족 시계 기준으로 마감 시각을 잡는다 */
export async function openMomQuestion(familyId: string, text: string, source: "call" | "sms" | "ars", hours = 6) {
  const { type, options } = await classifyQuestion(text);
  await updateDB((db) => {
    const f = db.families.find((x) => x.id === familyId);
    if (!f) return;
    const now = familyNow(f);
    db.questions.push({
      id: newId(),
      familyId,
      text,
      source,
      type,
      options,
      deadline: iso(now + hours * 3600_000),
      status: "open",
      createdAt: iso(now),
    });
    pushEvent(db, familyId, now, "system", `💌 함께하는 사람들에게 질문을 보냈어요: “${text}” (${hours}시간 뒤 마감)`);
  });
}

/** 다음 안부 문자 발송 시각까지 남은 분 */
export function minutesToNextCheckin(db: DB, familyId: string, now: number) {
  const time = checkinTimeOf(db, familyId);
  let next = kstAt(kstDate(now), time).getTime();
  if (next <= now) next = kstAt(addDays(kstDate(now), 1), time).getTime();
  return Math.ceil((next - now) / MIN) + 1;
}
