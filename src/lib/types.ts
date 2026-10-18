// 가족 안부 허브 데이터 모델 (0~1단계: JSON 파일 저장 → 2단계 Supabase 이전 예정)

export type QuestionType = "schedule" | "yesno" | "free";

export interface Family {
  id: string;
  name: string; // 예: "김순자 님 가족"
  plan: "basic" | "standard" | "premium";
}

export interface Parent {
  id: string;
  familyId: string;
  name: string; // 자녀들이 부르는 호칭: "엄마"
  phone: string; // 대표번호로 들어온 발신번호 식별 키
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  role: string; // "큰아들", "딸", "막내"
  token: string; // 알림톡 링크용 토큰 (로그인 대신)
}

export interface Question {
  id: string;
  familyId: string;
  text: string;
  source: "call" | "sms" | "ars";
  type: QuestionType;
  options?: string[]; // 빠른 답 버튼
  deadline: string; // ISO
  status: "open" | "closed";
  createdAt: string;
  summary?: { sms: string; long: string; by: "claude" | "template" };
}

export interface Reply {
  id: string;
  questionId: string;
  childId: string;
  choice?: string;
  text?: string;
  audio?: string; // data/audio 파일명
  hideFromMom: boolean; // "엄마께는 빼줘" — 메모는 요약에서 제외
  createdAt: string;
}

export interface CallCheck {
  id: string;
  childId: string;
  memo?: string;
  createdAt: string;
}

export interface MailboxItem {
  id: string;
  childId: string;
  text?: string;
  audio?: string;
  played: boolean; // 엄마가 ARS "소식 듣기"로 들었는지
  createdAt: string;
}

export interface WeeklyReport {
  id: string;
  familyId: string;
  weekOf: string; // 해당 주 월요일 YYYY-MM-DD
  summary: string[]; // 3줄 요약
  topics: string[]; // 이번 주 물어볼 것 3가지
  mood: "좋음" | "보통" | "조금 걱정";
  calls: { answered: number; scheduled: number };
}

export interface DB {
  families: Family[];
  parents: Parent[];
  children: Child[];
  questions: Question[];
  replies: Reply[];
  checks: CallCheck[];
  mailbox: MailboxItem[];
  reports: WeeklyReport[];
}
