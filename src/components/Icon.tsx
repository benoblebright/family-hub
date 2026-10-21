// Google Material Symbols (Rounded) — layout.tsx에서 폰트를 불러온다
export function Icon({ name, className = "", fill = false }: { name: string; className?: string; fill?: boolean }) {
  return (
    <span className={`ms ${fill ? "fill" : ""} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}
