import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// 서비스 계정은 서버 환경변수로만 받는다 (브라우저로 절대 보내지 않음).
//  - FIREBASE_SERVICE_ACCOUNT: 콘솔에서 받은 JSON 전체 (한 줄 또는 base64)
//  - 또는 FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json);
    return { projectId: sa.project_id as string, clientEmail: sa.client_email as string, privateKey: sa.private_key as string };
  }
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (!projectId || !clientEmail || !key) return null;
  // Vercel 환경변수에 넣으면 줄바꿈이 "\n" 글자로 들어오는 경우가 많다
  return { projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") };
}

let app: App | null = null;

export function firestoreEnabled() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PRIVATE_KEY);
}

function getApp() {
  if (app) return app;
  if (getApps().length) return (app = getApps()[0]);
  const c = credentials();
  if (!c) throw new Error("Firebase 서비스 계정 환경변수가 없어요.");
  app = initializeApp({
    credential: cert(c),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${c.projectId}.firebasestorage.app`,
  });
  return app;
}

export function getFirestore() {
  return adminFirestore(getApp());
}

export function getBucket() {
  return getStorage(getApp()).bucket();
}
