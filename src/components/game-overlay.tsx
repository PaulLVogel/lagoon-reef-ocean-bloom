import { Circle, CreditCard, Crosshair, Gauge, Heart, Lock, Magnet, Play, Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { isGameStarted, setGameStarted } from "@/game/input";
import {
  getHud,
  pickShopOffer,
  requestNextWave,
  requestReroll,
  requestRestart,
  requestToggleSlotLock,
  subscribeHud,
} from "@/game/runtime";
import {
  allowsOverdraft,
  canAffordAny,
  SHOP_INTEREST_RATE,
  SHOP_PITY_GOLD,
  SHOP_PITY_HP,
  SHOP_REROLL_COST,
  type ShopKind,
  type ShopOffer,
  type ShopRarity,
} from "@/game/shop";
import { cn } from "@/lib/cn";
import { VirtualStick } from "./virtual-stick";

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shopIcon(kind: ShopKind) {
  if (kind === "add_blaster" || kind === "add_2_blasters") return Plus;
  if (kind === "turret_rate" || kind === "blaster_rate") return Gauge;
  if (kind === "snake_speed") return Zap;
  if (kind === "heal") return Heart;
  if (kind === "pickup_radius") return Circle;
  if (kind === "segment_vacuum") return Magnet;
  if (kind === "credit_card") return CreditCard;
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
  const goldShown = Math.round(hud.goldDisplay ?? gold);
  const slotLocked = hud.slotLocked ?? [false, false, false];
  const allLocked = offers.length > 0 && slotLocked.slice(0, offers.length).every(Boolean);
  const pricedOut = !picked && offers.length > 0 && !canAffordAny(gold, offers);
  const canReroll = !picked && !allLocked && gold >= SHOP_REROLL_COST;
  const interestPreview = Math.floor(Math.max(0, gold) * SHOP_INTEREST_RATE);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <header className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="rounded-xl border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-sm tracking-tight text-fg">Vampire Snake</p>
          <p className="text-xs text-muted">Wave {hud.wave ?? 1}</p>
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
          <Stat label="Gold" value={String(goldShown)} danger={goldShown < 0} />
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
                Buy one, lock cards, leftover gold carries
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
              {hud.kills} kill{hud.kills === 1 ? "" : "s"} · {goldShown} gold on hand · wave{" "}
              {hud.wave ?? 1}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Lifetime earned" value={String(hud.totalGoldEarned ?? 0)} />
              <Stat
                label="Efficiency"
                value={
                  (hud.kills ?? 0) > 0
                    ? `${((hud.totalGoldEarned ?? 0) / Math.max(1, hud.kills)).toFixed(1)} g/kill`
                    : "—"
                }
              />
              <Stat label="Banked next" value={String(hud.nextWaveBank ?? 0)} />
              <Stat label="On hand" value={String(goldShown)} danger={goldShown < 0} />
            </div>
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
              Buy one. Lock individual cards so they survive reroll and the next
              shop. Duplicate weapons merge up to Tier 3.
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              <span className={goldShown < 0 ? "text-red-400" : undefined}>
                {goldShown} gold
              </span>{" "}
              · {hud.kills} kill{hud.kills === 1 ? "" : "s"}
              {interestPreview > 0 ? ` · bank +${interestPreview}` : ""}
            </p>
            {pricedOut ? (
              <p className="mt-2 text-sm text-emerald-300">
                Priced out — skip heals {SHOP_PITY_HP} HP and grants +
                {SHOP_PITY_GOLD}g next wave.
              </p>
            ) : null}
            {(hud.lastPityHp ?? 0) > 0 || (hud.lastPityGold ?? 0) > 0 ? (
              <p className="mt-1 text-xs text-muted">
                Last consolation: +{hud.lastPityHp ?? 0} HP, +
                {hud.lastPityGold ?? 0}g
              </p>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {offers.map((offer, index) => (
                <ShopCard
                  key={offer.id}
                  offer={offer}
                  gold={gold}
                  selected={picked === offer.id}
                  boughtOther={Boolean(picked) && picked !== offer.id}
                  grayed={pricedOut}
                  slotLocked={Boolean(slotLocked[index])}
                  onPick={() => pickShopOffer(offer.id)}
                  onLock={() => requestToggleSlotLock(index)}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!canReroll}
                onClick={() => requestReroll()}
                className={cn(
                  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl",
                  "text-sm font-medium transition-transform duration-(--motion-quick)",
                  canReroll
                    ? "border border-border bg-surface text-fg hover:border-fg/30 active:scale-[0.98]"
                    : "cursor-not-allowed border border-border bg-surface text-muted",
                )}
              >
                Reroll unlocked · {SHOP_REROLL_COST}g
              </button>
              <button
                type="button"
                onClick={() => requestNextWave()}
                className={cn(
                  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl",
                  "text-sm font-medium transition-transform duration-(--motion-quick)",
                  "hover:opacity-95 active:scale-[0.98]",
                  pricedOut ? "shop-next-pulse" : "bg-fg text-bg",
                )}
              >
                <Play className="size-4" strokeWidth={2} />
                {picked
                  ? "Next wave"
                  : pricedOut
                    ? "Skip · pity + next"
                    : "Bank & next wave"}
              </button>
            </div>
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
  boughtOther,
  grayed,
  slotLocked,
  onPick,
  onLock,
}: {
  offer: ShopOffer;
  gold: number;
  selected: boolean;
  boughtOther: boolean;
  grayed: boolean;
  slotLocked: boolean;
  onPick: () => void;
  onLock: () => void;
}) {
  const Icon = shopIcon(offer.kind);
  const unaffordable = !allowsOverdraft(offer.kind) && gold < offer.cost && !selected;
  const rarity: ShopRarity = offer.rarity ?? "common";
  const legendary = rarity === "legendary" && !selected && !grayed;
  return (
    <div
      className={cn(
        "relative flex min-h-[9.5rem] flex-col rounded-2xl border p-4 text-left",
        selected
          ? "border-blood bg-blood/15"
          : grayed
            ? "border-border bg-surface grayscale"
            : legendary
              ? "shop-legend bg-surface"
              : rarity === "rare"
                ? "border-sky-400/40 bg-surface"
                : "border-border bg-surface",
        boughtOther || unaffordable || grayed ? "opacity-40" : null,
        slotLocked && !grayed ? "ring-1 ring-amber-300/50" : null,
      )}
    >
      <button
        type="button"
        disabled={boughtOther}
        onClick={onLock}
        className={cn(
          "absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg border",
          slotLocked
            ? "border-amber-300/60 bg-amber-300/20 text-amber-200"
            : "border-border bg-surface text-muted hover:text-fg",
          boughtOther ? "cursor-not-allowed" : null,
        )}
        aria-label={slotLocked ? "Unlock offer" : "Lock offer"}
      >
        <Lock className="size-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled={boughtOther || unaffordable}
        onClick={onPick}
        className={cn(
          "flex flex-1 flex-col text-left",
          boughtOther || unaffordable ? "cursor-not-allowed" : "active:scale-[0.99]",
        )}
      >
        <div className="flex items-start justify-between gap-2 pr-10">
          <Icon className={cn("size-5", selected ? "text-blood" : "text-fg")} strokeWidth={1.75} />
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "text-[10px] tracking-[0.14em] uppercase",
                rarity === "legendary"
                  ? "text-amber-300"
                  : rarity === "rare"
                    ? "text-sky-300"
                    : "text-muted",
              )}
            >
              {offer.merge ? `merge T${offer.mergeToTier ?? 2}` : rarity}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted">{offer.cost}g</span>
          </div>
        </div>
        <p className="font-display mt-3 text-lg leading-tight text-fg">{offer.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{offer.blurb}</p>
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="min-w-[4.5rem] rounded-xl border border-border bg-surface/80 px-3 py-2 text-right backdrop-blur-sm">
      <p className="text-[10px] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className={cn("font-mono text-sm tabular-nums", danger ? "text-red-400" : "text-fg")}>
        {value}
      </p>
    </div>
  );
}
