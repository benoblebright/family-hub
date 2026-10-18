import type { DB } from "./types";

// 기획에서 정한 주간 운영 지표 5개 + 이상 신호
export function familyKpi(db: DB, familyId: string, days = 28) {
  const since = Date.now() - days * 86400_000;
  const recent = <T extends { createdAt?: string; at?: string }>(x: T) => new Date(x.at ?? x.createdAt ?? 0).getTime() >= since;

  const childIds = new Set(db.children.filter((c) => c.familyId === familyId).map((c) => c.id));
  const calls = db.calls.filter((c) => c.familyId === familyId && recent(c)).sort((a, b) => a.at.localeCompare(b.at));
  const answered = calls.filter((c) => c.answered);
  const questions = db.questions.filter((q) => q.familyId === familyId && recent(q));
  const checks = db.checks.filter((c) => childIds.has(c.childId) && recent(c));

  let replyPairs = 0;
  for (const q of questions) replyPairs += new Set(db.replies.filter((r) => r.questionId === q.id).map((r) => r.childId)).size;
  const expectedPairs = questions.length * childIds.size;

  // 마지막 통화부터 거꾸로 세서 연속 미응답 횟수
  let missedStreak = 0;
  for (let i = calls.length - 1; i >= 0 && !calls[i].answered; i--) missedStreak++;

  const minutes = answered.reduce((s, c) => s + c.minutes, 0);
  return {
    days,
    callCount: calls.length,
    answerRate: calls.length ? Math.round((answered.length / calls.length) * 100) : null,
    avgMinutes: answered.length ? Math.round((minutes / answered.length) * 10) / 10 : null,
    totalMinutes: minutes,
    momQuestions: questions.length,
    siblingCalls: checks.length,
    replyRate: expectedPairs ? Math.round((replyPairs / expectedPairs) * 100) : null,
    missedStreak,
    lastCall: calls.at(-1),
    flags: calls.flatMap((c) => c.flags.map((f) => ({ flag: f, at: c.at }))).slice(-3),
  };
}

export const pct = (n: number | null) => (n === null ? "–" : `${n}%`);
