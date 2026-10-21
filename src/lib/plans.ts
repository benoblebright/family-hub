import type { Plan } from "./types";

// 요금제 (VAT 포함, 가족방 단위 정액) — 원가 계산은 docs/PRICING.md
// 실시간 통화 연결은 넣지 않는다: 무료 "지금 전화해 주세요" 알림으로 대신하고, 제3자 녹음 문제도 피한다.
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
    price: 9900,
    calls: "AI 안부콜 주 1회",
    features: [
      "매일 아침 안부 문자 (숫자 하나로 답장)",
      "답이 없으면 재문자 → AI 확인콜 → 모두에게 알림",
      "엄마 질문 → 모두의 답장 모아서 전달",
      "\"지금 전화해 주세요\" 알림",
      "엄마 우체통 · 주간 요약",
    ],
  },
  {
    id: "standard",
    name: "스탠다드",
    tagline: "가족방",
    price: 16900,
    calls: "AI 안부콜 주 2회",
    features: ["베이직의 모든 기능", "AI 안부콜이 두 배 — 대화 소재와 기억이 더 쌓여요"],
    highlight: true,
  },
  {
    id: "premium",
    name: "프리미엄",
    tagline: "추억 기록",
    price: 29900,
    calls: "AI 안부콜 주 3회",
    features: ["스탠다드의 모든 기능", "종이 가족신문 월 1회 우편 발송", "회상 대화 (옛날 이야기 모으기)"],
  },
];

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
export const planName = (id: Plan) => PLANS.find((p) => p.id === id)?.name ?? id;
