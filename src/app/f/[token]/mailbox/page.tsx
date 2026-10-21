import { Icon } from "@/components/Icon";
import { MailboxForm } from "@/components/Forms";
import { loadFamilyPage } from "@/lib/family-page";
import { josa, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

// 우체통 탭: 엄마가 전화로 들으실 소식 남기기
export default async function Mailbox({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { db, parent, siblings } = await loadFamilyPage(token);
  const ids = new Set(siblings.map((s) => s.id));
  const items = db.mailbox.filter((m) => ids.has(m.childId)).reverse();
  const unplayed = items.filter((m) => !m.played).length;
  const roleOf = (id: string) => siblings.find((s) => s.id === id)?.role ?? "";

  return (
    <>
      <div className="hello">
        <small>{josa(parent.name, "이", "가")} 전화하시면 제일 먼저 들으세요</small>
        <h1>{parent.name} 우체통</h1>
      </div>

      <section className="card">
        <h2>
          <Icon name="edit_note" /> 소식 남기기
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          목소리나 글로 남기면 {josa(parent.name, "이", "가")} 대표번호로 전화하실 때 1번 &lsquo;소식 듣기&rsquo;로 들려드려요. 들을 거리가 있어야 먼저 전화하세요.
        </p>
        <MailboxForm token={token} />
      </section>

      <section className="card">
        <h2>
          <Icon name="markunread_mailbox" /> 남긴 소식
          <span className="tag">{unplayed > 0 ? `안 들으신 소식 ${unplayed}개` : "모두 들으셨어요"}</span>
        </h2>
        {items.length === 0 ? (
          <p className="muted">아직 남긴 소식이 없어요.</p>
        ) : (
          <ul className="plain">
            {items.map((m) => (
              <li key={m.id}>
                <div className="row">
                  <b className="grow">{roleOf(m.childId)}</b>
                  {m.played ? <span className="tag gray">들으심</span> : <span className="tag">대기</span>}
                </div>
                <span className="muted">{timeAgo(m.createdAt)}</span>
                {m.text && <div>{m.text}</div>}
                {m.audio && <audio src={`/api/audio/${m.audio}`} controls style={{ width: "100%", height: 36, marginTop: 6 }} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
