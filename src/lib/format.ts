// 받침 여부로 조사 고르기: 큰아들이랑 / 막내랑
export function josa(word: string, withBatchim: string, without: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return word + without;
  return word + (code % 28 ? withBatchim : without);
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function untilDeadline(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 60000;
  if (diff <= 0) return "마감됨";
  if (diff < 60) return `${Math.ceil(diff)}분 뒤 마감`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 뒤 마감`;
  return `${Math.floor(diff / 1440)}일 뒤 마감`;
}

export function weekStart(d = new Date()) {
  const day = d.getDay() || 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - day + 1);
  return m;
}
