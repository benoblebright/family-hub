// 가족 안부 허브 데이터 모델 (0~1단계: JSON 파일 저장 → 2단계 Supabase 이전 예정)

export type QuestionType = "schedule" | "yesno" | "free";

export interface Family {
  id: string;
  name: string; // 예: "김순자 님 가족"
  plan: Plan;
  status?: "trial" | "active" | "paused";
  createdAt?: string;
  simOffsetMin?: number; // 시뮬레이터 가상 시계 (빨리감기한 분)
  lastTick?: string; // 안부 문자 흐름을 마지막으로 처리한 가상 시각
  demo?: boolean; // 평가자·체험자용으로 복제한 데모 가족방 (24시간 뒤 자동 삭제)
}

export type Plan = "basic" | "standard" | "premium";

export interface Parent {
  id: string;
  familyId: string;
  name: string; // 자녀들이 부르는 호칭: "엄마"
  phone: string; // 대표번호로 들어온 발신번호 식별 키
  callTimes?: string; // 정기 안부콜 시간: "화·목·토 오전 10시"
  checkinTime?: string; // 매일 아침 안부 문자 시각 (KST) "09:00"
  phoneType?: "2g" | "smart" | "landline";
  notes?: string; // 말 속도, 청력, 사투리 등 통화 설정 메모
  consent?: { recording: boolean; summaryToChildren: boolean; at?: string; how?: string };
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  role: string; // "큰아들", "딸", "막내"
  token: string; // 알림톡 링크용 토큰 (로그인 대신)
  phone?: string;
  availableHours?: string; // "지금 전화해 주세요" 알림을 받기 편한 시간: "19:00-22:00"
  notify?: { weekly: boolean; questions: boolean };
  payer?: boolean; // 대표 결제자
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

// 매일 아침 안부 문자 한 건의 흐름: 발송 → (2시간 무응답) 재문자 → (1시간 무응답) 확인콜 → (30분 무응답) 가족 알림
export interface Checkin {
  id: string;
  familyId: string;
  date: string; // KST YYYY-MM-DD
  sentAt: string;
  resentAt?: string;
  callAt?: string;
  callResult?: "answered" | "missed";
  answer?: 1 | 2 | 3;
  answeredAt?: string;
  alertedAt?: string;
}

// 시뮬레이터 이벤트 로그 (문자·전화·가족 알림)
export interface SimEvent {
  id: string;
  familyId: string;
  at: string;
  kind: "sms_out" | "sms_in" | "call_out" | "call_in" | "alert" | "system";
  text: string;
}

// AI 안부콜 기록 (vox 연동 전에는 운영자가 직접 입력)
export interface Call {
  id: string;
  familyId: string;
  at: string;
  kind: "regular" | "ars" | "callback" | "transfer";
  answered: boolean;
  minutes: number;
  summary?: string;
  mood?: WeeklyReport["mood"];
  flags: string[]; // "연속 미응답", "건강 언급" 등
}

// 다음 통화를 개인화하는 핵심 사실 (손주 이름, 관심사, 최근 일)
export interface MemoryNote {
  id: string;
  familyId: string;
  text: string;
  createdAt: string;
}

// 회상 이야기 — 가족신문·회고록 원재료
export interface Story {
  id: string;
  familyId: string;
  topic: string;
  text: string;
  createdAt: string;
}

// 랜딩페이지 첫 달 무료 신청
export interface Lead {
  id: string;
  name: string;
  phone: string;
  siblings: number;
  plan: Plan;
  parentPhone: "2g" | "smart" | "landline";
  memo?: string;
  status: "new" | "contacted" | "onboarded" | "dropped";
  createdAt: string;
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
  calls: Call[];
  memories: MemoryNote[];
  stories: Story[];
  leads: Lead[];
  checkins: Checkin[];
  events: SimEvent[];
}
