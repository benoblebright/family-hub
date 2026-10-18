import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <div className="hello">
        <small>운영자</small>
        <h1>로그인</h1>
      </div>
      <form action={login} className="card">
        <label className="field">운영자 키</label>
        <input type="text" name="key" autoComplete="current-password" required />
        {error && <p className="muted">⚠️ 키가 맞지 않아요.</p>}
        <button className="btn">들어가기</button>
      </form>
    </>
  );
}
