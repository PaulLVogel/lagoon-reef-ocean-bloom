import { Circle, Crosshair, Gauge, Heart, Magnet, Play, Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { isGameStarted, setGameStarted } from "@/game/input";
import {
  getHud,
  pickShopOffer,
  requestNextWave,
  requestRestart,
  subscribeHud,
} from "@/game/runtime";
import { canAffordAny, type ShopKind, type ShopOffer } from "@/game/shop";
import { cn } from "@/lib/cn";
import { VirtualStick } from "./virtual-stick";

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shopIcon(kind: ShopKind) {
  if (kind === "add_blaster") return Plus;
  if (kind === "turret_rate" || kind === "blaster_rate") return Gauge;
  if (kind === "snake_speed") return Zap;
  if (kind === "heal") return Heart;
  if (kind === "pickup_radius") return Circle;
  if (kind === "segment_vacuum") return Magnet;
  return Crosshair;
}

export function GameOverlay() {
  const [hud, setHud] = useState(getHud);

  useEffect(() => subscribeHud(setHud), []);

  const start = () => {
    setGameStarted(true);
  };

  const showStart = !hud.playing && !hud.dead && !hud.waveClear && !isGameStarted();
  const urgent = hud.waveMs <= 5000 && !hud.waveClear && isGameStarted();
  const offers = hud.shopOffers ?? [];
  const picked = hud.shopPicked;
  const gold = hud.gold ?? 0;
  const canBuy = canAffordAny(gold, offers);
  const canContinue = Boolean(picked) || (offers.length > 0 && !canBuy);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <header className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="rounded-xl border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-sm tracking-tight text-fg">Vampire Snake</p>
          <p className="text-xs text-muted">Phase 6 · Wave {hud.wave ?? 1}</p>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "min-w-[7.5rem] rounded-xl border px-4 py-2 text-center backdrop-blur-sm",
              urgent ? "border-blood bg-blood/20" : "border-border bg-surface/80",
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
          <Stat label="Gold" value={String(gold)} />
          <Stat label="Kills" value={String(hud.kills ?? 0)} />
          <Stat label="Seg" value={String(hud.segments ?? 0)} />
          {hud.fever ? <Stat label="Fever" value={`x2 · ${hud.combo ?? 0}`} /> : null}
        </div>
      </header>

      <div className="flex-1" />

      <div className="flex items-end justify-between p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <VirtualStick className="pointer-events-auto md:hidden" />
        <p className="hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs text-muted md:block">
          WASD · head collects gems
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
              Kill the swarm. Only the head picks up gems. Spend gold in the shop
              between waves.
            </p>
            <ul className="mt-5 space-y-1.5 text-sm text-fg">
              <li className="flex gap-2">
                <span className="text-muted">01</span>
                WASD or left stick to move
              </li>
              <li className="flex gap-2">
                <span className="text-muted">02</span>
                Green / blue / red gems, health, magnet — head only
              </li>
              <li className="flex gap-2">
                <span className="text-muted">03</span>
                Buy one upgrade, leftover gold carries
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
              {hud.kills} kill{hud.kills === 1 ? "" : "s"} · {gold} gold on wave{" "}
              {hud.wave ?? 1}.
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
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/78 px-4 py-8 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-elevated p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-7">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Wave {hud.wave ?? 1} clear
            </p>
            <h1 className="font-display mt-2 text-3xl leading-tight tracking-tight text-fg sm:text-4xl">
              Shop
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Spend gold on one upgrade. Leftover carries. Gems vacuum at 00:00.
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              {gold} gold · {hud.kills} kill{hud.kills === 1 ? "" : "s"}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {offers.map((offer) => (
                <ShopCard
                  key={offer.id}
                  offer={offer}
                  gold={gold}
                  selected={picked === offer.id}
                  locked={Boolean(picked) && picked !== offer.id}
                  onPick={() => pickShopOffer(offer.id)}
                />
              ))}
            </div>
            {!canBuy && !picked ? (
              <p className="mt-3 text-sm text-muted">
                Not enough gold this round — skip to the next wave.
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => requestNextWave()}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "text-sm font-medium transition-transform duration-(--motion-quick)",
                canContinue
                  ? "bg-fg text-bg hover:opacity-95 active:scale-[0.98]"
                  : "cursor-not-allowed bg-surface text-muted",
              )}
            >
              <Play className="size-4" strokeWidth={2} />
              Next wave
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShopCard({
  offer,
  gold,
  selected,
  locked,
  onPick,
}: {
  offer: ShopOffer;
  gold: number;
  selected: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  const Icon = shopIcon(offer.kind);
  const unaffordable = gold < offer.cost && !selected;
  return (
    <button
      type="button"
      disabled={locked || unaffordable}
      onClick={onPick}
      className={cn(
        "flex min-h-[9.5rem] flex-col rounded-2xl border p-4 text-left transition-transform duration-(--motion-quick)",
        selected
          ? "border-blood bg-blood/15"
          : "border-border bg-surface hover:border-fg/30",
        locked || unaffordable ? "cursor-not-allowed opacity-45" : "active:scale-[0.99]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className={cn("size-5", selected ? "text-blood" : "text-fg")} strokeWidth={1.75} />
        <span className="font-mono text-xs tabular-nums text-muted">{offer.cost}g</span>
      </div>
      <p className="font-display mt-3 text-lg leading-tight text-fg">{offer.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{offer.blurb}</p>
    </button>
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
