import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Play } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DxaN0mvf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var WORLD_SIZE = 4800;
var COLOR = {
	arena: 790034,
	grid: 1514274,
	gridLine: 2238515,
	bound: 2765120,
	head: 15985638,
	snout: 16775412,
	eye: 1708560,
	segment: 12082263,
	segmentAlt: 10111044,
	segmentCore: 13924980,
	dummy: 7041920,
	dummyHurt: 15261142,
	blaster: 16051171,
	turret: 12964056,
	blade: 13924466,
	hp: 12082263
};
var fallback = {
	snap: {
		playing: false,
		speed: 0,
		segments: 6,
		hp: 100,
		maxHp: 100,
		dummyHp: 100,
		dummyMax: 100,
		hits: 0
	},
	started: false,
	injected: null,
	stickX: 0,
	stickY: 0,
	keys: /* @__PURE__ */ new Set(),
	listeners: /* @__PURE__ */ new Set()
};
function runtime() {
	if (typeof window === "undefined") return fallback;
	const w = window;
	if (!w.__vsRuntime) w.__vsRuntime = {
		snap: { ...fallback.snap },
		started: false,
		injected: null,
		stickX: 0,
		stickY: 0,
		keys: /* @__PURE__ */ new Set(),
		listeners: /* @__PURE__ */ new Set()
	};
	return w.__vsRuntime;
}
function getHud() {
	return runtime().snap;
}
function patchHud(partial) {
	const b = runtime();
	b.snap = {
		...b.snap,
		...partial
	};
	b.listeners.forEach((fn) => fn(b.snap));
}
function subscribeHud(fn) {
	const b = runtime();
	b.listeners.add(fn);
	fn(b.snap);
	return () => {
		b.listeners.delete(fn);
	};
}
var GAME_CODES = /* @__PURE__ */ new Set([
	"KeyW",
	"KeyA",
	"KeyS",
	"KeyD",
	"ArrowUp",
	"ArrowLeft",
	"ArrowDown",
	"ArrowRight"
]);
function radialDeadzone(x, y, dz = .18) {
	const m = Math.hypot(x, y);
	if (m < dz) return {
		x: 0,
		y: 0
	};
	const scale = (m - dz) / (1 - dz) / m;
	return {
		x: x * scale,
		y: y * scale
	};
}
function setGameStarted(value) {
	const b = runtime();
	b.started = value;
	if (value) patchHud({ playing: true });
}
function isGameStarted() {
	return runtime().started;
}
function setInjectedKeys(codes) {
	const b = runtime();
	b.injected = new Set(codes);
	if (codes.length > 0) {
		b.started = true;
		patchHud({ playing: true });
	}
}
function setStick(x, y) {
	const v = radialDeadzone(x, y);
	const b = runtime();
	b.stickX = v.x;
	b.stickY = v.y;
}
function clearStick() {
	const b = runtime();
	b.stickX = 0;
	b.stickY = 0;
}
function installKeyboard(target = window) {
	const onDown = (e) => {
		if (GAME_CODES.has(e.code)) e.preventDefault();
		runtime().keys.add(e.code);
	};
	const onUp = (e) => {
		runtime().keys.delete(e.code);
	};
	const clear = () => runtime().keys.clear();
	target.addEventListener("keydown", onDown);
	target.addEventListener("keyup", onUp);
	window.addEventListener("blur", clear);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) clear();
	});
	return () => {
		target.removeEventListener("keydown", onDown);
		target.removeEventListener("keyup", onUp);
		window.removeEventListener("blur", clear);
	};
}
function has(code) {
	const b = runtime();
	if (b.injected) return b.injected.has(code);
	return b.keys.has(code);
}
function readGamepad() {
	const pads = navigator.getGamepads?.() ?? [];
	for (const pad of pads) {
		if (!pad) continue;
		const raw = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
		if (raw.x !== 0 || raw.y !== 0) return raw;
		let x = 0;
		let y = 0;
		if (pad.buttons[14]?.pressed) x -= 1;
		if (pad.buttons[15]?.pressed) x += 1;
		if (pad.buttons[12]?.pressed) y -= 1;
		if (pad.buttons[13]?.pressed) y += 1;
		if (x !== 0 || y !== 0) {
			const m = Math.hypot(x, y) || 1;
			return {
				x: x / m,
				y: y / m
			};
		}
	}
	return {
		x: 0,
		y: 0
	};
}
/** Screen-space move: x right, y down. Magnitude 0..1. */
function sampleMove() {
	const b = runtime();
	if (!b.started) return {
		x: 0,
		y: 0
	};
	let x = 0;
	let y = 0;
	if (has("KeyA") || has("ArrowLeft")) x -= 1;
	if (has("KeyD") || has("ArrowRight")) x += 1;
	if (has("KeyW") || has("ArrowUp")) y -= 1;
	if (has("KeyS") || has("ArrowDown")) y += 1;
	if (x !== 0 || y !== 0) {
		const m = Math.hypot(x, y) || 1;
		return {
			x: x / m,
			y: y / m
		};
	}
	if (b.stickX !== 0 || b.stickY !== 0) return {
		x: b.stickX,
		y: b.stickY
	};
	return readGamepad();
}
function GameCanvas() {
	const hostRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!hostRef.current) return;
		let game = null;
		let cancelled = false;
		import("./createGame-R2wOgV5y.mjs").then(({ createGame }) => {
			if (cancelled || !hostRef.current) return;
			game = createGame(hostRef.current);
		});
		return () => {
			cancelled = true;
			game?.destroy(true);
			game = null;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: hostRef,
		id: "phaser-root",
		className: "absolute inset-0 h-full w-full touch-none overflow-hidden [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function VirtualStick({ className }) {
	const rootRef = (0, import_react.useRef)(null);
	const knobRef = (0, import_react.useRef)(null);
	const pid = (0, import_react.useRef)(null);
	const apply = (0, import_react.useCallback)((clientX, clientY) => {
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
			dx = dx / mag * max;
			dy = dy / mag * max;
		}
		knob.style.transform = `translate(${dx}px, ${dy}px)`;
		setStick(max === 0 ? 0 : dx / max, max === 0 ? 0 : dy / max);
	}, []);
	const onPointerDown = (e) => {
		if (pid.current !== null) return;
		pid.current = e.pointerId;
		e.currentTarget.setPointerCapture(e.pointerId);
		apply(e.clientX, e.clientY);
	};
	const onPointerMove = (e) => {
		if (pid.current !== e.pointerId) return;
		apply(e.clientX, e.clientY);
	};
	const end = (e) => {
		if (pid.current !== e.pointerId) return;
		pid.current = null;
		if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
		clearStick();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: rootRef,
		className: cn("relative size-[120px] touch-none select-none rounded-full border border-border bg-surface/70", className),
		onPointerDown,
		onPointerMove,
		onPointerUp: end,
		onPointerCancel: end,
		role: "application",
		"aria-label": "Move stick",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: knobRef,
			className: "pointer-events-none absolute top-1/2 left-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)] will-change-transform"
		})
	});
}
function GameOverlay() {
	const [hud, setHud] = (0, import_react.useState)(getHud);
	(0, import_react.useEffect)(() => subscribeHud(setHud), []);
	const start = () => {
		setGameStarted(true);
	};
	const showStart = !hud.playing && !isGameStarted();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10 flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm tracking-tight text-fg",
						children: "Vampire Snake"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Phase 2 · Weapons"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap justify-end gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "HP",
							value: `${hud.hp}/${hud.maxHp}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Dummy",
							value: `${hud.dummyHp ?? 0}/${hud.dummyMax ?? 100}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Hits",
							value: String(hud.hits ?? 0)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Body",
							value: String(hud.segments)
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VirtualStick, { className: "pointer-events-auto md:hidden" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs text-muted md:block",
						children: "WASD · auto-fire from body segments"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[120px] w-[120px] md:hidden",
						"aria-hidden": true
					})
				]
			}),
			showStart ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/72 px-6 backdrop-blur-[2px]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-md rounded-3xl border border-border bg-elevated p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-[0.18em] text-muted uppercase",
							children: "Arena prototype"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display mt-2 text-4xl leading-tight tracking-tight text-fg",
							children: "Vampire Snake"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm leading-relaxed text-muted",
							children: "Weapons sit on the body. The first segment fires forward, the second tracks the dummy, the third spins a blade. Walk the dummy down to confirm damage."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-5 space-y-1.5 text-sm text-fg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted",
										children: "01"
									}), "WASD or left stick to move"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted",
										children: "02"
									}), "Auto-fire from segments 1–3"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted",
										children: "03"
									}), "Dummy to the right of spawn"]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: start,
							className: cn("mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl", "bg-fg text-sm font-medium text-bg transition-transform duration-(--motion-quick)", "hover:opacity-95 active:scale-[0.98]"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
								className: "size-4",
								strokeWidth: 2
							}), "Start"]
						})
					]
				})
			}) : null
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-[4.5rem] rounded-xl border border-border bg-surface/80 px-3 py-2 text-right backdrop-blur-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[10px] tracking-[0.14em] text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-sm tabular-nums text-fg",
			children: value
		})]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameCanvas, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameOverlay, {})]
	});
}
//#endregion
export { setInjectedKeys as a, WORLD_SIZE as c, sampleMove as i, installKeyboard as n, patchHud as o, isGameStarted as r, COLOR as s, routes_exports as t };
