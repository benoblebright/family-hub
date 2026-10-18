"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      🖨️ 인쇄하기 (A4)
    </button>
  );
}
