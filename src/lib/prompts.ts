// AI 안부콜 질문 뱅크 — 안부형과 회상형을 섞어 써야 가족신문·회고록 원재료가 쌓인다
export const CHECKIN_QUESTIONS = [
  "오늘 아침은 뭐 드셨어요?",
  "요즘 잠은 잘 주무세요?",
  "이번 주에 밖에 나가신 적 있으세요?",
  "요즘 제일 재미있는 일이 뭐예요?",
  "몸 어디 불편하신 데는 없으세요?",
];

export const MEMORY_QUESTIONS: { topic: string; q: string }[] = [
  { topic: "첫 직장", q: "첫 월급 받던 날 기억나세요? 뭐 하셨어요?" },
  { topic: "고향", q: "어릴 때 살던 동네는 어떤 곳이었어요?" },
  { topic: "결혼", q: "아버님을 처음 만나셨을 때 어떠셨어요?" },
  { topic: "아이들", q: "큰애 태어났을 때 제일 기억나는 게 뭐예요?" },
  { topic: "음식", q: "어머님 손맛 비결 하나만 알려주세요. 제일 자신 있는 반찬이 뭐예요?" },
  { topic: "명절", q: "어릴 적 추석에는 뭘 하고 노셨어요?" },
  { topic: "노래", q: "젊을 때 제일 좋아하던 노래가 뭐였어요?" },
  { topic: "친구", q: "가장 오래된 친구분은 누구세요? 어떻게 만나셨어요?" },
  { topic: "꿈", q: "젊을 때 꼭 해보고 싶었던 게 있으셨어요?" },
  { topic: "자랑", q: "살면서 제일 뿌듯했던 순간이 언제예요?" },
];

// 이미 나눈 주제는 건너뛰고 다음 회상 질문을 고른다
export function nextMemoryQuestion(usedTopics: string[]) {
  return MEMORY_QUESTIONS.find((m) => !usedTopics.includes(m.topic)) ?? MEMORY_QUESTIONS[usedTopics.length % MEMORY_QUESTIONS.length];
}
