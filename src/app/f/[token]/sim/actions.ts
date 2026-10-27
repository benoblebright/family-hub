"use server";

import { revalidatePath } from "next/cache";
import { findChild, updateDB } from "@/lib/db";
import { familyNow, minutesToNextCheckin, momCall, momSms, openMomQuestion, processFamily, pushEvent, tick } from "@/lib/checkin";

// 엄마 시뮬레이터 — 실제 문자·전화 대신 휴대폰 화면에서 같은 흐름을 재현한다 (어떤 휴대폰이든 문자로 똑같이 동작)

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

async function family(form: FormData) {
  const token = str(form.get("token"));
  const found = token ? await findChild(token) : null;
  if (!found) throw new Error("링크가 올바르지 않아요.");
  return { token, familyId: found.family.id };
}

function done(token: string) {
  revalidatePath(`/f/${token}`, "layout");
}

export async function simSend(form: FormData) {
  const { token, familyId } = await family(form);
  const text = str(form.get("text")).slice(0, 80);
  if (!text) return;
  await processFamily(familyId);
  const { question } = await updateDB((db) => {
    const f = db.families.find((x) => x.id === familyId)!;
    return momSms(db, familyId, text, familyNow(f));
  }, familyId);
  if (question) await openMomQuestion(familyId, question, "sms");
  done(token);
}

export async function simCall(form: FormData) {
  const { token, familyId } = await family(form);
  await processFamily(familyId);
  await updateDB((db) => {
    const f = db.families.find((x) => x.id === familyId)!;
    momCall(db, familyId, form.get("answer") === "yes", familyNow(f));
  }, familyId);
  done(token);
}

// 시간 빨리감기: 가족 시계를 앞으로 돌린 뒤, 그 사이 일어났어야 할 일을 처리한다
export async function simForward(form: FormData) {
  const { token, familyId } = await family(form);
  await processFamily(familyId);
  await updateDB((db) => {
    const f = db.families.find((x) => x.id === familyId)!;
    const now = familyNow(f);
    const step = form.get("minutes") === "next" ? minutesToNextCheckin(db, familyId, now) : Number(form.get("minutes")) || 60;
    f.simOffsetMin = (f.simOffsetMin ?? 0) + step;
    pushEvent(db, familyId, now, "system", `⏩ 시간 ${step >= 60 ? `${Math.round(step / 6) / 10}시간` : `${step}분`} 빨리감기`);
    tick(db, familyId, familyNow(f));
  }, familyId);
  await processFamily(familyId);
  done(token);
}

// 가상 시계를 현재 시각으로 되돌리고, 빨리감기로 생긴 미래 기록을 지운다
export async function simReset(form: FormData) {
  const { token, familyId } = await family(form);
  await updateDB((db) => {
    const f = db.families.find((x) => x.id === familyId)!;
    const now = Date.now();
    const future = (t: string) => new Date(t).getTime() > now;
    db.events = db.events.filter((e) => e.familyId !== familyId || !future(e.at));
    db.checkins = db.checkins.filter((c) => c.familyId !== familyId || !future(c.sentAt));
    for (const c of db.checkins.filter((x) => x.familyId === familyId)) {
      if (c.resentAt && future(c.resentAt)) delete c.resentAt;
      if (c.callAt && future(c.callAt)) (delete c.callAt, delete c.callResult, delete c.alertedAt);
      if (c.answeredAt && future(c.answeredAt)) (delete c.answer, delete c.answeredAt);
    }
    f.simOffsetMin = 0;
    f.lastTick = new Date(now).toISOString();
    pushEvent(db, familyId, now, "system", "↺ 시계를 지금 시각으로 되돌렸어요");
  }, familyId);
  done(token);
}
