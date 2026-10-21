"use client";

import { Icon } from "@/components/Icon";
import { useActionState } from "react";
import { saveChildSettings, type FormState } from "@/app/actions";
import { josa } from "@/lib/format";

const initial: FormState = { ok: false, message: "" };

export function SettingsForm(props: { token: string; motherName: string; availableHours: string; weekly: boolean; questions: boolean }) {
  const [state, action, pending] = useActionState(saveChildSettings, initial);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={props.token} />
      <label className="field">{josa(props.motherName, "이", "가")} &ldquo;지금 통화하고 싶다&rdquo; 하실 때 바로 연결해도 되는 시간</label>
      <input type="text" name="availableHours" defaultValue={props.availableHours} placeholder="예: 19:00-22:00 (비우면 알림으로만 전해요)" />
      <label className="check">
        <input type="checkbox" name="weekly" defaultChecked={props.weekly} /> 주간 안부 요약 알림 받기
      </label>
      <label className="check">
        <input type="checkbox" name="questions" defaultChecked={props.questions} /> {props.motherName} 질문 알림 받기
      </label>
      {state.message && (state.ok ? <div className="notice">{state.message}</div> : <p className="muted"><Icon name="error" /> {state.message}</p>)}
      <button className="btn" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
