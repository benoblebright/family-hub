import "server-only";
import { notFound } from "next/navigation";
import { findChild, findChildCached } from "./db";
import { familyNow, processFamily } from "./checkin";

// 가족방 탭 페이지 공통: 안부 문자 흐름·마감 질문을 처리한 뒤의 데이터를 돌려준다
export async function loadFamilyPage(token: string) {
  const first = await findChildCached(token); // 레이아웃과 같은 요청이면 다시 읽지 않는다
  if (!first) notFound();
  const processed = await processFamily(first.family.id, first.db);
  const found = (await findChild(token, processed))!;
  return { ...found, now: familyNow(found.family) };
}
