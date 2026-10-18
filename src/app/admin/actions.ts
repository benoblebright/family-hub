"use server";

import { revalidatePath } from "next/cache";
import { newId, readDB, updateDB } from "@/lib/db";
import { classifyQuestion, summarizeReplies } from "@/lib/ai";
import { weekStart } from "@/lib/format";
import type { Question, WeeklyReport } from "@/lib/types";

// 운영자 화면 — 0~1단계에서 vox 웹훅·스케줄러가 할 일을 손으로 대신한다
function assertKey(form: FormData) {
  const key = process.env.ADMIN_KEY;
  if (key && form.get("key") !== key) throw new Error("운영자 키가 맞지 않아요.");
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const lines = (v: FormDataEntryValue | null) =>
  str(v)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

export async function createQuestion(form: FormData) {
  assertKey(form);
  const text = str(form.get("text"));
  const familyId = str(form.get("familyId"));
  if (!text || !familyId) return;
  const hours = Number(form.get("hours")) || 6;
  const { type, options } = await classifyQuestion(text);

  await updateDB((db) => {
    db.questions.push({
      id: newId(),
      familyId,
      text,
      source: (str(form.get("source")) || "call") as Question["source"],
      type,
      options,
      deadline: new Date(Date.now() + hours * 3600_000).toISOString(),
      status: "open",
      createdAt: new Date().toISOString(),
    });
  });
  revalidatePath("/", "layout");
}

// 마감: 답을 모아 AI 요약 → 엄마께 보낼 문자(단문)·ARS 문구 생성
export async function closeQuestion(form: FormData) {
  assertKey(form);
  const id = str(form.get("questionId"));
  const db = await readDB();
  const q = db.questions.find((x) => x.id === id);
  if (!q || q.status === "closed") return;
  const parent = db.parents.find((p) => p.familyId === q.familyId)!;
  const children = db.children.filter((c) => c.familyId === q.familyId);
  const summary = await summarizeReplies(
    q,
    parent.name,
    children,
    db.replies.filter((r) => r.questionId === q.id),
  );

  await updateDB((fresh) => {
    const target = fresh.questions.find((x) => x.id === id);
    if (target) {
      target.status = "closed";
      target.summary = summary;
    }
  });
  revalidatePath("/", "layout");
}

export async function saveReport(form: FormData) {
  assertKey(form);
  const familyId = str(form.get("familyId"));
  const report: WeeklyReport = {
    id: newId(),
    familyId,
    weekOf: weekStart().toISOString().slice(0, 10),
    summary: lines(form.get("summary")),
    topics: lines(form.get("topics")),
    mood: (str(form.get("mood")) || "보통") as WeeklyReport["mood"],
    calls: { answered: Number(form.get("answered")) || 0, scheduled: Number(form.get("scheduled")) || 0 },
  };
  if (report.summary.length === 0) return;
  await updateDB((db) => {
    // 같은 주 리포트는 덮어쓴다
    db.reports = db.reports.filter((r) => !(r.familyId === familyId && r.weekOf === report.weekOf));
    db.reports.push(report);
  });
  revalidatePath("/", "layout");
}

// ARS "소식 듣기"에서 재생됐다고 표시 (vox 연동 전 수동)
export async function markPlayed(form: FormData) {
  assertKey(form);
  const id = str(form.get("id"));
  await updateDB((db) => {
    const m = db.mailbox.find((x) => x.id === id);
    if (m) m.played = true;
  });
  revalidatePath("/", "layout");
}
