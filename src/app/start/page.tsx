import Link from "next/link";
import { StartForm } from "@/components/StartForm";

export default function Start() {
  return (
    <>
      <div className="hello">
        <small>첫 달 무료 · 1분이면 돼요</small>
        <h1>우리 가족방 만들기</h1>
      </div>
      <StartForm />
      <p className="footer">
        <Link href="/">← 서비스 소개</Link>
      </p>
    </>
  );
}
