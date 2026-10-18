import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { DB } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const AUDIO_DIR = path.join(DATA_DIR, "audio");

export const newId = () => randomUUID().slice(0, 8);

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function mondayOf(d = new Date()) {
  const day = d.getDay() || 7;
  const m = new Date(d);
  m.setDate(d.getDate() - day + 1);
  return m.toISOString().slice(0, 10);
}

// 데모 가족 1개 (0단계: 어머님 1가구)
function seed(): DB {
  const familyId = "fam1";
  return {
    families: [{ id: familyId, name: "엄마네 가족방", plan: "standard" }],
    parents: [{ id: "p1", familyId, name: "엄마", phone: "010-0000-0000" }],
    children: [
      { id: "c1", familyId, name: "민수", role: "큰아들", token: "minsu-demo" },
      { id: "c2", familyId, name: "지영", role: "딸", token: "jiyoung-demo" },
      { id: "c3", familyId, name: "준호", role: "막내", token: "junho-demo" },
    ],
    questions: [
      {
        id: "q1",
        familyId,
        text: "이번 추석에 다들 언제 오니?",
        source: "call",
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
    checks: [
      { id: "k1", childId: "c2", memo: "김장 얘기 했어요", createdAt: hoursFromNow(-30) },
    ],
    mailbox: [],
    reports: [
      {
        id: "w1",
        familyId,
        weekOf: mondayOf(),
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
  };
}

let queue: Promise<unknown> = Promise.resolve();

export async function readDB(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as DB;
  } catch {
    const db = seed();
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
}

// 쓰기는 직렬화해서 동시 요청에도 파일이 깨지지 않게 한다
export function updateDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDB();
    const result = await fn(db);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function saveAudio(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("ogg") ? "ogg" : "webm";
  const name = `${newId()}.${ext}`;
  await fs.writeFile(path.join(AUDIO_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function findChild(token: string) {
  const db = await readDB();
  const child = db.children.find((c) => c.token === token);
  if (!child) return null;
  const family = db.families.find((f) => f.id === child.familyId)!;
  const parent = db.parents.find((p) => p.familyId === family.id)!;
  const siblings = db.children.filter((c) => c.familyId === family.id);
  return { db, child, family, parent, siblings };
}
