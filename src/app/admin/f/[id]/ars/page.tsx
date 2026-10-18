import { notFound } from "next/navigation";
import { readDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { nextMemoryQuestion } from "@/lib/prompts";
import { josa, timeAgo } from "@/lib/format";
import { AdminNav } from "@/components/AdminNav";
import { createQuestion, markPlayed } from "../../../actions";

export const dynamic = "force-dynamic";

// 엄마가 대표번호로 전화하면(또는 원벨 콜백) 듣게 될 ARS 흐름.
// 0단계에서는 운영자가 이 대본을 보고 직접 전화로 읽어드린다.
export default async function ArsScript({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const db = await readDB();
  const family = db.families.find((f) => f.id === id);
  if (!family) notFound();

  const parent = db.parents.find((p) => p.familyId === id)!;
  const children = db.children.filter((c) => c.familyId === id);
  const roleOf = (cid: string) => children.find((c) => c.id === cid)?.role ?? "";
  const ids = new Set(children.map((c) => c.id));
  const recent = (iso: string, days: number) => Date.now() - new Date(iso).getTime() < days * 86400_000;

  const news = db.mailbox.filter((m) => ids.has(m.childId) && !m.played);
  const answers = db.questions.filter((q) => q.familyId === id && q.status === "closed" && q.summary && recent(q.createdAt, 3));
  const open = db.questions.filter((q) => q.familyId === id && q.status === "open");
  const checks = db.checks.filter((c) => ids.has(c.childId) && recent(c.createdAt, 3));
  const memories = db.memories.filter((m) => m.familyId === id).slice(-2);
  const nextMemory = nextMemoryQuestion(db.stories.filter((s) => s.familyId === id).map((s) => s.topic));
  const callerName = `${parent.name}`;

  return (
    <>
      <AdminNav current="ars" familyId={id} />
      <div className="hello">
        <small>{family.name} · 통화 4분 안에 마무리</small>
        <h1>ARS 대본</h1>
      </div>

      <section className="card script">
        <p className="act">전화 연결</p>
        <div className="say">
          {callerName}, 안녕하세요. 가족방이에요. {news.length + answers.length > 0 ? `새 소식이 ${news.length + answers.length}개 있어요. 바로 들려드릴게요.` : "오늘도 목소리 들으니 좋네요."}
        </div>
        <p className="act">아무것도 안 누르시거나 &ldquo;응&rdquo;만 하셔도 1번으로 가요.</p>
      </section>

      <section className="card script">
        <h2>1️⃣ 소식 듣기 (기본값)</h2>
        {news.length === 0 && answers.length === 0 && (
          <>
            <p className="act">새 소식이 없을 때 — 3번 이야기로 자연스럽게 넘어가요.</p>
            <div className="say">오늘은 새 소식이 없네요. 대신 제가 하나 여쭤봐도 될까요?</div>
          </>
        )}
        {answers.map((q) => (
          <div key={q.id}>
            <p className="act">물어보신 질문의 답 · {timeAgo(q.createdAt)}</p>
            <div className="say">{q.summary!.long}</div>
          </div>
        ))}
        {news.map((m) => (
          <div key={m.id}>
            <p className="act">
              {roleOf(m.childId)}의 우체통 · {timeAgo(m.createdAt)}
            </p>
            <div className="say">
              {josa(roleOf(m.childId), "이", "가")} {m.audio ? "목소리를 남겼어요. 들려드릴게요." : "이렇게 전해 달래요."}
              {m.text && <> &ldquo;{m.text}&rdquo;</>}
            </div>
            {m.audio && <audio src={`/api/audio/${m.audio}`} controls style={{ width: "100%" }} />}
          </div>
        ))}
        {news.length > 0 && (
          <form action={markPlayed} style={{ marginTop: 10 }}>
            {news.map((m) => (
              <input key={m.id} type="hidden" name="id" value={m.id} />
            ))}
            <button className="btn ok">들려드렸어요 (우체통 비우기)</button>
          </form>
        )}
      </section>

      <section className="card script">
        <h2>2️⃣ 물어보기</h2>
        <div className="say">혹시 자녀분들께 물어보고 싶으신 거 있으세요? 제가 전해드릴게요.</div>
        {open.length > 0 && (
          <p className="act">
            아직 답을 모으는 중: {open.map((q) => `“${q.text}”`).join(", ")} — &ldquo;지난번 물어보신 건 아직 답을 모으고 있어요&rdquo;
          </p>
        )}
        <form action={createQuestion}>
          <input type="hidden" name="familyId" value={id} />
          <input type="hidden" name="source" value="ars" />
          <input type="text" name="text" placeholder="엄마가 하신 말 그대로 적기" required />
          <select name="hours" defaultValue="6">
            <option value="3">3시간 뒤 마감</option>
            <option value="6">6시간 뒤 마감</option>
            <option value="24">내일 마감</option>
          </select>
          <button className="btn secondary">형제들에게 보내기</button>
        </form>
        <div className="say">네, 꼭 전할게요. 답이 모이면 제가 다시 전화드릴게요.</div>
      </section>

      <section className="card script">
        <h2>3️⃣ 이야기하기</h2>
        {checks.map((c) => (
          <div key={c.id}>
            <div className="say">{josa(roleOf(c.childId), "이랑", "랑")} 통화하셨다면서요? 무슨 얘기 하셨어요?</div>
            {c.memo && <p className="act">자녀 메모: {c.memo}</p>}
          </div>
        ))}
        {memories.map((m) => (
          <p className="act" key={m.id}>
            지난 통화 기억: {m.text} → 어떻게 됐는지 여쭤보기
          </p>
        ))}
        <p className="act">회상 질문 ({nextMemory.topic}) — 답하시면 가족 운영 화면의 회상 이야기에 적기</p>
        <div className="say">{nextMemory.q}</div>
      </section>

      <section className="card script">
        <h2>마무리</h2>
        <p className="act">4분이 넘어가면 이렇게 마무리해요. 원가의 70%가 통화 시간이에요.</p>
        <div className="say">그 얘기는 다음에 꼭 이어서 들을게요. 식사 잘 챙기시고, {parent.callTimes ? `${parent.callTimes}에` : "다음에"} 또 전화드릴게요.</div>
      </section>
    </>
  );
}
