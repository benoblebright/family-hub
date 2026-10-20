import type { Checkin, DB, SimEvent } from "./types";
import { addDays, kstAt, kstDate, weekStart } from "./format";

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const plus = (iso: Date, min: number) => new Date(iso.getTime() + min * 60_000).toISOString();

// 지난 3주 안부 문자 기록 — 가족 홈 캘린더가 처음부터 비어 보이지 않게
function demoCheckins(familyId: string): { checkins: Checkin[]; events: SimEvent[] } {
  const pattern: (1 | 2 | 3 | "call" | "miss")[] = [1, 1, 2, 1, "call", 1, 2, 2, 1, 3, 1, 1, "miss", 2, 1, 1, 2, 1, 1, "call"];
  const today = kstDate();
  const checkins: Checkin[] = [];
  const events: SimEvent[] = [];
  pattern.forEach((p, i) => {
    const date = addDays(today, i - pattern.length); // 어제까지
    const sent = kstAt(date, "09:00");
    const c: Checkin = { id: `ck${i}`, familyId, date, sentAt: sent.toISOString() };
    if (typeof p === "number") {
      c.answer = p;
      c.answeredAt = plus(sent, 20 + i);
    } else {
      c.resentAt = plus(sent, 120);
      c.callAt = plus(sent, 180);
      c.callResult = p === "call" ? "answered" : "missed";
      if (p === "miss") c.alertedAt = plus(sent, 210);
    }
    checkins.push(c);
  });
  const last = checkins.at(-1)!;
  events.push({ id: "ev0", familyId, at: last.sentAt, kind: "system", text: "데모 데이터: 지난 3주 안부 문자 기록이 들어 있어요." });
  return { checkins, events };
}

// 데모 가족 1개 (0단계: 어머님 1가구)
export function seed(): DB {
  const familyId = "fam1";
  const { checkins, events } = demoCheckins(familyId);
  return {
    families: [{ id: familyId, name: "엄마네 가족방", plan: "standard", status: "trial", createdAt: hoursFromNow(-24 * 21), simOffsetMin: 0 }],
    parents: [
      {
        id: "p1",
        familyId,
        name: "엄마",
        phone: "010-0000-0000",
        checkinTime: "09:00",
        callTimes: "화·목·토 오전 10시",
        phoneType: "2g",
        notes: "말씀이 느리셔서 끝까지 기다려 드리기. 오른쪽 귀가 잘 안 들리심.",
        consent: { recording: true, summaryToChildren: true, at: hoursFromNow(-24 * 20), how: "첫 통화 음성 동의" },
      },
    ],
    children: [
      { id: "c1", familyId, name: "민수", role: "큰아들", token: "minsu-demo", payer: true, availableHours: "19:00-22:00", notify: { weekly: true, questions: true } },
      { id: "c2", familyId, name: "지영", role: "딸", token: "jiyoung-demo", availableHours: "12:00-13:00", notify: { weekly: true, questions: true } },
      { id: "c3", familyId, name: "준호", role: "막내", token: "junho-demo", notify: { weekly: true, questions: true } },
    ],
    questions: [
      {
        id: "q1",
        familyId,
        text: "이번 추석에 다들 언제 오니?",
        source: "sms",
        type: "schedule",
        options: ["토요일", "일요일", "월요일", "못 가요"],
        deadline: hoursFromNow(6),
        status: "open",
        createdAt: hoursFromNow(-3),
      },
    ],
    replies: [
      {
        id: "r1",
        questionId: "q1",
        childId: "c1",
        choice: "토요일",
        text: "토요일 오전에 갈게요. 애들은 일요일에 와요",
        hideFromMom: false,
        createdAt: hoursFromNow(-2),
      },
    ],
    checks: [{ id: "k1", childId: "c2", memo: "김장 얘기 했어요", createdAt: hoursFromNow(-30) }],
    mailbox: [],
    reports: [
      {
        id: "w1",
        familyId,
        weekOf: kstDate(weekStart()),
        summary: [
          "식사는 하루 두 끼 잘 챙기고 계세요.",
          "무릎이 조금 쑤셔서 이번 주는 노인정에 한 번만 가셨어요.",
          "옆집 할머니랑 김장 날짜를 의논 중이세요.",
        ],
        topics: [
          "무릎은 좀 어떠세요? 병원은 언제 가세요?",
          "옆집 할머니랑 김장 날짜 정하셨어요?",
          "첫 월급 받던 날 기억나세요? (지난 통화에서 얘기하다 끊겼어요)",
        ],
        mood: "보통",
        calls: { answered: 2, scheduled: 3 },
      },
    ],
    calls: [
      { id: "a1", familyId, at: hoursFromNow(-24 * 4), kind: "regular", answered: true, minutes: 4, summary: "아침은 된장국. 무릎이 쑤셔 노인정은 쉬심.", mood: "보통", flags: ["건강 언급"] },
      { id: "a2", familyId, at: hoursFromNow(-24 * 2), kind: "regular", answered: false, minutes: 0, flags: [] },
      { id: "a3", familyId, at: hoursFromNow(-3), kind: "regular", answered: true, minutes: 5, summary: "옆집 할머니랑 김장 날짜 의논. 추석에 누가 오는지 물어보심.", mood: "좋음", flags: [] },
    ],
    memories: [
      { id: "m1", familyId, text: "손주 서준(민수 아들) 10월 말 운동회", createdAt: hoursFromNow(-24 * 6) },
      { id: "m2", familyId, text: "옆집 박씨 할머니와 매년 김장 같이 하심", createdAt: hoursFromNow(-3) },
    ],
    stories: [
      { id: "s1", familyId, topic: "첫 직장", text: "열아홉에 읍내 방직공장 다니셨는데, 첫 월급으로 외할머니 고무신을 사드렸대요.", createdAt: hoursFromNow(-24 * 4) },
    ],
    leads: [],
    checkins,
    events,
  };
}
