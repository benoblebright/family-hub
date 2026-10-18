"use server";

import { revalidatePath } from "next/cache";
import { findChild, newId, saveAudio, updateDB } from "@/lib/db";
import { josa } from "@/lib/format";

export interface FormState {
  ok: boolean;
  message: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const file = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);

// 엄마 질문에 답장 (알림톡 "답장하기" 링크 → 답장 페이지)
export async function submitReply(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form.get("token"));
  const questionId = str(form.get("questionId"));
  const found = token ? await findChild(token) : null;
  if (!found || !questionId) return { ok: false, message: "링크가 올바르지 않아요." };

  const choice = str(form.get("choice"));
  const text = str(form.get("text"));
  const audioFile = file(form.get("audio"));
  if (!choice && !text && !audioFile) return { ok: false, message: "버튼을 누르거나, 글이나 목소리로 답해 주세요." };

  const audio = await saveAudio(audioFile);
  const result = await updateDB((db) => {
    const q = db.questions.find((x) => x.id === questionId && x.familyId === found.family.id);
    if (!q) return "없는 질문이에요.";
    if (q.status === "closed") return "이미 마감되어 엄마께 전달된 질문이에요.";
    db.replies.push({
      id: newId(),
      questionId,
      childId: found.child.id,
      choice,
      text,
      audio,
      hideFromMom: form.get("hide") === "on",
      createdAt: new Date().toISOString(),
    });
    return null;
  });
  if (result) return { ok: false, message: result };

  revalidatePath(`/f/${token}`);
  return { ok: true, message: "답장을 보냈어요. 마감되면 AI가 모아서 엄마께 전해드려요." };
}

// "엄마랑 통화했어요" — 다음 AI 안부콜이 이어받는 핵심 KPI
export async function submitCallCheck(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form.get("token"));
  const found = token ? await findChild(token) : null;
  if (!found) return { ok: false, message: "링크가 올바르지 않아요." };

  await updateDB((db) => {
    db.checks.push({ id: newId(), childId: found.child.id, memo: str(form.get("memo")), createdAt: new Date().toISOString() });
  });
  revalidatePath(`/f/${token}`);
  const who = josa(found.child.role, "이랑", "랑");
  return { ok: true, message: `기록했어요. 다음 안부콜에서 "${who} 통화하셨다면서요?"로 이어갈게요.` };
}

// 엄마 우체통 — 엄마가 ARS 1번 "소식 듣기"로 듣는 메시지
export async function submitMailbox(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form.get("token"));
  const found = token ? await findChild(token) : null;
  if (!found) return { ok: false, message: "링크가 올바르지 않아요." };

  const text = str(form.get("text"));
  const audioFile = file(form.get("audio"));
  if (!text && !audioFile) return { ok: false, message: "목소리를 녹음하거나 글을 남겨 주세요." };

  const audio = await saveAudio(audioFile);
  await updateDB((db) => {
    db.mailbox.push({ id: newId(), childId: found.child.id, text, audio, played: false, createdAt: new Date().toISOString() });
  });
  revalidatePath(`/f/${token}`);
  return { ok: true, message: "우체통에 넣었어요. 엄마가 전화하시면 제일 먼저 들려드려요." };
}
