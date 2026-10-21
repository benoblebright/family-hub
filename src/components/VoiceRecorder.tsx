"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState } from "react";

// 브라우저에서 바로 녹음 → 숨은 file input(name)에 담아 폼과 함께 전송
export default function VoiceRecorder({ name = "audio", label = "목소리로 남기기" }: { name?: string; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "done" | "unsupported">("idle");
  const [url, setUrl] = useState<string>();
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && (!navigator.mediaDevices || typeof MediaRecorder === "undefined")) {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const dt = new DataTransfer();
        dt.items.add(new File([blob], `voice.${ext}`, { type: blob.type }));
        if (inputRef.current) inputRef.current.files = dt.files;
        setUrl(URL.createObjectURL(blob));
        setState("done");
      };
      recRef.current = rec;
      setSecs(0);
      rec.start();
      setState("recording");
    } catch {
      alert("마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용해 주세요.");
    }
  }

  function stop() {
    recRef.current?.stop();
  }

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
    if (url) URL.revokeObjectURL(url);
    setUrl(undefined);
    setState("idle");
  }

  if (state === "unsupported") return <p className="muted">이 브라우저에서는 녹음이 안 돼요. 글로 남겨 주세요.</p>;

  return (
    <div className="rec">
      <input ref={inputRef} type="file" name={name} accept="audio/*" hidden />
      {state === "idle" && (
        <button type="button" className="btn secondary" onClick={start}>
          <Icon name="mic" /> {label}
        </button>
      )}
      {state === "recording" && (
        <button type="button" className="btn secondary" onClick={stop}>
          <span className="dot" /> 녹음 중 {secs}초 · 눌러서 끝내기
        </button>
      )}
      {state === "done" && url && (
        <>
          <audio src={url} controls />
          <button type="button" className="btn small secondary" onClick={reset}>
            다시 녹음
          </button>
        </>
      )}
    </div>
  );
}
