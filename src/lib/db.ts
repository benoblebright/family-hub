import "server-only";
import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { DB } from "./types";
import { seed } from "./seed";
import { firestoreEnabled, getBucket, getFirestore } from "./firebase";

// 저장소 두 가지:
//  - Firebase 키가 있으면 Firestore(+Cloud Storage) — Vercel 배포용
//  - 없으면 data/db.json 파일 — 로컬 개발용
// 화면 코드는 readDB / updateDB만 쓰고 어느 쪽인지 모른다.

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const AUDIO_DIR = path.join(DATA_DIR, "audio");

const COLLECTIONS = [
  "families",
  "parents",
  "children",
  "questions",
  "replies",
  "checks",
  "mailbox",
  "reports",
  "calls",
  "memories",
  "stories",
  "leads",
  "checkins",
  "events",
] as const satisfies readonly (keyof DB)[];

type Row = { id: string; [k: string]: unknown };

export const newId = () => randomUUID().slice(0, 8);
export const newToken = () => randomUUID().replace(/-/g, "").slice(0, 16);

// 예전 버전 데이터에 없는 컬렉션은 빈 배열로 채운다
function normalize(db: Partial<DB>): DB {
  for (const k of COLLECTIONS) (db as Record<string, unknown>)[k] ??= [];
  return db as DB;
}

// ---- 파일 저장소 ----

