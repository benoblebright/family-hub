import type { Plan } from "./types";

// 기획 대화에서 정한 요금제 (VAT 포함, 가족 단위 정액)
export const PLANS: {
  id: Plan;
  name: string;
  tagline: string;
  price: number;
  calls: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "basic",
    name: "베이직",
    tagline: "안부",
    price: 24900,
    calls: "AI 안부콜 주 2회",
    features: ["형제 주간 요약 알림톡", "이상 신호 알림", "엄마 우체통 (자녀 목소리 → 전화로 듣기)", "엄마 질문 → 형제 답장 취합", "원벨 콜백 · ARS 상시"],
  },
  {
    id: "standard",
    name: "스탠다드",
    tagline: "가족방",
    price: 39900,
    calls: "AI 안부콜 주 3회",
    features: ["베이직의 모든 기능", "실시간 자녀 연결 월 30분", "종이 가족신문 월 1회 우편 발송"],
    highlight: true,
  },
  {
    id: "premium",
    name: "프리미엄",
    tagline: "추억 기록",
    price: 59900,
    calls: "AI 안부콜 주 3회",
    features: ["스탠다드의 모든 기능", "실시간 자녀 연결 월 60분", "회상 대화 심화", "연말 회고록 책 1권 + 오디오북"],
  },
];

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
export const planName = (id: Plan) => PLANS.find((p) => p.id === id)?.name ?? id;
