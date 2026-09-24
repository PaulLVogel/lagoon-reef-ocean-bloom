import { Circle, CreditCard, Crosshair, Gauge, Heart, Lock, Magnet, Play, Plus, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hasGamepad, isGameStarted, sampleGamepadUi, setGameStarted } from "@/game/input";
import {
  getHud,
  pickLevelOffer,
  pickShopOffer,
  requestBuyCart,
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
  if (kind === "add_head_weapon") return Crosshair;
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
  const [padOn, setPadOn] = useState(false);
  const [focus, setFocus] = useState(0);
  const hudRef = useRef(hud);
  const focusRef = useRef(0);
  hudRef.current = hud;
  focusRef.current = focus;

  useEffect(() => subscribeHud(setHud), []);

  useEffect(() => {
    setFocus(0);
  }, [hud.waveClear, hud.leveling, hud.dead, hud.levelOffers?.length, hud.shopOffers?.length]);

  useEffect(() => {
    const onPad = () => setPadOn(hasGamepad());
    window.addEventListener("gamepadconnected", onPad);
    window.addEventListener("gamepaddisconnected", onPad);
    onPad();
    return () => {
      window.removeEventListener("gamepadconnected", onPad);
      window.removeEventListener("gamepaddisconnected", onPad);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = sampleGamepadUi();
      if (pad.connected !== padOn) setPadOn(pad.connected);
      const snap = hudRef.current;
      const showStartNow = !snap.playing && !snap.dead && !snap.waveClear && !isGameStarted();
      if (showStartNow && (pad.confirm || pad.start)) setGameStarted(true);
      else if (snap.dead && (pad.confirm || pad.start)) requestRestart();
      else if (snap.leveling && !snap.dead) {
        const n = snap.levelOffers?.length ?? 0;
        if (n > 0) {
          if (pad.left || pad.up) setFocus((i) => (i + n - 1) % n);
          if (pad.right || pad.down) setFocus((i) => (i + 1) % n);
          if (pad.confirm) {
            const offer = snap.levelOffers[focusRef.current % n];
            if (offer) pickLevelOffer(offer.id);
          }
        }
      } else if (snap.waveClear && !snap.dead && !snap.leveling) {
        const offers = snap.shopOffers ?? [];
        const n = offers.length;
        if (n > 0) {
          if (pad.left || pad.up) setFocus((i) => (i + n - 1) % n);
          if (pad.right || pad.down) setFocus((i) => (i + 1) % n);
          const offer = offers[focusRef.current % n];
          if (pad.confirm && offer) pickShopOffer(offer.id);
          if (pad.lock) requestToggleSlotLock(focusRef.current % n);
        }
        if (pad.reroll) requestReroll();
        if (pad.start) requestNextWave();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [padOn]);

  const start = () => {
    setGameStarted(true);
  };

  const showStart = !hud.playing && !hud.dead && !hud.waveClear && !isGameStarted();
  const urgent = hud.waveMs <= 5000 && !hud.waveClear && isGameStarted();
  const offers = hud.shopOffers ?? [];
  const bought = hud.shopBought ?? [];
  const cart = hud.shopCart ?? [];
  const gold = hud.gold ?? 0;
  const goldShown = Math.round(hud.goldDisplay ?? gold);
  const slotLocked = hud.slotLocked ?? Array.from({ length: offers.length }, () => false);
  const remaining = offers.filter((o) => !bought.includes(o.id));
  const pricedOut = remaining.length > 0 && !canAffordAny(gold, remaining);
  const canReroll =
    gold >= SHOP_REROLL_COST &&
    offers.some((o, i) => !slotLocked[i] && !bought.includes(o.id));
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
            <p className={cn("font-mono text-2xl tabular-nums leading-none", urgent ? "text-blood" : "text-fg")}>
              {formatClock(hud.waveMs ?? 0)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Stat label="HP" value={`${hud.hp}/${hud.maxHp}`} />
          <Stat label="Gold" value={String(goldShown)} danger={goldShown < 0} />
          <Stat label="Kills" value={String(hud.kills ?? 0)} />
          <Stat label="Seg" value={String(hud.segments ?? 0)} />
          <Stat label={`Lv ${hud.playerLevel ?? 1}`} value={`${hud.xp ?? 0}/${hud.xpNextLevel ?? 18}`} />
          {hud.fever ? <Stat label="Fever" value={`x2 \u00b7 ${hud.combo ?? 0}`} /> : null}
        </div>
      </header>
      <div className="flex-1" />
      <div className="flex items-end justify-between p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <VirtualStick className="pointer-events-auto [@media(pointer:fine)]:hidden" />
        <p className="hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs text-muted [@media(pointer:fine)]:block">
          {padOn ? "Left stick / D-pad \u00b7 A confirm \u00b7 Start next" : "WASD or gamepad \u00b7 head collects gems"}
        </p>
        <div className="h-[132px] w-[132px] [@media(pointer:fine)]:hidden" aria-hidden />
      </div>
      {showStart ? (
        <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-bg/72 px-4 py-8 backdrop-blur-[2px]">
          <div className="mx-auto my-auto w-full max-w-md rounded-3xl border border-border bg-elevated p-7">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Arena prototype</p>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight text-fg">Vampire Snake</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">Kill the swarm. Only the head picks up gems. Spend gold in the shop between waves.</p>
            <button type="button" onClick={start} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg hover:opacity-95 active:scale-[0.98]">
              <Play className="size-4" strokeWidth={2} /> Start wave
            </button>
          </div>
        </div>
      ) : null}
      {hud.dead ? (
        <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-bg/72 px-4 py-8 backdrop-blur-[2px]">
          <div className="mx-auto my-auto w-full max-w-md rounded-3xl border border-border bg-elevated p-7">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Downed</p>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight text-fg">The swarm got you</h1>
            <p className="mt-3 text-sm text-muted">{hud.kills} kills \u00b7 {goldShown} gold \u00b7 wave {hud.wave ?? 1}.</p>
            <button type="button" onClick={() => requestRestart()} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg">
              <Play className="size-4" strokeWidth={2} /> Restart
            </button>
          </div>
        </div>
      ) : null}
      {hud.leveling && !hud.dead ? (
        <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-bg/78 px-4 py-8 backdrop-blur-[2px]">
          <div className="mx-auto my-auto w-full max-w-3xl rounded-3xl border border-border bg-elevated p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Level {hud.playerLevel ?? 1}</p>
            <h1 className="font-display mt-2 text-3xl text-fg">Level up</h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(hud.levelOffers ?? []).map((offer, index) => (
                <button key={offer.id} type="button" onClick={() => pickLevelOffer(offer.id)} className={cn("flex min-h-[8.5rem] flex-col rounded-2xl border bg-surface p-4 text-left", index === focus ? "border-fg" : "border-border")}>
                  <p className="text-[10px] tracking-[0.16em] text-muted uppercase">{offer.weaponSlot === "head" ? "Head Upgrade" : offer.weaponSlot === "segment" ? "New Segment" : "Stat"}</p>
                  <p className="font-display text-lg text-fg">{offer.title}</p>
                  <p className="mt-2 text-sm text-muted">{offer.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {hud.waveClear && !hud.dead && !hud.leveling ? (
        <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-bg/78 px-4 py-8 backdrop-blur-[2px]">
          <div className="mx-auto my-auto w-full max-w-3xl rounded-3xl border border-border bg-elevated p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Wave {hud.wave ?? 1} clear</p>
            <h1 className="font-display mt-2 text-3xl text-fg">Shop</h1>
            <p className="mt-2 text-sm text-muted">Tap cards to select or deselect. Buy spends gold and keeps the shop open. Next Wave drops an unbought cart.</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">{goldShown} gold{interestPreview > 0 ? ` \u00b7 bank +${interestPreview}` : ""}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {offers.map((offer, index) => (
                <ShopCard
                  key={offer.id}
                  offer={offer}
                  gold={gold}
                  selected={cart.includes(offer.id) || bought.includes(offer.id)}
                  purchased={bought.includes(offer.id)}
                  grayed={pricedOut && !bought.includes(offer.id) && !cart.includes(offer.id)}
                  slotLocked={Boolean(slotLocked[index])}
                  focused={index === focus}
                  onPick={() => pickShopOffer(offer.id)}
                  onLock={() => requestToggleSlotLock(index)}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={!canReroll} onClick={() => requestReroll()} className={cn("inline-flex h-12 flex-1 items-center justify-center rounded-xl text-sm", canReroll ? "border border-border bg-surface text-fg" : "cursor-not-allowed border border-border bg-surface text-muted")}>
                Reroll unlocked \u00b7 {SHOP_REROLL_COST}g
              </button>
              <button type="button" disabled={cart.length === 0} onClick={() => requestBuyCart()} className={cn("inline-flex h-12 flex-1 items-center justify-center rounded-xl text-sm font-medium", cart.length ? "bg-blood text-fg" : "cursor-not-allowed border border-border bg-surface text-muted")}>
                Buy selected{cart.length ? ` \u00b7 ${cart.length}` : ""}
              </button>
              <button type="button" onClick={() => requestNextWave()} className={cn("inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium", pricedOut ? "shop-next-pulse" : "bg-fg text-bg")}>
                <Play className="size-4" strokeWidth={2} /> {bought.length ? "Next wave" : pricedOut ? "Skip \u00b7 pity + next" : "Bank & next wave"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShopCard({
  offer, gold, selected, purchased, grayed, slotLocked, focused, onPick, onLock,
}: {
  offer: ShopOffer; gold: number; selected: boolean; purchased: boolean; grayed: boolean; slotLocked: boolean; focused?: boolean; onPick: () => void; onLock: () => void;
}) {
  const Icon = shopIcon(offer.kind);
  const unaffordable = !allowsOverdraft(offer.kind) && gold < offer.cost && !selected && !purchased;
  const rarity: ShopRarity = offer.rarity ?? "common";
  return (
    <div className={cn("relative flex min-h-[9.5rem] flex-col rounded-2xl border p-4 text-left", selected ? "border-blood bg-blood/15" : grayed ? "border-border bg-surface grayscale" : rarity === "rare" ? "border-sky-400/40 bg-surface" : "border-border bg-surface", purchased || unaffordable || grayed ? "opacity-40" : null, slotLocked && !grayed ? "ring-1 ring-amber-300/50" : null, focused ? "ring-1 ring-fg/50" : null)}>
      <button type="button" disabled={purchased} onClick={onLock} className={cn("absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg border", slotLocked ? "border-amber-300/60 bg-amber-300/20 text-amber-200" : "border-border bg-surface text-muted")} aria-label={slotLocked ? "Unlock offer" : "Lock offer"}>
        <Lock className="size-3.5" strokeWidth={2} />
      </button>
      <button type="button" disabled={purchased || unaffordable} onClick={onPick} className={cn("flex flex-1 flex-col text-left", purchased || unaffordable ? "cursor-not-allowed" : "active:scale-[0.99]")}>
        <div className="flex items-start justify-between gap-2 pr-10">
          <Icon className={cn("size-5", selected ? "text-blood" : "text-fg")} strokeWidth={1.75} />
          <span className="font-mono text-xs tabular-nums text-muted">{offer.cost}g</span>
        </div>
        <p className="font-display mt-3 text-lg leading-tight text-fg">{offer.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{offer.blurb}</p>
      </button>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="min-w-[4.5rem] rounded-xl border border-border bg-surface/80 px-3 py-2 text-right backdrop-blur-sm">
      <p className="text-[10px] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className={cn("font-mono text-sm tabular-nums", danger ? "text-red-400" : "text-fg")}>{value}</p>
    </div>
  );
}
