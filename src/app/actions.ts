"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createFamily, parseFamilyForm } from "@/lib/family";
import { createDemoFamily } from "@/lib/demo";
import { findChild, newId, saveAudio, updateDB } from "@/lib/db";
import { josa } from "@/lib/format";
import { familyNow, processFamily } from "@/lib/checkin";

export interface FormState {
  ok: boolean;
  message: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const file = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);

// 랜딩페이지 첫 달 무료 신청
export async function submitLead(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form.get("name"));
  const phone = str(form.get("phone"));
  if (!name || !phone) return { ok: false, message: "성함과 연락처를 적어 주세요." };
  if (!/^[0-9-\s]{9,14}$/.test(phone)) return { ok: false, message: "연락처를 숫자로 적어 주세요." };
  if (form.get("agree") !== "on") return { ok: false, message: "개인정보 수집·이용에 동의해 주세요." };

  const plan = str(form.get("plan"));
  const parentPhone = str(form.get("parentPhone"));
  await updateDB((db) => {
    db.leads.push({
      id: newId(),
      name,
      phone,
      siblings: Number(form.get("siblings")) || 1,
      plan: plan === "basic" || plan === "premium" ? plan : "standard",
      parentPhone: parentPhone === "smart" || parentPhone === "landline" ? parentPhone : "2g",
      memo: str(form.get("memo")),
      status: "new",
      createdAt: new Date().toISOString(),
    });
  }, ""); // 새 신청만 추가 — 다른 데이터는 읽지 않는다
  return { ok: true, message: `${name}님, 신청 고마워요. 하루 안에 연락드릴게요.` };
}

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
  if (audioFile && !audio && !choice && !text) return { ok: false, message: "음성을 저장하지 못했어요. 버튼이나 글로 답해 주세요." };
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
  }, found.family.id);
  if (result) return { ok: false, message: result };

  // 가족 전원이 답했으면 바로 마감·요약 (R4-3)
  await processFamily(found.family.id);
  revalidatePath(`/f/${token}`, "layout");
  return {
    ok: true,
    message: audioFile && !audio ? "글 답장은 보냈어요. 음성은 저장하지 못했어요." : "답장을 보냈어요. 마감되면 AI가 모아서 엄마께 전해드려요.",
  };
}

// "엄마랑 통화했어요" — 다음 AI 안부콜이 이어받는 핵심 KPI
export async function submitCallCheck(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form.get("token"));
  const found = token ? await findChild(token) : null;
  if (!found) return { ok: false, message: "링크가 올바르지 않아요." };

  await updateDB((db) => {
    db.checks.push({ id: newId(), childId: found.child.id, memo: str(form.get("memo")), createdAt: new Date(familyNow(found.family)).toISOString() });
  }, found.family.id);
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
  if (audioFile && !audio && !text) return { ok: false, message: "음성을 저장하지 못했어요. 글로 남겨 주세요." };
  await updateDB((db) => {
    db.mailbox.push({ id: newId(), childId: found.child.id, text, audio, played: false, createdAt: new Date().toISOString() });
  }, found.family.id);
  revalidatePath(`/f/${token}`);
  return { ok: true, message: "우체통에 넣었어요. 엄마가 전화하시면 제일 먼저 들려드려요." };
}

// 내 설정: 전화 받기 편한 시간("지금 전화해 주세요" 알림을 보낼 시간), 알림 수신
export async function saveChildSettings(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form.get("token"));
  const found = token ? await findChild(token) : null;
  if (!found) return { ok: false, message: "링크가 올바르지 않아요." };

  const hours = str(form.get("availableHours"));
  if (hours && !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(hours)) return { ok: false, message: "시간은 19:00-22:00처럼 적어 주세요." };

  await updateDB((db) => {
    const c = db.children.find((x) => x.id === found.child.id);
    if (!c) return;
    c.availableHours = hours?.replace(/\s/g, "");
    c.notify = { weekly: form.get("weekly") === "on", questions: form.get("questions") === "on" };
  }, found.family.id);
  revalidatePath(`/f/${token}`, "layout");
  return { ok: true, message: "저장했어요." };
}

// 자가 가입: 가족방 만들기 → 만든 사람의 가족 홈으로 (R2-1 ~ R2-3)
export async function startFamily(_: FormState, form: FormData): Promise<FormState> {
  const input = parseFamilyForm(form);
  if (input.children.length === 0) return { ok: false, message: "내 이름을 적어 주세요." };
  if (input.parentPhone && !/^[0-9-\s]{9,14}$/.test(input.parentPhone)) return { ok: false, message: "부모님 전화번호를 숫자로 적어 주세요." };
  const { payerToken } = await createFamily({ ...input, payer: 0 });
  redirect(`/f/${payerToken}?welcome=1`);
}

// 체험하기: 체험자마다 새 데모 가족방을 만들어 준다 (링크가 아닌 버튼 — 링크 미리 불러오기로 가족방이 생기지 않게)
export async function startDemo(form: FormData) {
  const token = await createDemoFamily();
  redirect(str(form.get("to")) === "sim" ? `/f/${token}/sim` : `/f/${token}`);
}
