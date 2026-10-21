import Link from "next/link";
import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Demo() {
  const db = await readDB();
  return (
    <>
      <div className="hello">
        <small>가족 안부 허브 MVP</small>
        <h1>데모 둘러보기</h1>
      </div>
      <section className="card">
        <h2>가족방 (형제·가족·친구)</h2>
        <p className="muted">실서비스에선 함께하는 사람마다 알림톡 링크로 바로 들어와요.</p>
        <ul className="plain" style={{ marginTop: 10 }}>
          {db.children.map((c) => (
            <li key={c.id} className="row">
              <span className="grow">
                <b>{c.role}</b> {c.name}
              </span>
              <Link className="btn small secondary" href={`/f/${c.token}`}>
                열기
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>엄마 폰 시뮬레이터</h2>
        <p className="muted">아침 안부 문자 → 숫자 답장 / 무응답 → 재문자 → 확인콜 → 모두에게 알림을 시간 빨리감기로 재현해요.</p>
        <Link className="btn" href="/f/minsu-demo/sim" style={{ marginTop: 10 }}>
          📱 시뮬레이터 열기
        </Link>
      </section>
      <section className="card">
        <h2>운영자</h2>
        <p className="muted">가족 등록, 통화 기록, ARS 대본, 신청자 관리</p>
        <Link className="btn" href="/admin" style={{ marginTop: 10 }}>
          운영자 화면 열기
        </Link>
      </section>
      <p className="footer">
        <Link href="/">← 서비스 소개</Link>
      </p>
    </>
  );
}
