"use client";

import { Icon } from "@/components/Icon";
import { useActionState } from "react";
import { startFamily, type FormState } from "@/app/actions";

const initial: FormState = { ok: false, message: "" };
const SIBLINGS = [
  { role: "", placeholder: "이름 (선택)" },
  { role: "", placeholder: "이름 (선택)" },
  { role: "", placeholder: "이름 (선택)" },
];

export function StartForm() {
  const [state, action, pending] = useActionState(startFamily, initial);
  return (
    <form action={action}>
      <section className="card">
        <h2>1. 부모님</h2>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="st-parent">호칭</label>
            <input type="text" id="st-parent" name="parentName" defaultValue="엄마" required maxLength={10} />
          </div>
          <div className="grow">
            <label className="field" htmlFor="st-time">아침 안부 문자 시각</label>
            <input type="time" id="st-time" name="checkinTime" defaultValue="09:00" required />
          </div>
        </div>
        <label className="field" htmlFor="st-phone">부모님 전화번호 (체험이면 비워도 돼요)</label>
        <input type="text" id="st-phone" name="parentPhone" inputMode="tel" placeholder="010-" />
        <label className="field" htmlFor="st-type">전화 종류</label>
        <select id="st-type" name="phoneType" defaultValue="smart">
          <option value="smart">스마트폰</option>
          <option value="2g">폴더폰</option>
          <option value="landline">집전화</option>
        </select>
      </section>

      <section className="card">
        <h2>2. 나</h2>
        <div className="row">
          <input type="text" name="childName" placeholder="내 이름" required maxLength={20} className="grow" aria-label="내 이름" />
          <input type="text" name="childRole" defaultValue="큰아들" placeholder="호칭" maxLength={10} style={{ width: 96 }} aria-label="내 호칭" />
        </div>
        <input type="hidden" name="childPhone" value="" />
      </section>

      <section className="card">
        <h2>3. 함께할 사람</h2>
        <p className="muted" style={{ marginBottom: 10 }}>형제·가족·친구 누구나 좋아요. 만들고 나면 한 명마다 초대 링크가 생겨요.</p>
        {SIBLINGS.map((s, i) => (
          <div className="row" key={i}>
            <input type="text" name="childName" placeholder={s.placeholder} maxLength={20} className="grow" aria-label={`가족 ${i + 1} 이름`} />
            <input type="text" name="childRole" defaultValue={s.role} placeholder="호칭 (딸·이모·친구)" maxLength={10} style={{ width: 96 }} aria-label={`가족 ${i + 1} 호칭`} />
            <input type="hidden" name="childPhone" value="" />
          </div>
        ))}
      </section>

      {state.message && <p className="muted"><Icon name="error" /> {state.message}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "만드는 중…" : "가족방 만들기"}
      </button>
    </form>
  );
}
