// 받침 여부로 조사 고르기: 큰아들이랑 / 막내랑
export function josa(word: string, withBatchim: string, without: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return word + without;
  return word + (code % 28 ? withBatchim : without);
}

// ---- 한국 시간(KST) ----
// Vercel 서버는 UTC로 돌기 때문에, 날짜·요일 계산은 반드시 KST로 환산해서 한다.
const KST_MS = 9 * 3600_000;

/** ISO 또는 Date → KST 기준 "YYYY-MM-DD" */
export function kstDate(t: string | number | Date = Date.now()) {
  return new Date(new Date(t).getTime() + KST_MS).toISOString().slice(0, 10);
}

/** ISO → KST "HH:MM" */
export function kstTime(t: string | number | Date) {
  return new Date(new Date(t).getTime() + KST_MS).toISOString().slice(11, 16);
}

/** KST 날짜 "YYYY-MM-DD" + "HH:MM" → 실제 시각(Date) */
export function kstAt(date: string, hhmm: string) {
  return new Date(`${date}T${hhmm.padStart(5, "0")}:00+09:00`);
}

/** KST 날짜에 n일 더하기 */
export function addDays(date: string, n: number) {
  return kstDate(kstAt(date, "12:00").getTime() + n * 86400_000);
}

/** 이번 주 월요일 00:00 (KST) */
export function weekStart(now: number = Date.now()) {
  const today = kstDate(now);
  const dow = new Date(`${today}T12:00:00+09:00`).getUTCDay() || 7; // 월=1 … 일=7
  return kstAt(addDays(today, 1 - dow), "00:00");
}

/** <input type="datetime-local">용 KST 현재 시각 */
export function kstInputNow(now: number = Date.now()) {
  return new Date(now + KST_MS).toISOString().slice(0, 16);
}

/** datetime-local 값(KST로 입력됨) → ISO */
export function fromKstInput(v: string) {
  return new Date(`${v}:00+09:00`).toISOString();
}

export function kstLabel(t: string | number | Date) {
  const d = kstDate(t);
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))} ${kstTime(t)}`;
}

export function timeAgo(iso: string, now: number = Date.now()) {
  const diff = (now - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function untilDeadline(iso: string, now: number = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 60000;
  if (diff <= 0) return "마감됨";
  if (diff < 60) return `${Math.ceil(diff)}분 뒤 마감`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 뒤 마감`;
  return `${Math.floor(diff / 1440)}일 뒤 마감`;
}