async function readFile(): Promise<DB> {
  try {
    return normalize(JSON.parse(await fs.readFile(DB_FILE, "utf8")));
  } catch {
    const db = seed();
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
}

// ---- Firestore 저장소 ----
// 컬렉션마다 문서 id = 항목 id. 배열 순서(먼저 들어온 것이 앞)는 _o 필드로 보존한다.
// _o는 읽은 객체에 그대로 남겨 두고(화면 코드는 무시), 새 항목에만 새로 붙인다.

async function readFirestore(): Promise<DB> {
  const fdb = getFirestore();
  const snaps = await Promise.all(COLLECTIONS.map((c) => fdb.collection(c).get()));
  const db = {} as Record<string, Row[]>;
  COLLECTIONS.forEach((c, i) => {
    db[c] = snaps[i].docs
      .map((d) => d.data() as Row & { _o?: number })
      .sort((a, b) => (a._o ?? 0) - (b._o ?? 0));
  });
  if (db.families.length === 0) {
    const fresh = seed();
    await writeFirestore(normalize({}), fresh);
    return fresh;
  }
  return db as unknown as DB;
}

// 가족 하나에 속한 문서만 읽는다 — 가족방 화면용. 데모 가족이 쌓여도 읽는 양이 늘지 않는다.
// familyId = "" 이면 아무것도 읽지 않는다 (새 문서만 추가할 때).
const BY_FAMILY = ["parents", "children", "questions", "reports", "calls", "memories", "stories", "checkins", "events"] as const;

async function readFirestoreFamily(familyId: string): Promise<DB> {
  const db = normalize({});
  if (!familyId) return db;
  const fdb = getFirestore();
  const sorted = <T>(docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
    docs.map((d) => d.data() as Row & { _o?: number }).sort((a, b) => (a._o ?? 0) - (b._o ?? 0)) as unknown as T[];
  const [fam, ...snaps] = await Promise.all([
    fdb.collection("families").doc(familyId).get(),
    ...BY_FAMILY.map((c) => fdb.collection(c).where("familyId", "==", familyId).get()),
  ]);
  if (!fam.exists) return db;
  db.families = [fam.data() as DB["families"][number]];
  BY_FAMILY.forEach((c, i) => ((db as unknown as Record<string, unknown[]>)[c] = sorted(snaps[i].docs)));
  // 가족 id가 없는 컬렉션은 질문·사람 id로 찾는다 (in 조건은 30개씩)
  const inChunks = async (c: "replies" | "checks" | "mailbox", field: string, ids: string[]) => {
    const out: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < ids.length; i += 30) out.push(...(await fdb.collection(c).where(field, "in", ids.slice(i, i + 30)).get()).docs);
    return sorted(out);
  };
  const qids = db.questions.map((q) => q.id), kids = db.children.map((c) => c.id);
  const [replies, checks, mailbox] = await Promise.all([
    qids.length ? inChunks("replies", "questionId", qids) : [],
    kids.length ? inChunks("checks", "childId", kids) : [],
    kids.length ? inChunks("mailbox", "childId", kids) : [],
  ]);
  db.replies = replies as DB["replies"];
  db.checks = checks as DB["checks"];
  db.mailbox = mailbox as DB["mailbox"];
  return db;
}

// 바뀐 문서만 쓰고, 사라진 문서는 지운다
async function writeFirestore(before: DB, after: DB) {
  const fdb = getFirestore();
  const base = Date.now() * 1000;
  let ops: FirebaseFirestore.WriteBatch[] = [fdb.batch()];
  let count = 0;
  const batch = () => {
    if (count && count % 450 === 0) ops.push(fdb.batch());
    count++;
    return ops[ops.length - 1];
  };

  for (const c of COLLECTIONS) {
    const prev = new Map((before[c] as unknown as Row[]).map((r) => [r.id, JSON.stringify(r)]));
    const next = after[c] as unknown as (Row & { _o?: number })[];
    next.forEach((row, i) => {
      const old = prev.get(row.id);
      if (old && old === JSON.stringify(row)) return;
      batch().set(fdb.collection(c).doc(row.id), stripUndefined({ ...row, _o: row._o ?? base + i }));
    });
    const alive = new Set(next.map((r) => r.id));
    for (const id of prev.keys()) if (!alive.has(id)) batch().delete(fdb.collection(c).doc(id));
  }
  if (count) await Promise.all(ops.map((b) => b.commit()));
  ops = [];
}

// Firestore는 undefined 값을 거부한다
function stripUndefined<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// ---- 공통 API ----
// scope: 가족 id를 주면 그 가족 문서만 읽고 쓴다(Firestore). 생략하면 전체 — 운영자 화면용.
// 파일 저장소(로컬)는 언제나 전체를 다룬다.

export async function readDB(scope?: string): Promise<DB> {
  if (!firestoreEnabled()) return readFile();
  return scope === undefined ? readFirestore() : readFirestoreFamily(scope);
}

let queue: Promise<unknown> = Promise.resolve();

// 쓰기는 한 인스턴스 안에서 직렬화한다 (여러 서버 인스턴스 간 동시 쓰기는 MVP 범위 밖)
export function updateDB<T>(fn: (db: DB) => T | Promise<T>, scope?: string): Promise<T> {
  const run = queue.then(async () => {
    if (firestoreEnabled()) {
      const before = scope === undefined ? await readFirestore() : await readFirestoreFamily(scope);
      const db = structuredClone(before);
      const result = await fn(db);
      await writeFirestore(before, db);
      return result;
    }
    const db = await readFile();
    const result = await fn(db);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// ---- 음성 파일 ----

const AUDIO_TYPES: Record<string, string> = { webm: "audio/webm", m4a: "audio/mp4", ogg: "audio/ogg" };

export async function saveAudio(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("ogg") ? "ogg" : "webm";
  const name = `${newId()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  // 음성 저장이 실패해도(예: Storage 버킷 미생성) 글 답장은 살린다 — 호출 쪽에서 undefined를 확인
  try {
    if (firestoreEnabled()) {
      await getBucket().file(`audio/${name}`).save(buf, { contentType: AUDIO_TYPES[ext], resumable: false });
    } else {
      await fs.mkdir(AUDIO_DIR, { recursive: true });
      await fs.writeFile(path.join(AUDIO_DIR, name), buf);
    }
    return name;
  } catch (err) {
    console.error("음성 저장 실패:", err instanceof Error ? err.message : err);
    return undefined;
  }
}

export async function loadAudio(name: string): Promise<{ buf: Buffer; type: string } | null> {
  const m = /^[\w-]+\.(webm|m4a|ogg)$/.exec(name);
  if (!m) return null;
  try {
    const buf = firestoreEnabled()
      ? (await getBucket().file(`audio/${name}`).download())[0]
      : await fs.readFile(path.join(AUDIO_DIR, name));
    return { buf, type: AUDIO_TYPES[m[1]] };
  } catch {
    return null;
  }
}

export async function findChild(token: string, base?: DB) {
  let db = base;
  if (!db) {
    if (firestoreEnabled()) {
      const hit = await getFirestore().collection("children").where("token", "==", token).limit(1).get();
      if (hit.empty) return null;
      db = await readFirestoreFamily((hit.docs[0].data() as { familyId: string }).familyId);
    } else db = await readFile();
  }
  const child = db.children.find((c) => c.token === token);
  if (!child) return null;
  const family = db.families.find((f) => f.id === child.familyId);
  if (!family) return null;
  const parent = db.parents.find((p) => p.familyId === family.id)!;
  const siblings = db.children.filter((c) => c.familyId === family.id);
  return { db, child, family, parent, siblings };
}

// 레이아웃(상단 바·탭 배지)과 페이지가 한 요청에서 같은 가족을 읽을 때 1번만 읽는다
export const findChildCached = cache((token: string) => findChild(token));
