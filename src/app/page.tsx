import Link from "next/link";
import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDB();
  return (
    <>
      <div className="hello">
        <small>가족 안부 허브 MVP</small>
        <h1>엄마가 먼저 묻는 가족방</h1>
      </div>
      <section className="card">
        <h2>데모 링크</h2>
        <p className="muted">실서비스에선 각 자녀가 알림톡 링크로 바로 들어와요.</p>
        <ul className="plain" style={{ marginTop: 10 }}>
          {db.children.map((c) => (
            <li key={c.id} className="row">
              <span className="grow">
                <b>{c.role}</b> {c.name}의 가족방
              </span>
              <Link className="btn small secondary" href={`/f/${c.token}`}>
                열기
              </Link>
            </li>
          ))}
          <li className="row">
            <span className="grow">
              <b>운영자</b> 질문 등록·마감 요약·주간 리포트
            </span>
            <Link className="btn small" href="/admin">
              열기
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
