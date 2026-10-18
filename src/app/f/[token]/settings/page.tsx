import Link from "next/link";
import { notFound } from "next/navigation";
import { findChild } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function Settings({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findChild(token);
  if (!found) notFound();
  const { child, parent } = found;

  return (
    <>
      <div className="hello">
        <small>{child.role} {child.name}님</small>
        <h1>내 설정</h1>
      </div>
      <section className="card">
        <SettingsForm
          token={token}
          motherName={parent.name}
          availableHours={child.availableHours ?? ""}
          weekly={child.notify?.weekly !== false}
          questions={child.notify?.questions !== false}
        />
      </section>
      <p className="footer">
        <Link href={`/f/${token}`}>← 가족방으로</Link>
      </p>
    </>
  );
}
