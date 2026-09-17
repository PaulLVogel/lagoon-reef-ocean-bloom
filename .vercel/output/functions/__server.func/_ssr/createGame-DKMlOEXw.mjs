import { a as setInjectedKeys, c as WORLD_SIZE, i as sampleMove, n as installKeyboard, o as patchHud, r as isGameStarted, s as COLOR } from "./routes-Dn3j3E5W.mjs";
import { a as __webpack_exports__Scene, i as __webpack_exports__Scale, n as __webpack_exports__Game, r as __webpack_exports__Math, t as __webpack_exports__AUTO } from "../_libs/phaser.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createGame-DKMlOEXw.js
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
var SnakePlayer = class {
	head;
	segments = [];
	positionHistory = [];
	speed = 240;
	facing = 0;
	vx = 0;
	vy = 0;
	scene;
	historyStride;
	headGlow;
	snout;
	constructor(scene, x, y, segmentCount = 6) {
		this.scene = scene;
		this.historyStride = 7;
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
	update(dt, ax, ay) {
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
	}
	destroy() {
		this.head.destroy(true);
		for (const seg of this.segments) seg.destroy(true);
		this.segments.length = 0;
		this.positionHistory.length = 0;
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
		this.player = new SnakePlayer(this, cx, cy);
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
			hp: 100
		});
	}
	update(_time, delta) {
		const dt = Math.min(delta, 50) / 1e3;
		const move = sampleMove();
		this.player.update(dt, move.x, move.y);
		this.hudAcc += delta;
		if (this.hudAcc >= 80) {
			this.hudAcc = 0;
			if (isGameStarted()) patchHud({
				speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
				segments: this.player.segments.length
			});
		}
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
