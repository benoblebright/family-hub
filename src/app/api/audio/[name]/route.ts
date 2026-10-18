import { promises as fs } from "fs";
import path from "path";
import { AUDIO_DIR } from "@/lib/db";

const TYPES: Record<string, string> = { webm: "audio/webm", m4a: "audio/mp4", ogg: "audio/ogg" };

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w-]+\.(webm|m4a|ogg)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(AUDIO_DIR, name));
    return new Response(buf, { headers: { "Content-Type": TYPES[name.split(".").pop()!], "Cache-Control": "private, max-age=86400" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
