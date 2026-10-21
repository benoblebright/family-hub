import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Child, Question, QuestionType, Reply } from "./types";

// 키가 없거나 호출이 실패하면 템플릿 규칙으로 대체한다 (0단계는 키 없이도 동작)
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

async function askJSON<T>(system: string, user: string, schema: Record<string, unknown>): Promise<T | null> {
  if (!hasKey()) return null;
  try {
    const res = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.find((b) => b.type === "text");
    return text && text.type === "text" ? (JSON.parse(text.text) as T) : null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`Claude API ${err.status}:`, err.message);
    else console.error("Claude 응답 처리 실패:", err);
    return null;
  }
}

// ---- 질문 분류 ----

export interface Classified {
  type: QuestionType;
  options: string[];
}

function classifyByRule(text: string): Classified {
  if (/언제|며칠|몇 시|날짜/.test(text)) return { type: "schedule", options: ["토요일", "일요일", "평일", "못 가요"] };
  if (/할 사람|올래|갈래|할까|되니|있니|\?$/.test(text) && text.length < 30)
    return { type: "yesno", options: ["네", "아니요", "잘 모르겠어요"] };
  return { type: "free", options: [] };
}

export async function classifyQuestion(text: string): Promise<Classified & { by: "claude" | "template" }> {
  const result = await askJSON<Classified>(
    "당신은 고령의 부모님이 가족·친구들에게 보낸 질문을 분류합니다. " +
      "schedule(날짜·시간을 묻는 질문), yesno(예/아니오로 답할 질문), free(근황 등 자유 답변) 중 하나를 고르고, " +
      "답하는 사람이 답장 페이지에서 한 번에 누를 빠른 답 버튼을 2~4개 만드세요. free면 options는 빈 배열입니다.",
    `질문: ${text}`,
    {
      type: "object",
      properties: {
        type: { type: "string", enum: ["schedule", "yesno", "free"] },
        options: { type: "array", items: { type: "string" } },
      },
      required: ["type", "options"],
      additionalProperties: false,
    },
  );
  return result ? { ...result, by: "claude" } : { ...classifyByRule(text), by: "template" };
}

// ---- 답장 취합 요약 ----

export interface Summary {
  sms: string; // 2G 단문 기준 45자 이내
  long: string; // ARS로 읽어드릴 버전
}

function replyLine(child: Child, r?: Reply) {
  if (!r) return `${child.role} 아직 답 없음`;
  const parts = [r.choice, r.hideFromMom ? undefined : r.text].filter(Boolean);
  if (parts.length === 0 && r.audio) parts.push("음성으로 답함");
  return `${child.role} ${parts.join(", ")}`;
}

function summarizeByTemplate(q: Question, children: Child[], replies: Reply[]): Summary {
  const latest = (c: Child) => replies.filter((r) => r.childId === c.id).at(-1);
  const short = children.map((c) => {
    const r = latest(c);
    return r ? `${c.role} ${r.choice ?? "답함"}` : `${c.role} 미정`;
  });
  const long = children.map((c) => replyLine(c, latest(c)));
  return {
    sms: short.join(", ").slice(0, 45),
    long: `"${q.text}" 물어보신 거 답이 왔어요. ${long.join(". ")}.`,
  };
}

export async function summarizeReplies(
  q: Question,
  parentName: string,
  children: Child[],
  replies: Reply[],
): Promise<Summary & { by: "claude" | "template" }> {
  const lines = children.map((c) => {
    // 여러 번 답했으면 마지막 답만 쓴다
    const r = replies.filter((x) => x.childId === c.id).at(-1);
    if (!r) return `- ${c.role}(${c.name}): 답 없음`;
    return `- ${c.role}(${c.name}): 선택=${r.choice ?? "없음"} / 메모=${
      r.hideFromMom ? "(엄마께 전하지 말 것)" : r.text ?? "없음"
    }${r.audio ? " / 음성 답장 있음" : ""}`;
  });

  const result = await askJSON<Summary>(
    `당신은 함께하는 사람들(형제·가족·친구)의 답장을 모아 ${parentName}께 전해드리는 가족 비서입니다. 규칙:\n` +
      "1. 답이 없는 사람은 지어내지 말고 '아직 답이 없어요'라고 솔직히 말합니다.\n" +
      "2. '(엄마께 전하지 말 것)' 표시된 메모 내용은 절대 포함하지 않습니다.\n" +
      "3. 날짜가 엇갈리면 엇갈린다고 드러냅니다.\n" +
      "4. sms는 2G폰 단문 기준 공백 포함 45자 이내, 호칭(큰아들·딸·막내)으로 씁니다.\n" +
      "5. long은 ARS로 읽어드릴 다정한 존댓말 2~4문장입니다. 음성 답장이 있으면 '목소리도 남겼어요'라고 알려드립니다.",
    `${parentName}의 질문: ${q.text}\n\n답장:\n${lines.join("\n")}`,
    {
      type: "object",
      properties: { sms: { type: "string" }, long: { type: "string" } },
      required: ["sms", "long"],
      additionalProperties: false,
    },
  );
  if (result) return { sms: result.sms.slice(0, 45), long: result.long, by: "claude" };
  return { ...summarizeByTemplate(q, children, replies), by: "template" };
}
