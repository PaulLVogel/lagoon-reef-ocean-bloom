import { useCallback, useRef } from "react";
import { setStick, clearStick } from "@/game/input";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export function VirtualStick({ className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const apply = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    const knob = knobRef.current;
    if (!root || !knob) return;
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width / 2 - 18;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > max && mag > 0) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = max === 0 ? 0 : dx / max;
    const ny = max === 0 ? 0 : dy / max;
    setStick(nx, ny);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (pid.current !== null) return;
    pid.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    apply(e.clientX, e.clientY);
  };

  const end = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    clearStick();
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative size-[120px] touch-none select-none rounded-full border border-border bg-surface/70",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      role="application"
      aria-label="Move stick"
    >
      <div
        ref={knobRef}
        className="pointer-events-none absolute top-1/2 left-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)] will-change-transform"
      />
    </div>
  );
}
