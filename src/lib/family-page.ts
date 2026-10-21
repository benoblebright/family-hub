import "server-only";
import { notFound } from "next/navigation";
import { findChild } from "./db";
import { familyNow, processFamily } from "./checkin";

// 가족방 탭 페이지 공통: 안부 문자 흐름·마감 질문을 처리한 뒤의 데이터를 돌려준다
export async function loadFamilyPage(token: string) {
  const first = await findChild(token);
  if (!first) notFound();
  const processed = await processFamily(first.family.id, first.db);
  const found = (await findChild(token, processed))!;
  return { ...found, now: familyNow(found.family) };
}
