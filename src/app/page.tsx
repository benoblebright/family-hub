import { Icon } from "@/components/Icon";
import Link from "next/link";
import { PLANS, won } from "@/lib/plans";
import { LeadForm } from "@/components/LeadForm";

const STEPS = [
  { icon: "call", title: "엄마는 전화만", body: "앱 설치 없이, 2G폰·집전화 그대로. 주 2~3회 AI가 다정하게 안부 전화를 드리고, 한 번 울리고 끊으시면 다시 걸어드려요." },
  { icon: "forum", title: "형제·가족·친구는 카톡 링크로", body: "통화 요약과 '이번 주 엄마께 물어볼 것 3가지'가 함께하는 모두에게 가요. 누가 이번 주에 통화했는지도 한눈에." },
  { icon: "sync_alt", title: "엄마가 먼저 물어요", body: "\"추석에 다들 언제 오니?\" 엄마 질문이 함께하는 사람들에게 가고, 각자 답하면 AI가 모아서 엄마께 전화로 들려드려요." },
];

const FAQ = [
  { q: "위급상황도 알려주나요?", a: "응급 관제 서비스가 아니에요. 연속으로 전화를 안 받으시거나 아프다는 말씀이 있으면 함께하는 사람들에게 알려드리는 데까지만 해요. 응급 상황은 119와 지자체 돌봄 서비스를 함께 이용해 주세요." },
  { q: "통화 녹음은 부모님이 동의하셔야 하나요?", a: "네. 첫 통화에서 부모님께 녹음·요약 동의를 음성으로 받고, 동의하지 않으시면 녹음 없이 안부만 여쭤요." },
  { q: "여럿이 요금을 나눌 수 있나요?", a: "가족방 단위 정액이라 몇 명이 함께하든 같은 요금이에요. 처음엔 대표 한 분이 결제하고, 나눠 내기는 곧 지원할 예정이에요." },
  { q: "AI가 가족 대신 전화하는 건가요?", a: "아니요. 대신하는 게 아니라 함께하는 분들이 직접 전화할 이야깃거리와 계기를 만들어 드리는 서비스예요. 우리가 보는 숫자도 '함께하는 사람들이 엄마께 전화한 횟수'예요." },
];

export default function Landing() {
  return (
    <>
      <header className="hero">
        <span className="tag">형제·가족·친구가 함께 구독 · 첫 달 무료</span>
        <h1>엄마가 먼저 묻는 가족방</h1>
        <p>
          혼자 계신 부모님께 AI가 안부 전화를 드리고, 형제·가족·친구가 함께 답해요.
          <br />
          부모님은 지금 쓰시는 전화 그대로면 돼요.
        </p>
        <Link className="btn" href="/start">
          지금 우리 가족방 만들기
        </Link>
        <div className="row" style={{ marginTop: 8 }}>
          <Link className="btn secondary" href="/f/minsu-demo/sim">
            <Icon name="smartphone" /> 엄마 폰 체험
          </Link>
          <a className="btn secondary" href="#apply">
            무료 신청
          </a>
        </div>
      </header>

      <section className="card">
        <h2>이렇게 돌아가요</h2>
        <ul className="plain">
          {STEPS.map((s) => (
            <li key={s.title} className="row" style={{ alignItems: "flex-start" }}>
              <span className="avatar"><Icon name={s.icon} /></span>
              <span className="grow">
                <b>{s.title}</b>
                <br />
                <span className="muted">{s.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card quote">
        <p>“큰애 토요일 오전, 딸 일요일 점심, 막내는 아직 답이 없어요.”</p>
        <span className="muted">— 엄마가 대표번호로 전화하시면 들으시는 말</span>
      </section>

      <h2 className="section-title">요금제</h2>
      {PLANS.map((p) => (
        <section key={p.id} className={`card plan ${p.highlight ? "highlight" : ""}`}>
          <h2>
            {p.name} <span className="muted">· {p.tagline}</span>
            {p.highlight && <span className="tag">가장 많이 선택</span>}
          </h2>
          <div className="price">
            월 {won(p.price)} <span className="muted">3명이 나누면 1인 {won(Math.round(p.price / 3 / 100) * 100)}</span>
          </div>
          <p>
            <b>{p.calls}</b>
          </p>
          <ul className="checks">
            {p.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted" style={{ margin: "0 4px 18px" }}>
        연간 결제 시 2개월 무료 · 어버이날·명절 선물용 3개월권도 준비 중이에요.
      </p>

      <section className="card" id="apply">
        <h2>첫 달 무료 신청</h2>
        <p className="muted">지금은 10가족만 먼저 모시고 있어요. 남겨주시면 하루 안에 연락드려요.</p>
        <LeadForm />
      </section>

      <section className="card">
        <h2>자주 묻는 질문</h2>
        <ul className="plain">
          {FAQ.map((f) => (
            <li key={f.q}>
              <b>{f.q}</b>
              <div className="muted">{f.a}</div>
            </li>
          ))}
        </ul>
      </section>

      <p className="footer">
        <Link href="/demo">데모 가족방·운영자 화면 둘러보기</Link>
      </p>
    </>
  );
}
