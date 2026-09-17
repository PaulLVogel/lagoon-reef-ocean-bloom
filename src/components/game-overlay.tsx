import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { isGameStarted, setGameStarted } from "@/game/input";
import { getHud, subscribeHud } from "@/game/runtime";
import { cn } from "@/lib/cn";
import { VirtualStick } from "./virtual-stick";

export function GameOverlay() {
  const [hud, setHud] = useState(getHud);

  useEffect(() => subscribeHud(setHud), []);

  const start = () => {
    setGameStarted(true);
  };

  const showStart = !hud.playing && !isGameStarted();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <header className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="rounded-xl border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-sm tracking-tight text-fg">Vampire Snake</p>
          <p className="text-xs text-muted">Phase 2 · Weapons</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Stat label="HP" value={`${hud.hp}/${hud.maxHp}`} />
          <Stat label="Dummy" value={`${hud.dummyHp ?? 0}/${hud.dummyMax ?? 100}`} />
          <Stat label="Hits" value={String(hud.hits ?? 0)} />
          <Stat label="Body" value={String(hud.segments)} />
        </div>
      </header>

      <div className="flex-1" />

      <div className="flex items-end justify-between p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <VirtualStick className="pointer-events-auto md:hidden" />
        <p className="hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs text-muted md:block">
          WASD · auto-fire from body segments
        </p>
        <div className="h-[120px] w-[120px] md:hidden" aria-hidden />
      </div>

      {showStart ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/72 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-border bg-elevated p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Arena prototype
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight text-fg">
              Vampire Snake
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Weapons sit on the body. The first segment fires forward, the
              second tracks the dummy, the third spins a blade. Walk the dummy
              down to confirm damage.
            </p>
            <ul className="mt-5 space-y-1.5 text-sm text-fg">
              <li className="flex gap-2">
                <span className="text-muted">01</span>
                WASD or left stick to move
              </li>
              <li className="flex gap-2">
                <span className="text-muted">02</span>
                Auto-fire from segments 1–3
              </li>
              <li className="flex gap-2">
                <span className="text-muted">03</span>
                Dummy to the right of spawn
              </li>
            </ul>
            <button
              type="button"
              onClick={start}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "bg-fg text-sm font-medium text-bg transition-transform duration-(--motion-quick)",
                "hover:opacity-95 active:scale-[0.98]",
              )}
            >
              <Play className="size-4" strokeWidth={2} />
              Start
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[4.5rem] rounded-xl border border-border bg-surface/80 px-3 py-2 text-right backdrop-blur-sm">
      <p className="text-[10px] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}
