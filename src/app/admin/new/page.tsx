import { readDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { PLANS } from "@/lib/plans";
import { AdminNav } from "@/components/AdminNav";
import { createFamilyAdmin } from "../actions";

export const dynamic = "force-dynamic";

const ROLES = ["큰아들", "딸", "막내"];

// 신규 가족 온보딩 — 부모님 정보·안부콜 시간·가족 목록을 받고 자녀별 링크를 발급한다
export default async function NewFamily({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  await requireAdminPage();
  const { lead: leadId } = await searchParams;
  const db = await readDB();
  const lead = db.leads.find((l) => l.id === leadId);

  return (
    <>
      <AdminNav current="new" />
      <div className="hello">
        <small>{lead ? `${lead.name}님 신청 건` : "온보딩"}</small>
        <h1>새 가족 등록</h1>
      </div>

      <form action={createFamilyAdmin}>
        <input type="hidden" name="leadId" value={lead?.id ?? ""} />
        <section className="card">
          <h2>가족</h2>
          <label className="field">가족방 이름</label>
          <input type="text" name="familyName" placeholder="예: 엄마네 가족방" />
          <label className="field">요금제</label>
          <select name="plan" defaultValue={lead?.plan ?? "standard"}>
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.calls}
              </option>
            ))}
          </select>
        </section>

        <section className="card">
          <h2>부모님</h2>
          <div className="row">
            <div className="grow">
              <label className="field">호칭</label>
              <input type="text" name="parentName" defaultValue="엄마" required />
            </div>
            <div className="grow">
              <label className="field">전화 종류</label>
              <select name="phoneType" defaultValue={lead?.parentPhone ?? "smart"}>
                <option value="smart">스마트폰</option>
                <option value="2g">폴더폰</option>
                <option value="landline">집전화</option>
              </select>
            </div>
          </div>
          <label className="field">전화번호 (대표번호로 걸려오면 이 번호로 가족을 찾아요)</label>
          <input type="text" name="parentPhone" inputMode="tel" required placeholder="010-" />
          <label className="field" htmlFor="nf-checkin">매일 아침 안부 문자 시각</label>
          <input type="time" id="nf-checkin" name="checkinTime" defaultValue="09:00" />
          <label className="field">정기 안부콜 시간</label>
          <input type="text" name="callTimes" placeholder="예: 화·목·토 오전 10시" />
          <label className="field">통화 설정 메모</label>
          <textarea name="notes" defaultValue={lead?.memo} placeholder="말 속도, 청력, 사투리, 피해야 할 이야기 등" />
          <p className="muted">녹음·요약 동의는 첫 통화에서 받고 가족 운영 화면에 기록해요.</p>
        </section>

        <section className="card">
          <h2>가족 (알림톡 받을 사람)</h2>
          {Array.from({ length: 5 }, (_, i) => (
            <fieldset key={i} className="child-row">
              <div className="row">
                <input type="text" name="childName" placeholder={i === 0 ? "이름 (필수)" : `${i + 1}번째 사람 이름`} required={i === 0} className="grow" />
                <input type="text" name="childRole" placeholder="호칭" defaultValue={ROLES[i] ?? ""} style={{ width: 96 }} />
              </div>
              <div className="row">
                <input type="text" name="childPhone" placeholder="휴대폰" inputMode="tel" defaultValue={i === 0 ? lead?.phone : ""} className="grow" />
                <label className="check" title="대표 결제자">
                  <input type="radio" name="payer" value={i} defaultChecked={i === 0} />
                  대표 결제
                </label>
              </div>
            </fieldset>
          ))}
          <p className="muted">빈 줄은 무시해요. 등록하면 한 명마다 전용 링크가 만들어져요.</p>
        </section>

        <button className="btn">등록하고 링크 만들기</button>
      </form>
    </>
  );
}
