import "server-only";
import { newId, newToken, updateDB } from "./db";
import type { Parent, Plan } from "./types";

// 가족방 만들기 — 운영자 등록(/admin/new)과 자가 가입(/start)이 함께 쓴다
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export interface NewFamilyResult {
  familyId: string;
  tokens: string[]; // 입력 순서대로 (0번 = 만든 사람/대표 결제자 기본값)
  payerToken: string;
}

export function parseFamilyForm(form: FormData) {
  const names = form.getAll("childName").map(str);
  const roles = form.getAll("childRole").map(str);
  const phones = form.getAll("childPhone").map(str);
  const children = names
    .map((name, i) => ({ name: name.slice(0, 20), role: (roles[i] || `자녀${i + 1}`).slice(0, 10), phone: phones[i] || undefined, i }))
    .filter((c) => c.name);
  const time = str(form.get("checkinTime"));
  return {
    familyName: str(form.get("familyName")).slice(0, 30),
    parentName: (str(form.get("parentName")) || "엄마").slice(0, 10),
    parentPhone: str(form.get("parentPhone")),
    phoneType: (str(form.get("phoneType")) || "2g") as Parent["phoneType"],
    checkinTime: /^\d{2}:\d{2}$/.test(time) ? time : "09:00",
    callTimes: str(form.get("callTimes")) || undefined,
    notes: str(form.get("notes")) || undefined,
    plan: (["basic", "standard", "premium"].includes(str(form.get("plan"))) ? str(form.get("plan")) : "standard") as Plan,
    payer: Number(form.get("payer") ?? 0),
    leadId: str(form.get("leadId")),
    children,
  };
}

export async function createFamily(input: ReturnType<typeof parseFamilyForm>): Promise<NewFamilyResult> {
  const familyId = newId();
  const now = new Date().toISOString();
  const tokens = input.children.map(() => newToken());

  await updateDB((db) => {
    db.families.push({
      id: familyId,
      name: input.familyName || `${input.parentName}네 가족방`,
      plan: input.plan,
      status: "trial",
      createdAt: now,
      simOffsetMin: 0,
      lastTick: now,
    });
    db.parents.push({
      id: newId(),
      familyId,
      name: input.parentName,
      phone: input.parentPhone,
      phoneType: input.phoneType,
      checkinTime: input.checkinTime,
      callTimes: input.callTimes,
      notes: input.notes,
      consent: { recording: false, summaryToChildren: false },
    });
    input.children.forEach((c, i) => {
      db.children.push({
        id: newId(),
        familyId,
        name: c.name,
        role: c.role,
        phone: c.phone,
        token: tokens[i],
        payer: c.i === input.payer,
        notify: { weekly: true, questions: true },
      });
    });
    db.events.push({ id: newId(), familyId, at: now, kind: "system", text: `가족방을 만들었어요. 매일 ${input.checkinTime}에 안부 문자가 가요.` });
    const lead = db.leads.find((l) => l.id === input.leadId);
    if (lead) lead.status = "onboarded";
  });

  const payerIdx = Math.max(0, input.children.findIndex((c) => c.i === input.payer));
  return { familyId, tokens, payerToken: tokens[payerIdx] };
}
