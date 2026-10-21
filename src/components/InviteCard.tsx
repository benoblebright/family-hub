"use client";

import { useState } from "react";
import type { Child } from "@/lib/types";

// 가족 초대 링크 (R2-2) — 알림톡 연동 전에는 카톡으로 직접 보낸다
export function InviteCard(props: { origin: string; me: Child; siblings: Child[]; familyName: string; motherName: string; open: boolean }) {
  const [copied, setCopied] = useState<string>();
  const others = props.siblings.filter((s) => s.id !== props.me.id);
  const message = (s: Child) =>
    `[가족 안부 허브] ${s.name}님, ${props.me.name}님이 '${props.familyName}'에 초대했어요.\n${props.motherName} 아침 안부와 가족들 소식을 같이 봐요.\n\n▶ ${props.origin}/f/${s.token}`;

  async function copy(s: Child) {
    try {
      await navigator.clipboard.writeText(message(s));
      setCopied(s.id);
    } catch {
      setCopied(undefined);
      prompt("아래 문구를 복사해 주세요", message(s));
    }
  }

  return (
    <details className="card" open={props.open}>
      <summary>
        <b>{props.open ? "🎉 가족방이 만들어졌어요! 가족들을 초대하세요" : "👥 가족 초대 링크"}</b>
      </summary>
      <ul className="plain" style={{ marginTop: 10 }}>
        {others.map((s) => (
          <li key={s.id} className="row">
            <span className="grow">
              <b>{s.role}</b> {s.name}
              <br />
              <span className="muted" style={{ wordBreak: "break-all" }}>
                {props.origin}/f/{s.token}
              </span>
            </span>
            <button type="button" className="btn small secondary" onClick={() => copy(s)}>
              {copied === s.id ? "복사됨 ✓" : "초대 문구 복사"}
            </button>
          </li>
        ))}
      </ul>
      {props.open && <p className="muted">이 페이지 주소는 {props.me.name}님 전용 링크예요. 즐겨찾기 해 두세요.</p>}
    </details>
  );
}
