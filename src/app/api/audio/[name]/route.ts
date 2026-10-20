import { loadAudio } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const audio = await loadAudio(name);
  if (!audio) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(audio.buf), {
    headers: { "Content-Type": audio.type, "Cache-Control": "private, max-age=86400" },
  });
}
