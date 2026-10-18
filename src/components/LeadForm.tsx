"use client";

import { useActionState } from "react";
import { submitLead, type FormState } from "@/app/actions";
import { PLANS } from "@/lib/plans";

const initial: FormState = { ok: false, message: "" };

export function LeadForm() {
  const [state, action, pending] = useActionState(submitLead, initial);
  if (state.ok) return <div className="notice">{state.message}</div>;

  return (
    <form action={action} style={{ marginTop: 10 }}>
      <label className="field">신청하시는 분 성함</label>
      <input type="text" name="name" required autoComplete="name" />
      <label className="field">연락처</label>
      <input type="text" name="phone" required inputMode="tel" autoComplete="tel" placeholder="010-" />
      <div className="row">
        <div className="grow">
          <label className="field">형제 수 (본인 포함)</label>
          <select name="siblings" defaultValue="3">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}명{n === 5 ? " 이상" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grow">
          <label className="field">부모님 전화</label>
          <select name="parentPhone" defaultValue="2g">
            <option value="2g">2G·폴더폰</option>
            <option value="smart">스마트폰</option>
            <option value="landline">집전화</option>
          </select>
        </div>
      </div>
      <label className="field">관심 있는 요금제</label>
      <select name="plan" defaultValue="standard">
        {PLANS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.tagline}
          </option>
        ))}
      </select>
      <textarea name="memo" placeholder="부모님에 대해 알려주실 것 (선택) 예: 혼자 사세요, 귀가 조금 어두우세요" />
      <label className="check">
        <input type="checkbox" name="agree" required /> 연락을 위한 개인정보 수집·이용에 동의해요 (이름·연락처, 상담 후 3개월 보관)
      </label>
      {state.message && <p className="muted">⚠️ {state.message}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "보내는 중…" : "첫 달 무료 신청하기"}
      </button>
    </form>
  );
}
