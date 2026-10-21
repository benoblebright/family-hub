"use client";

import { Icon } from "@/components/Icon";
import { useActionState, useState } from "react";
import { submitCallCheck, submitMailbox, submitReply, type FormState } from "@/app/actions";
import VoiceRecorder from "./VoiceRecorder";
import { josa } from "@/lib/format";

const initial: FormState = { ok: false, message: "" };

function Result({ state }: { state: FormState }) {
  if (!state.message) return null;
  return state.ok ? <div className="notice">{state.message}</div> : <p className="muted"><Icon name="error" /> {state.message}</p>;
}

export function ReplyForm({ token, questionId, options }: { token: string; questionId: string; options: string[] }) {
  const [state, action, pending] = useActionState(submitReply, initial);
  const [choice, setChoice] = useState<string>();

  if (state.ok) return <Result state={state} />;

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="choice" value={choice ?? ""} />
      {options.length > 0 && (
        <div className="choices">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className="choice"
              aria-pressed={choice === o}
              onClick={() => setChoice(choice === o ? undefined : o)}
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <textarea name="text" placeholder="덧붙일 말 (예: 토요일 오전에 갈게요, 애들은 일요일에 와요)" />
      <VoiceRecorder label="엄마께 목소리로 답하기" />
      <label className="check">
        <input type="checkbox" name="hide" /> 메모는 엄마께는 빼줘 (함께하는 사람들만 봐요)
      </label>
      <Result state={state} />
      <button className="btn" disabled={pending}>
        {pending ? "보내는 중…" : "답장 보내기"}
      </button>
    </form>
  );
}

export function CallCheckForm({ token, motherName }: { token: string; motherName: string }) {
  const [state, action, pending] = useActionState(submitCallCheck, initial);
  const [open, setOpen] = useState(false);

  if (state.ok) return <Result state={state} />;
  if (!open)
    return (
      <button type="button" className="btn ok" onClick={() => setOpen(true)}>
        <Icon name="call" /> {josa(motherName, "이랑", "랑")} 통화했어요
      </button>
    );

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <input type="text" name="memo" placeholder="무슨 얘기 했어요? (선택, AI가 다음 통화에 참고해요)" />
      <Result state={state} />
      <button className="btn ok" disabled={pending}>
        {pending ? "기록 중…" : "기록하기"}
      </button>
    </form>
  );
}

export function MailboxForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitMailbox, initial);
  const [key, setKey] = useState(0);

  return (
    <form action={action} key={key}>
      <input type="hidden" name="token" value={token} />
      <VoiceRecorder label="엄마께 음성 메시지 녹음" />
      <textarea name="text" placeholder="글로 남기면 AI가 읽어드려요 (예: 엄마 이번 주 손주 운동회 1등 했어요!)" />
      <Result state={state} />
      {state.ok ? (
        <button type="button" className="btn secondary" onClick={() => setKey((k) => k + 1)}>
          하나 더 남기기
        </button>
      ) : (
        <button className="btn" disabled={pending}>
          {pending ? "넣는 중…" : "우체통에 넣기"}
        </button>
      )}
    </form>
  );
}
