import { a as setInjectedKeys, c as WORLD_SIZE, i as sampleMove, n as installKeyboard, o as patchHud, r as isGameStarted, s as COLOR } from "./routes-DxaN0mvf.mjs";
import { a as __webpack_exports__Scene, i as __webpack_exports__Scale, n as __webpack_exports__Game, r as __webpack_exports__Math, t as __webpack_exports__AUTO } from "../_libs/phaser.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createGame-R2wOgV5y.js
var Dummy = class {
	root;
	hp = 100;
	maxHp = 100;
	hits = 0;
	radius = 28;
	body;
	bar;
	deadUntil = 0;
	flashUntil = 0;
	constructor(scene, x, y) {
		this.root = scene.add.container(x, y);
		this.root.setDepth(12);
		const ring = scene.add.circle(0, 0, 36, COLOR.dummy, .18);
		this.body = scene.add.circle(0, 0, 28, COLOR.dummy);
		this.body.setStrokeStyle(2, 16777215, .22);
		const core = scene.add.rectangle(0, -4, 14, 22, 10134445);
		const base = scene.add.rectangle(0, 16, 26, 8, 5068128);
		this.bar = scene.add.rectangle(0, -42, 40, 5, COLOR.hp);
		const label = scene.add.text(0, 42, "DUMMY", {
			fontFamily: "IBM Plex Mono, monospace",
			fontSize: "11px",
			color: "#ece8e4"
		});
		label.setOrigin(.5, 0);
		this.root.add([
			ring,
			this.body,
			core,
			base,
			this.bar,
			label
		]);
	}
	get x() {
		return this.root.x;
	}
	get y() {
		return this.root.y;
	}
	get alive() {
		return this.hp > 0;
	}
	hit(dmg, now) {
		if (this.hp <= 0) return false;
		this.hp = Math.max(0, this.hp - dmg);
		this.hits += 1;
		this.flashUntil = now + 80;
		this.body.setFillStyle(COLOR.dummyHurt);
		this.syncBar();
		if (this.hp <= 0) {
			this.deadUntil = now + 1400;
			this.root.setAlpha(.28);
		}
		return true;
	}
	update(now) {
		if (this.hp <= 0 && now >= this.deadUntil) {
			this.hp = this.maxHp;
			this.root.setAlpha(1);
			this.syncBar();
		}
		if (now >= this.flashUntil && this.hp > 0) this.body.setFillStyle(COLOR.dummy);
	}
	overlaps(x, y, r) {
		if (this.hp <= 0) return false;
		const dx = x - this.x;
		const dy = y - this.y;
		const need = r + this.radius;
		return dx * dx + dy * dy <= need * need;
	}
	destroy() {
		this.root.destroy(true);
	}
	syncBar() {
		const t = this.hp / this.maxHp;
		this.bar.width = 40 * t;
		this.bar.setFillStyle(t > .35 ? COLOR.hp : 13206634);
	}
};
/**
* 0 = screen-up, positive = left (CCW). Matches controls skill A = +yaw.
* Phaser velocity is y-down, so convert with atan2(-vx, -vy).
*/
function installControlsTest(player) {
	window.__controlsTest = {
		getYaw: () => Math.atan2(-player.vx, -player.vy),
		getSpeed: () => Math.hypot(player.vx, player.vy),
		setKeys: (codes) => setInjectedKeys(codes)
	};
	window.__gameReady = true;
}
var Projectiles = class {
	slots = [];
	cursor = 0;
	constructor(scene) {
		for (let i = 0; i < 72; i++) {
			const gfx = scene.add.circle(0, 0, 4, COLOR.blaster);
			gfx.setVisible(false);
			gfx.setActive(false);
			gfx.setDepth(16);
			this.slots.push({
				gfx,
				vx: 0,
				vy: 0,
				damage: 0,
				ttl: 0,
				radius: 4,
				live: false
			});
		}
	}
	spawn(ev) {
		const slot = this.slots[this.cursor];
		this.cursor = (this.cursor + 1) % this.slots.length;
		slot.live = true;
		slot.vx = ev.vx;
		slot.vy = ev.vy;
		slot.damage = ev.damage;
		slot.ttl = 1.35;
		slot.radius = ev.radius;
		slot.gfx.setFillStyle(ev.color, 1);
		slot.gfx.setScale(ev.radius / 4);
		slot.gfx.setPosition(ev.x, ev.y);
		slot.gfx.setVisible(true);
		slot.gfx.setActive(true);
	}
	update(dt, onHit) {
		for (const s of this.slots) {
			if (!s.live) continue;
			s.ttl -= dt;
			s.gfx.x += s.vx * dt;
			s.gfx.y += s.vy * dt;
			if (s.ttl <= 0 || s.gfx.x < 0 || s.gfx.y < 0 || s.gfx.x > 4800 || s.gfx.y > 4800) {
				this.kill(s);
				continue;
			}
			if (onHit(s.gfx.x, s.gfx.y, s.damage, s.radius)) this.kill(s);
		}
	}
	clear() {
		for (const s of this.slots) this.kill(s);
	}
	destroy() {
		for (const s of this.slots) s.gfx.destroy();
		this.slots.length = 0;
	}
	kill(s) {
		s.live = false;
		s.gfx.setVisible(false);
		s.gfx.setActive(false);
	}
};
function defaultLoadout() {
	return [
		{
			type: "blaster",
			segmentIndex: 0,
			fireRate: 280,
			lastFired: 0,
			damage: 6
		},
		{
			type: "turret",
			segmentIndex: 1,
			fireRate: 420,
			lastFired: 0,
			damage: 8
		},
		{
			type: "blade",
			segmentIndex: 2,
			fireRate: 160,
			lastFired: 0,
			damage: 5
		}
	];
}
var BLADE_ORBIT = 34;
var BLADE_RADIUS = 11;
var BLASTER_SPEED = 520;
var TURRET_SPEED = 460;
var SnakePlayer = class {
	head;
	segments = [];
	positionHistory = [];
	weapons;
	speed = 240;
	facing = 0;
	vx = 0;
	vy = 0;
	scene;
	historyStride;
	headGlow;
	snout;
	blades = [];
	bladeAngle = 0;
	fire;
	constructor(scene, x, y, fire, segmentCount = 6) {
		this.scene = scene;
		this.historyStride = 7;
		this.fire = fire;
		this.weapons = defaultLoadout();
		this.head = scene.add.container(x, y);
		this.head.setDepth(20);
		this.headGlow = scene.add.circle(0, 0, 23, COLOR.head, .12);
		const headBody = scene.add.circle(0, 0, 16, COLOR.head);
		headBody.setStrokeStyle(2, 16777215, .18);
		this.snout = scene.add.triangle(8.8, 0, 0, -7, 14, 0, 0, 7, COLOR.snout);
		const eyeY = scene.add.circle(4, -5, 2.4, COLOR.eye);
		const eyeX = scene.add.circle(4, 5, 2.4, COLOR.eye);
		this.head.add([
			this.headGlow,
			headBody,
			this.snout,
			eyeY,
			eyeX
		]);
		const maxHistory = (segmentCount + 4) * this.historyStride + 48;
		for (let i = maxHistory - 1; i >= 0; i--) this.positionHistory.push({
			x: x - i * 3.2,
			y
		});
		for (let i = 0; i < segmentCount; i++) this.spawnSegment();
		this.layoutSegments();
		this.attachMounts();
	}
	get x() {
		return this.head.x;
	}
	get y() {
		return this.head.y;
	}
	getRadius() {
		return 16;
	}
	getParts() {
		const parts = [{
			x: this.head.x,
			y: this.head.y,
			r: 16
		}];
		for (const seg of this.segments) parts.push({
			x: seg.x,
			y: seg.y,
			r: 13
		});
		return parts;
	}
	addSegment() {
		this.spawnSegment();
		this.ensureHistoryCapacity();
		this.layoutSegments();
	}
	update(dt, ax, ay, now, aim, combatOn) {
		if (ax !== 0 || ay !== 0) {
			this.facing = Math.atan2(ay, ax);
			this.vx = ax * this.speed;
			this.vy = ay * this.speed;
			const nextX = __webpack_exports__Math.Clamp(this.head.x + this.vx * dt, 24, WORLD_SIZE - 16 - 8);
			const nextY = __webpack_exports__Math.Clamp(this.head.y + this.vy * dt, 24, WORLD_SIZE - 16 - 8);
			this.head.setPosition(nextX, nextY);
			this.positionHistory.push({
				x: nextX,
				y: nextY
			});
			this.trimHistory();
		} else {
			this.vx = 0;
			this.vy = 0;
		}
		this.head.setRotation(this.facing);
		const pulse = 1 + Math.sin(this.scene.time.now / 280) * .04;
		this.headGlow.setScale(pulse);
		this.layoutSegments();
		this.updateBlades(dt);
		if (combatOn) this.tickWeapons(now, aim);
	}
	bladeHits(dummyX, dummyY, dummyR, now) {
		const weapon = this.weapons.find((w) => w.type === "blade");
		if (!weapon || now - weapon.lastFired < weapon.fireRate) return 0;
		for (const blade of this.blades) {
			const dx = blade.x - dummyX;
			const dy = blade.y - dummyY;
			const need = BLADE_RADIUS + dummyR;
			if (dx * dx + dy * dy <= need * need) {
				weapon.lastFired = now;
				return weapon.damage;
			}
		}
		return 0;
	}
	destroy() {
		this.head.destroy(true);
		for (const seg of this.segments) seg.destroy(true);
		for (const b of this.blades) b.destroy();
		this.segments.length = 0;
		this.positionHistory.length = 0;
		this.blades.length = 0;
	}
	spawnSegment() {
		const i = this.segments.length;
		const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
		const container = this.scene.add.container(this.head.x, this.head.y);
		container.setDepth(18 - Math.min(i, 10));
		const halo = this.scene.add.circle(0, 0, 18, color, .16);
		const body = this.scene.add.circle(0, 0, 13, color);
		body.setStrokeStyle(1.5, COLOR.segmentCore, .55);
		const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, .85);
		container.add([
			halo,
			body,
			core
		]);
		this.segments.push(container);
	}
	attachMounts() {
		const blasterSeg = this.segments[0];
		if (blasterSeg) {
			const barrel = this.scene.add.rectangle(10, 0, 14, 5, COLOR.blaster);
			blasterSeg.add(barrel);
		}
		const turretSeg = this.segments[1];
		if (turretSeg) {
			const cup = this.scene.add.circle(0, 0, 6, COLOR.turret);
			turretSeg.add(cup);
		}
		if (this.segments[2]) {
			const a = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
			const b = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
			a.setDepth(19);
			b.setDepth(19);
			this.blades.push(a, b);
		}
	}
	updateBlades(dt) {
		const host = this.segments[2];
		if (!host || this.blades.length < 2) return;
		this.bladeAngle += dt * 4.2;
		this.blades.forEach((blade, i) => {
			const ang = this.bladeAngle + i * Math.PI;
			blade.setPosition(host.x + Math.cos(ang) * BLADE_ORBIT, host.y + Math.sin(ang) * BLADE_ORBIT);
			blade.setRotation(ang + Math.PI / 2);
		});
	}
	tickWeapons(now, aim) {
		for (const w of this.weapons) {
			if (w.type === "blade") continue;
			const seg = this.segments[w.segmentIndex];
			if (!seg) continue;
			if (now - w.lastFired < w.fireRate) continue;
			if (w.type === "blaster") {
				const ang = seg.rotation;
				this.fire({
					x: seg.x + Math.cos(ang) * 16,
					y: seg.y + Math.sin(ang) * 16,
					vx: Math.cos(ang) * BLASTER_SPEED,
					vy: Math.sin(ang) * BLASTER_SPEED,
					damage: w.damage,
					color: COLOR.blaster,
					radius: 4
				});
				w.lastFired = now;
			} else if (w.type === "turret" && aim) {
				const dx = aim.x - seg.x;
				const dy = aim.y - seg.y;
				const mag = Math.hypot(dx, dy) || 1;
				this.fire({
					x: seg.x + dx / mag * 14,
					y: seg.y + dy / mag * 14,
					vx: dx / mag * TURRET_SPEED,
					vy: dy / mag * TURRET_SPEED,
					damage: w.damage,
					color: COLOR.turret,
					radius: 5
				});
				w.lastFired = now;
			}
		}
	}
	layoutSegments() {
		const hist = this.positionHistory;
		if (hist.length === 0) return;
		const last = hist.length - 1;
		for (let i = 0; i < this.segments.length; i++) {
			const framesBehind = (i + 1) * this.historyStride;
			const pos = hist[Math.max(0, last - framesBehind)];
			const seg = this.segments[i];
			seg.setPosition(pos.x, pos.y);
			const ahead = hist[Math.max(0, last - i * this.historyStride)];
			const ang = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
			if (Number.isFinite(ang)) seg.setRotation(ang);
		}
	}
	ensureHistoryCapacity() {
		const needed = (this.segments.length + 4) * this.historyStride + 48;
		const oldest = this.positionHistory[0] ?? {
			x: this.head.x,
			y: this.head.y
		};
		while (this.positionHistory.length < needed) this.positionHistory.unshift({ ...oldest });
	}
	trimHistory() {
		const max = (this.segments.length + 4) * this.historyStride + 48;
		const extra = this.positionHistory.length - max;
		if (extra > 0) this.positionHistory.splice(0, extra);
	}
};
var MainScene = class extends __webpack_exports__Scene {
	player;
	dummy;
	shots;
	hudAcc = 0;
	unbindKeys = null;
	floor;
	constructor() {
		super("main");
	}
	init() {
		this.hudAcc = 0;
	}
	create() {
		this.buildArena();
		const cx = WORLD_SIZE / 2;
		const cy = WORLD_SIZE / 2;
		this.shots = new Projectiles(this);
		this.player = new SnakePlayer(this, cx, cy, (ev) => this.shots.spawn(ev));
		this.dummy = new Dummy(this, cx + 260, cy - 30);
		this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
		this.cameras.main.startFollow(this.player.head, true, .14, .14);
		this.cameras.main.setDeadzone(70, 70);
		this.cameras.main.setBackgroundColor(COLOR.arena);
		this.fitZoom();
		this.unbindKeys = installKeyboard(window);
		installControlsTest(this.player);
		this.scale.on("resize", this.onResize, this);
		this.events.once("shutdown", this.cleanup, this);
		patchHud({
			segments: this.player.segments.length,
			speed: 0,
			hp: 100,
			dummyHp: this.dummy.hp,
			dummyMax: this.dummy.maxHp,
			hits: 0
		});
	}
	update(time, delta) {
		const dt = Math.min(delta, 50) / 1e3;
		const move = sampleMove();
		const combatOn = isGameStarted();
		const aim = this.dummy.alive ? {
			x: this.dummy.x,
			y: this.dummy.y
		} : null;
		this.player.update(dt, move.x, move.y, time, aim, combatOn);
		this.dummy.update(time);
		if (combatOn) {
			this.shots.update(dt, (x, y, dmg, r) => {
				if (!this.dummy.overlaps(x, y, r)) return false;
				this.dummy.hit(dmg, time);
				this.floatDmg(x, y, dmg);
				return true;
			});
			const bladeDmg = this.player.bladeHits(this.dummy.x, this.dummy.y, this.dummy.radius, time);
			if (bladeDmg > 0 && this.dummy.hit(bladeDmg, time)) this.floatDmg(this.dummy.x, this.dummy.y, bladeDmg);
		}
		this.hudAcc += delta;
		if (this.hudAcc >= 80) {
			this.hudAcc = 0;
			if (combatOn) patchHud({
				speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
				segments: this.player.segments.length,
				dummyHp: this.dummy.hp,
				dummyMax: this.dummy.maxHp,
				hits: this.dummy.hits
			});
		}
	}
	floatDmg(x, y, dmg) {
		const t = this.add.text(x, y, `-${dmg}`, {
			fontFamily: "IBM Plex Mono, monospace",
			fontSize: "13px",
			color: "#ece8e4"
		});
		t.setOrigin(.5);
		t.setDepth(30);
		this.tweens.add({
			targets: t,
			y: y - 28,
			alpha: 0,
			duration: 420,
			onComplete: () => t.destroy()
		});
	}
	buildArena() {
		const g = this.add.graphics();
		g.setVisible(false);
		g.fillStyle(COLOR.arena, 1);
		g.fillRect(0, 0, 96, 96);
		g.lineStyle(1, COLOR.gridLine, .55);
		g.strokeRect(.5, .5, 95, 95);
		g.fillStyle(COLOR.grid, .35);
		g.fillCircle(48, 48, 1.6);
		g.generateTexture("arena-tile", 96, 96);
		g.destroy();
		this.floor = this.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, "arena-tile");
		this.floor.setDepth(0);
		const border = this.add.graphics();
		border.lineStyle(10, COLOR.bound, .9);
		border.strokeRect(6, 6, WORLD_SIZE - 12, WORLD_SIZE - 12);
		border.lineStyle(2, 12082263, .35);
		border.strokeRect(18, 18, WORLD_SIZE - 36, WORLD_SIZE - 36);
		border.setDepth(1);
		for (let i = 0; i < 28; i++) {
			const rx = __webpack_exports__Math.Between(120, WORLD_SIZE - 120);
			const ry = __webpack_exports__Math.Between(120, WORLD_SIZE - 120);
			this.add.circle(rx, ry, __webpack_exports__Math.Between(2, 5), 16777215, .04).setDepth(2);
		}
	}
	fitZoom() {
		const cam = this.cameras.main;
		const short = Math.min(cam.width, cam.height);
		cam.setZoom(short < 520 ? .78 : short < 900 ? .92 : 1);
	}
	onResize(gameSize) {
		this.cameras.main.setSize(gameSize.width, gameSize.height);
		this.fitZoom();
	}
	cleanup() {
		this.scale.off("resize", this.onResize, this);
		this.unbindKeys?.();
		this.unbindKeys = null;
		this.shots?.destroy();
		this.dummy?.destroy();
		this.player?.destroy();
		window.__gameReady = false;
		window.__controlsTest = void 0;
	}
};
function createGame(parent) {
	const width = Math.max(parent.clientWidth, 320);
	const height = Math.max(parent.clientHeight, 240);
	return new __webpack_exports__Game({
		type: __webpack_exports__AUTO,
		parent,
		width,
		height,
		backgroundColor: COLOR.arena,
		scale: {
			mode: __webpack_exports__Scale.RESIZE,
			autoCenter: __webpack_exports__Scale.CENTER_BOTH,
			width,
			height
		},
		render: {
			antialias: true,
			roundPixels: false,
			powerPreference: "high-performance"
		},
		physics: {
			default: "arcade",
			arcade: {
				gravity: {
					x: 0,
					y: 0
				},
				debug: false
			}
		},
		scene: [MainScene],
		disableContextMenu: true,
		audio: { noAudio: true }
	});
}
//#endregion
export { createGame };
