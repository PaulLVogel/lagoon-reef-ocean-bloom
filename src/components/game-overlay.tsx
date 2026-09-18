import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { isGameStarted, setGameStarted } from "@/game/input";
import { getHud, requestRestart, subscribeHud } from "@/game/runtime";
import { cn } from "@/lib/cn";
import { VirtualStick } from "./virtual-stick";

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GameOverlay() {
  const [hud, setHud] = useState(getHud);

  useEffect(() => subscribeHud(setHud), []);

  const start = () => {
    setGameStarted(true);
  };

  const showStart = !hud.playing && !hud.dead && !hud.waveClear && !isGameStarted();
  const urgent = hud.waveMs <= 5000 && !hud.waveClear && isGameStarted();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <header className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="rounded-xl border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-sm tracking-tight text-fg">Vampire Snake</p>
          <p className="text-xs text-muted">Phase 4 · Wave {hud.wave ?? 1}</p>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "min-w-[7.5rem] rounded-xl border px-4 py-2 text-center backdrop-blur-sm",
              urgent
                ? "border-blood bg-blood/20"
                : "border-border bg-surface/80",
            )}
          >
            <p className="text-[10px] tracking-[0.18em] text-muted uppercase">Wave</p>
            <p
              className={cn(
                "font-mono text-2xl tabular-nums leading-none",
                urgent ? "text-blood" : "text-fg",
              )}
            >
              {formatClock(hud.waveMs ?? 0)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Stat label="HP" value={`${hud.hp}/${hud.maxHp}`} />
          <Stat label="Kills" value={String(hud.kills ?? 0)} />
          <Stat label="Swarm" value={String(hud.swarm ?? 0)} />
        </div>
      </header>

      <div className="flex-1" />

      <div className="flex items-end justify-between p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <VirtualStick className="pointer-events-auto md:hidden" />
        <p className="hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs text-muted md:block">
          WASD · survive 30s
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
              Thirty seconds. The swarm thickens as the clock dies. Last until
              00:00 and the arena goes quiet.
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
                Hold the clock — spawn rate ramps
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
              Start wave
            </button>
          </div>
        </div>
      ) : null}

      {hud.dead ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/72 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-border bg-elevated p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Downed
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight text-fg">
              The swarm got you
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {hud.kills} kill{hud.kills === 1 ? "" : "s"} before the clock ran
              out.
            </p>
            <button
              type="button"
              onClick={() => requestRestart()}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "bg-fg text-sm font-medium text-bg transition-transform duration-(--motion-quick)",
                "hover:opacity-95 active:scale-[0.98]",
              )}
            >
              <Play className="size-4" strokeWidth={2} />
              Restart
            </button>
          </div>
        </div>
      ) : null}

      {hud.waveClear && !hud.dead ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/72 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-border bg-elevated p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Wave complete
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight text-fg">
              00:00 — arena clear
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Swarm despawned. Projectiles gone. Combat paused. Shop arrives
              next — for now, run it again.
            </p>
            <p className="mt-2 font-mono text-sm tabular-nums text-fg">
              {hud.kills} kill{hud.kills === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => requestRestart()}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "bg-fg text-sm font-medium text-bg transition-transform duration-(--motion-quick)",
                "hover:opacity-95 active:scale-[0.98]",
              )}
            >
              <Play className="size-4" strokeWidth={2} />
              Run another wave
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
