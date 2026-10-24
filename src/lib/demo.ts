import "server-only";
import { readDB, updateDB } from "./db";
import { firestoreEnabled, getFirestore } from "./firebase";
import { cloneDemo } from "./seed";
import type { DB, Family } from "./types";

const MAX_AGE_H = 24;

// 데모 가족 하나를 새로 만든다 → 맏이(큰아들) 링크 토큰을 돌려준다
export async function createDemoFamily() {
  const { db: demo, familyId, eldest } = cloneDemo();
  await updateDB((db) => {
    for (const k of Object.keys(demo) as (keyof DB)[]) (db[k] as unknown[]).push(...(demo[k] as unknown[]));
  }, familyId);
  await cleanupDemos().catch((err) => console.error("체험 가족방 정리 실패:", err));
  return eldest.token;
}

// 한 가족에 속한 모든 문서를 지운다 (가족 범위로 읽은 db든 전체 db든 같은 결과)
function removeFamily(db: DB, familyId: string) {
  const kids = new Set(db.children.filter((c) => c.familyId === familyId).map((c) => c.id));
  const qs = new Set(db.questions.filter((q) => q.familyId === familyId).map((q) => q.id));
  db.families = db.families.filter((f) => f.id !== familyId);
  db.replies = db.replies.filter((r) => !qs.has(r.questionId));
  db.checks = db.checks.filter((c) => !kids.has(c.childId));
  db.mailbox = db.mailbox.filter((m) => !kids.has(m.childId));
  for (const k of ["parents", "children", "questions", "reports", "calls", "memories", "stories", "checkins", "events"] as const) {
    (db[k] as { familyId: string }[]) = (db[k] as { familyId: string }[]).filter((x) => x.familyId !== familyId);
  }
}

// 만든 지 24시간이 지난 체험 가족방을 한 번에 몇 개씩 지운다 (체험하기를 누를 때마다 조금씩)
export async function cleanupDemos(limit = 5) {
  const cutoff = Date.now() - MAX_AGE_H * 3600_000;
  const old = (f: Family) => f.demo === true && new Date(f.createdAt ?? 0).getTime() < cutoff;
  const families = firestoreEnabled()
    ? (await getFirestore().collection("families").where("demo", "==", true).get()).docs.map((d) => d.data() as Family)
    : (await readDB()).families;
  for (const f of families.filter(old).slice(0, limit)) await updateDB((db) => removeFamily(db, f.id), f.id);
}
