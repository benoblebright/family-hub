"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newId, updateDB } from "@/lib/db";
import { createFamily, parseFamilyForm } from "@/lib/family";
import { closeQuestionWithSummary, openMomQuestion } from "@/lib/checkin";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin";
import { fromKstInput, kstDate, weekStart } from "@/lib/format";
import type { Call, Lead, Question, WeeklyReport } from "@/lib/types";

// 운영자 화면 — 0~1단계에서 vox 웹훅·스케줄러가 할 일을 손으로 대신한다

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const lines = (v: FormDataEntryValue | null, max = 3) =>
  str(v)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
const done = () => revalidatePath("/", "layout");

export async function login(form: FormData) {
  if (str(form.get("key")) !== process.env.ADMIN_KEY) redirect("/admin/login?error=1");
  (await cookies()).set(ADMIN_COOKIE, str(form.get("key")), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  redirect("/admin");
}

// ---- 가족 등록 (온보딩) ----

export async function createFamilyAdmin(form: FormData) {
  await requireAdmin();
  const input = parseFamilyForm(form);
  if (input.children.length === 0) throw new Error("자녀를 한 명 이상 등록해 주세요.");
  const { familyId } = await createFamily(input);
  done();
  redirect(`/admin/f/${familyId}`);
}

// 첫 통화에서 받은 녹음·요약 동의 기록
export async function saveConsent(form: FormData) {
  await requireAdmin();
  const familyId = str(form.get("familyId"));
  await updateDB((db) => {
    const p = db.parents.find((x) => x.familyId === familyId);
    if (!p) return;
    p.consent = {
      recording: form.get("recording") === "on",
      summaryToChildren: form.get("summaryToChildren") === "on",
      at: new Date().toISOString(),
      how: str(form.get("how")) || "첫 통화 음성 동의",
    };
    p.callTimes = str(form.get("callTimes")) || p.callTimes;
    p.notes = str(form.get("notes")) || p.notes;
  });
  done();
}

export async function setFamilyStatus(form: FormData) {
  await requireAdmin();
  const id = str(form.get("familyId"));
  const status = str(form.get("status")) as "trial" | "active" | "paused";
  await updateDB((db) => {
    const f = db.families.find((x) => x.id === id);
    if (f) f.status = status;
  });
  done();
}

export async function setLeadStatus(form: FormData) {
  await requireAdmin();
  const id = str(form.get("leadId"));
  await updateDB((db) => {
    const l = db.leads.find((x) => x.id === id);
    if (l) l.status = str(form.get("status")) as Lead["status"];
  });
  done();
}

// ---- 엄마 질문 ----

export async function createQuestion(form: FormData) {
  await requireAdmin();
  const text = str(form.get("text"));
  const familyId = str(form.get("familyId"));
  if (!text || !familyId) return;
  await openMomQuestion(familyId, text, (str(form.get("source")) || "call") as Question["source"], Number(form.get("hours")) || 6);
  done();
}

// 마감: 답을 모아 요약 → 엄마께 보낼 문자(단문)·전화 문구 생성, 엄마 폰(시뮬레이터)으로 발송
export async function closeQuestion(form: FormData) {
  await requireAdmin();
  await closeQuestionWithSummary(str(form.get("questionId")));
  done();
}

// ---- 통화 기록 · 기억 노트 · 회상 이야기 ----

export async function addCall(form: FormData) {
  await requireAdmin();
  const familyId = str(form.get("familyId"));
  const answered = form.get("answered") === "on";
  const at = str(form.get("at"));
  const call: Call = {
    id: newId(),
    familyId,
    at: at ? fromKstInput(at) : new Date().toISOString(),
    kind: (str(form.get("kind")) || "regular") as Call["kind"],
    answered,
    minutes: answered ? Number(form.get("minutes")) || 0 : 0,
    summary: answered ? str(form.get("summary")) || undefined : undefined,
    mood: answered ? ((str(form.get("mood")) || undefined) as Call["mood"]) : undefined,
    flags: form.getAll("flag").map(str).filter(Boolean),
  };
  const memory = str(form.get("memory"));
  const story = str(form.get("storyText"));
  const momQuestion = str(form.get("momQuestion"));
  await updateDB((db) => {
    db.calls.push(call);
    if (memory) db.memories.push({ id: newId(), familyId, text: memory, createdAt: call.at });
    if (story) db.stories.push({ id: newId(), familyId, topic: str(form.get("storyTopic")) || "회상", text: story, createdAt: call.at });
  });
  // 통화 중 엄마가 남긴 질문은 바로 형제들에게
  if (momQuestion) {
    const fd = new FormData();
    fd.set("familyId", familyId);
    fd.set("text", momQuestion);
    fd.set("source", call.kind === "ars" ? "ars" : "call");
    await createQuestion(fd);
  }
  done();
}

export async function deleteCall(form: FormData) {
  await requireAdmin();
  const id = str(form.get("id"));
  await updateDB((db) => {
    db.calls = db.calls.filter((c) => c.id !== id);
  });
  done();
}

export async function addMemory(form: FormData) {
  await requireAdmin();
  const text = str(form.get("text"));
  if (!text) return;
  await updateDB((db) => {
    db.memories.push({ id: newId(), familyId: str(form.get("familyId")), text, createdAt: new Date().toISOString() });
  });
  done();
}

export async function deleteMemory(form: FormData) {
  await requireAdmin();
  const id = str(form.get("id"));
  await updateDB((db) => {
    db.memories = db.memories.filter((m) => m.id !== id);
  });
  done();
}

export async function addStory(form: FormData) {
  await requireAdmin();
  const text = str(form.get("text"));
  if (!text) return;
  await updateDB((db) => {
    db.stories.push({ id: newId(), familyId: str(form.get("familyId")), topic: str(form.get("topic")) || "회상", text, createdAt: new Date().toISOString() });
  });
  done();
}

// ---- 주간 요약 ----

export async function saveReport(form: FormData) {
  await requireAdmin();
  const familyId = str(form.get("familyId"));
  const report: WeeklyReport = {
    id: newId(),
    familyId,
    weekOf: kstDate(weekStart()),
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
  done();
}

// ---- 우체통 ----

export async function markPlayed(form: FormData) {
  await requireAdmin();
  const ids = new Set(form.getAll("id").map(str));
  await updateDB((db) => {
    for (const m of db.mailbox) if (ids.has(m.id)) m.played = true;
  });
  done();
}
