"use client";

import { Icon } from "@/components/Icon";
export function PrintButton() {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      <Icon name="print" /> 인쇄하기 (A4)
    </button>
  );
}
