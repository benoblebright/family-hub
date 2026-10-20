import type { Checkin } from "@/lib/types";
import { addDays } from "@/lib/format";

// 최근 4주 엄마 응답 캘린더 (R4-1)
const DOW = ["월", "화", "수", "목", "금", "토", "일"];

function mark(c?: Checkin): [string, string, string] {
  if (!c) return ["", "·", "기록 없음"];
  if (c.answer === 1) return ["a1", "😊", "좋아"];
  if (c.answer === 2) return ["a2", "😐", "그냥"];
  if (c.answer === 3) return ["a3", "😟", "별로"];
  if (c.callResult === "answered") return ["a1", "📞", "확인콜로 확인"];
  if (c.callResult === "missed") return ["miss", "✕", "무응답 → 형제 알림"];
  return ["", "⏳", "답 기다리는 중"];
}

export function ResponseCalendar({ checkins, today }: { checkins: Checkin[]; today: string }) {
  const dow = new Date(`${today}T12:00:00+09:00`).getUTCDay() || 7;
  const start = addDays(today, -(21 + dow - 1)); // 3주 전 월요일부터
  const days: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d);
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const recent = days.slice(-7).map((d) => byDate.get(d));
  const answered = recent.filter((c) => c && (c.answer || c.callResult === "answered")).length;

  return (
    <>
      <div className="cal" role="grid" aria-label="최근 4주 안부 응답">
        {DOW.map((d) => (
          <div key={d} className="dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const [cls, icon, label] = mark(byDate.get(d));
          return (
            <div key={d} className={`day ${cls} ${d === today ? "today" : ""}`} title={`${d} ${label}`} aria-label={`${d} ${label}`}>
              <small>{Number(d.slice(8, 10))}</small>
              {icon}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span>😊 좋아</span>
        <span>😐 그냥</span>
        <span>😟 별로</span>
        <span>📞 확인콜</span>
        <span>✕ 무응답</span>
        <span>· 기록 없음</span>
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        최근 7일 중 {answered}일 응답하셨어요.
      </p>
    </>
  );
}
