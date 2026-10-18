import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ADMIN_KEY가 없으면(로컬 개발) 누구나 운영자 화면에 들어올 수 있다
export const ADMIN_COOKIE = "fh_admin";

export async function isAdmin() {
  const key = process.env.ADMIN_KEY;
  if (!key) return true;
  return (await cookies()).get(ADMIN_COOKIE)?.value === key;
}

export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("운영자 로그인이 필요해요.");
}
