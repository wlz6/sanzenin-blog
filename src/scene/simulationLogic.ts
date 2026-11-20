export type TimeOfDay = "dusk" | "blue_hour" | "moonlit" | "midnight";
export type SceneQuality = "high" | "balanced" | "static";
export type InteractionMode = "launch" | "workspace" | "reading";

export interface RgbTuple {
	r: number;
	g: number;
	b: number;
}

export interface TimeThemeParams {
	id: TimeOfDay;
	label: string;
	labelEn: string;
	duskBlend: number;
	skyTint: RgbTuple;
	horizonGlow: RgbTuple;
	horizonGlowStrength: number;
	fogColor: RgbTuple;
	fogDensity: number;
	mistOpacity: number;
	moonGlow: number;
	starVisibility: number;
	waterBase: RgbTuple;
	waterReflectionStrength: number;
	waterMoonShimmer: number;
	ambientCool: RgbTuple;
	ambientIntensity: number;
	keyLightColor: RgbTuple;
	keyLightIntensity: number;
	lanternIntensity: number;
	fireflyDensity: number;
	fireflyBrightness: number;
	girlTint: RgbTuple;
	exposure: number;
	godRayIntensity: number;
	bloomStrength: number;
	bloomThreshold: number;
	vignetteStrength: number;
	gradeShadowTint: RgbTuple;
	gradeHighlightTint: RgbTuple;
	contrast: number;
	saturation: number;
}

export const TIME_THEMES: Record<TimeOfDay, TimeThemeParams> = {
	dusk: {
		id: "dusk",
		label: "黄昏",
		labelEn: "Dusk",
		duskBlend: 1.0,
		skyTint: { r: 1.18, g: 0.84, b: 0.66 },
		horizonGlow: { r: 1.0, g: 0.56, b: 0.28 },
		horizonGlowStrength: 0.92,
		fogColor: { r: 0.34, g: 0.24, b: 0.28 },
		fogDensity: 0.014,
		mistOpacity: 0.34,
		moonGlow: 0.22,
		starVisibility: 0.14,
		waterBase: { r: 0.22, g: 0.15, b: 0.2 },
		waterReflectionStrength: 0.92,
		waterMoonShimmer: 0.24,
		ambientCool: { r: 0.72, g: 0.56, b: 0.64 },
		ambientIntensity: 0.88,
		keyLightColor: { r: 1.0, g: 0.68, b: 0.42 },
		keyLightIntensity: 1.42,
		lanternIntensity: 1.55,
		fireflyDensity: 0.25,
		fireflyBrightness: 0.86,
		girlTint: { r: 1.06, g: 0.9, b: 0.82 },
		exposure: 1.06,
		godRayIntensity: 0.58,
		bloomStrength: 0.3,
		bloomThreshold: 0.84,
		vignetteStrength: 0.24,
		gradeShadowTint: { r: 0.96, g: 0.89, b: 1.02 },
		gradeHighlightTint: { r: 1.08, g: 0.96, b: 0.86 },
		contrast: 1.04,
		saturation: 1.08,
	},
	blue_hour: {
		id: "blue_hour",
		label: "蓝调",
		labelEn: "Blue Hour",
		duskBlend: 0.0,
		skyTint: { r: 0.94, g: 0.99, b: 1.06 },
		horizonGlow: { r: 0.36, g: 0.54, b: 0.68 },
		horizonGlowStrength: 0.26,
		fogColor: { r: 0.08, g: 0.16, b: 0.26 },
		fogDensity: 0.017,
		mistOpacity: 0.4,
		moonGlow: 0.88,
		starVisibility: 0.6,
		waterBase: { r: 0.055, g: 0.135, b: 0.215 },
		waterReflectionStrength: 0.9,
		waterMoonShimmer: 0.72,
		ambientCool: { r: 0.44, g: 0.64, b: 0.82 },
		ambientIntensity: 0.74,
		keyLightColor: { r: 0.76, g: 0.86, b: 0.96 },
		keyLightIntensity: 0.98,
		lanternIntensity: 2.25,
		fireflyDensity: 0.64,
		fireflyBrightness: 0.98,
		girlTint: { r: 0.93, g: 0.98, b: 1.04 },
		exposure: 1.02,
		godRayIntensity: 0.44,
		bloomStrength: 0.28,
		bloomThreshold: 0.85,
		vignetteStrength: 0.28,
		gradeShadowTint: { r: 0.92, g: 0.97, b: 1.06 },
		gradeHighlightTint: { r: 1.02, g: 1.01, b: 0.98 },
		contrast: 1.05,
		saturation: 1.04,
	},
	moonlit: {
		id: "moonlit",
		label: "月夜",
		labelEn: "Moonlit",
		duskBlend: 0.0,
		skyTint: { r: 0.86, g: 0.98, b: 1.12 },
		horizonGlow: { r: 0.46, g: 0.68, b: 0.82 },
		horizonGlowStrength: 0.2,
		fogColor: { r: 0.06, g: 0.15, b: 0.24 },
		fogDensity: 0.019,
		mistOpacity: 0.48,
		moonGlow: 1.35,
		starVisibility: 0.86,
		waterBase: { r: 0.045, g: 0.125, b: 0.205 },
		waterReflectionStrength: 0.94,
		waterMoonShimmer: 1.12,
		ambientCool: { r: 0.54, g: 0.74, b: 0.92 },
		ambientIntensity: 0.82,
		keyLightColor: { r: 0.78, g: 0.9, b: 1.0 },
		keyLightIntensity: 1.2,
		lanternIntensity: 2.55,
		fireflyDensity: 1.0,
		fireflyBrightness: 1.16,
		girlTint: { r: 0.95, g: 1.01, b: 1.08 },
		exposure: 1.07,
		godRayIntensity: 0.66,
		bloomStrength: 0.34,
		bloomThreshold: 0.82,
		vignetteStrength: 0.26,
		gradeShadowTint: { r: 0.9, g: 0.98, b: 1.08 },
		gradeHighlightTint: { r: 1.0, g: 1.03, b: 1.05 },
		contrast: 1.06,
		saturation: 1.05,
	},
	midnight: {
		id: "midnight",
		label: "深夜",
		labelEn: "Midnight",
		duskBlend: 0.0,
		skyTint: { r: 0.64, g: 0.74, b: 0.92 },
		horizonGlow: { r: 0.16, g: 0.3, b: 0.42 },
		horizonGlowStrength: 0.12,
		fogColor: { r: 0.04, g: 0.09, b: 0.16 },
		fogDensity: 0.025,
		mistOpacity: 0.66,
		moonGlow: 0.96,
		starVisibility: 1.28,
		waterBase: { r: 0.028, g: 0.075, b: 0.145 },
		waterReflectionStrength: 0.9,
		waterMoonShimmer: 0.84,
		ambientCool: { r: 0.34, g: 0.48, b: 0.68 },
		ambientIntensity: 0.56,
		keyLightColor: { r: 0.62, g: 0.76, b: 0.94 },
		keyLightIntensity: 0.75,
		lanternIntensity: 3.05,
		fireflyDensity: 0.9,
		fireflyBrightness: 1.32,
		girlTint: { r: 0.82, g: 0.89, b: 0.99 },
		exposure: 0.98,
		godRayIntensity: 0.5,
		bloomStrength: 0.36,
		bloomThreshold: 0.8,
		vignetteStrength: 0.34,
		gradeShadowTint: { r: 0.88, g: 0.93, b: 1.08 },
		gradeHighlightTint: { r: 1.04, g: 0.99, b: 0.94 },
		contrast: 1.08,
		saturation: 1.02,
	},
};

export const TIME_ORDER: TimeOfDay[] = ["dusk", "blue_hour", "moonlit", "midnight"];

export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

export function lerpRgb(a: RgbTuple, b: RgbTuple, t: number): RgbTuple {
	return {
		r: lerp(a.r, b.r, t),
		g: lerp(a.g, b.g, t),
		b: lerp(a.b, b.b, t),
	};
}

export function cloneTimeParams(src: TimeThemeParams): TimeThemeParams {
	return {
		...src,
		skyTint: { ...src.skyTint },
		horizonGlow: { ...src.horizonGlow },
		fogColor: { ...src.fogColor },
		waterBase: { ...src.waterBase },
		ambientCool: { ...src.ambientCool },
		keyLightColor: { ...src.keyLightColor },
		girlTint: { ...src.girlTint },
		gradeShadowTint: { ...src.gradeShadowTint },
		gradeHighlightTint: { ...src.gradeHighlightTint },
	};
}

export function dampTimeParams(
	current: TimeThemeParams,
	target: TimeThemeParams,
	lambda: number,
	dt: number,
): TimeThemeParams {
	const alpha = 1 - Math.exp(-lambda * Math.max(0, dt));
	return {
		id: target.id,
		label: target.label,
		labelEn: target.labelEn,
		duskBlend: lerp(current.duskBlend, target.duskBlend, alpha),
		skyTint: lerpRgb(current.skyTint, target.skyTint, alpha),
		horizonGlow: lerpRgb(current.horizonGlow, target.horizonGlow, alpha),
		horizonGlowStrength: lerp(current.horizonGlowStrength, target.horizonGlowStrength, alpha),
		fogColor: lerpRgb(current.fogColor, target.fogColor, alpha),
		fogDensity: lerp(current.fogDensity, target.fogDensity, alpha),
		mistOpacity: lerp(current.mistOpacity, target.mistOpacity, alpha),
		moonGlow: lerp(current.moonGlow, target.moonGlow, alpha),
		starVisibility: lerp(current.starVisibility, target.starVisibility, alpha),
		waterBase: lerpRgb(current.waterBase, target.waterBase, alpha),
		waterReflectionStrength: lerp(
			current.waterReflectionStrength,
			target.waterReflectionStrength,
			alpha,
		),
		waterMoonShimmer: lerp(current.waterMoonShimmer, target.waterMoonShimmer, alpha),
		ambientCool: lerpRgb(current.ambientCool, target.ambientCool, alpha),
		ambientIntensity: lerp(current.ambientIntensity, target.ambientIntensity, alpha),
		keyLightColor: lerpRgb(current.keyLightColor, target.keyLightColor, alpha),
		keyLightIntensity: lerp(current.keyLightIntensity, target.keyLightIntensity, alpha),
		lanternIntensity: lerp(current.lanternIntensity, target.lanternIntensity, alpha),
		fireflyDensity: lerp(current.fireflyDensity, target.fireflyDensity, alpha),
		fireflyBrightness: lerp(current.fireflyBrightness, target.fireflyBrightness, alpha),
		girlTint: lerpRgb(current.girlTint, target.girlTint, alpha),
		exposure: lerp(current.exposure, target.exposure, alpha),
		godRayIntensity: lerp(current.godRayIntensity, target.godRayIntensity, alpha),
		bloomStrength: lerp(current.bloomStrength, target.bloomStrength, alpha),
		bloomThreshold: lerp(current.bloomThreshold, target.bloomThreshold, alpha),
		vignetteStrength: lerp(current.vignetteStrength, target.vignetteStrength, alpha),
		gradeShadowTint: lerpRgb(current.gradeShadowTint, target.gradeShadowTint, alpha),
		gradeHighlightTint: lerpRgb(current.gradeHighlightTint, target.gradeHighlightTint, alpha),
		contrast: lerp(current.contrast, target.contrast, alpha),
		saturation: lerp(current.saturation, target.saturation, alpha),
	};
}

// ============================================================================
// 画质档位与 Launch 推镜安全数学计算
// ============================================================================

export interface QualityPreset {
	pixelRatio: number;
	reflectionScale: number;
	msaaSamples: number;
	fireflyMaxCount: number;
	fireflyActiveScale: number;
	motesCount: number;
	enableShadows: boolean;
	targetFpsCap: number;
}

export function resolveQualityPreset(
	quality: SceneQuality,
	isSoftwareGl: boolean,
	isMobile: boolean,
	hardwareThreads: number,
	devicePixelRatio: number,
): QualityPreset {
	const rawDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
	if (quality === "static" || isSoftwareGl) {
		return {
			pixelRatio: 1,
			reflectionScale: 0.5,
			msaaSamples: 0,
			fireflyMaxCount: 120,
			fireflyActiveScale: 0.72,
			motesCount: 64,
			enableShadows: false,
			targetFpsCap: 30,
		};
	}

	const lowCore = hardwareThreads > 0 && hardwareThreads <= 4;
	if (quality === "balanced" || isMobile || lowCore) {
		return {
			pixelRatio: clamp(rawDpr, 1.0, isMobile ? 1.35 : 1.5),
			reflectionScale: isMobile ? 0.5 : 0.62,
			msaaSamples: isMobile ? 0 : 2,
			fireflyMaxCount: 150,
			fireflyActiveScale: isMobile ? 0.68 : 0.82,
			motesCount: isMobile ? 64 : 84,
			enableShadows: !isMobile,
			targetFpsCap: isMobile ? 45 : 60,
		};
	}

	return {
		pixelRatio: clamp(rawDpr, 1.25, 2.0),
		reflectionScale: 0.78,
		msaaSamples: 4,
		fireflyMaxCount: 175,
		fireflyActiveScale: 1.0,
		motesCount: 110,
		enableShadows: true,
		targetFpsCap: 60,
	};
}

export interface Vec3Tuple {
	x: number;
	y: number;
	z: number;
}

export interface LaunchCameraTarget {
	posX: number;
	posY: number;
	posZ: number;
	lookX: number;
	lookY: number;
	lookZ: number;
	fov: number;
}

// 前景芦苇最近处 z ≈ 7.6，安全相机近距下限固定在 8.65 防止穿模
export const CAMERA_SAFE_MIN_Z = 8.65;
export const CAMERA_SAFE_MAX_Z = 13.4;

export function computeLaunchCameraTargets(
	baseCamPos: Vec3Tuple,
	baseLookAt: Vec3Tuple,
	baseFov: number,
	transitionProgress: number,
	focusZoom: number,
	wheelZoom: number,
): LaunchCameraTarget {
	const p = clamp(transitionProgress, 0, 1);
	const eased = p * p * (3 - 2 * p);
	const pushZ = -1.28 * eased;
	const combinedZ = clamp(
		baseCamPos.z + pushZ + focusZoom + wheelZoom,
		CAMERA_SAFE_MIN_Z,
		CAMERA_SAFE_MAX_Z,
	);

	return {
		posX: baseCamPos.x + 0.16 * eased,
		posY: baseCamPos.y - 0.08 * eased,
		posZ: combinedZ,
		lookX: baseLookAt.x + 0.36 * eased,
		lookY: baseLookAt.y - 0.18 * eased,
		lookZ: baseLookAt.z,
		fov: clamp(baseFov - 2.2 * eased, 30, 54),
	};
}

// ============================================================================
// 湖面涟漪池（最多 12 个并发扩散涟漪）
// ============================================================================

export const MAX_RIPPLES = 12;
export const RIPPLE_LIFETIME_SEC = 4.6;

export interface WaterRipple {
	x: number;
	z: number;
	startTime: number;
	strength: number;
}

export class RipplePool {
	private ripples: WaterRipple[] = [];
	private totalSpawned = 0;

	spawn(x: number, z: number, nowSec: number, strength = 1.0): WaterRipple {
		const ripple: WaterRipple = {
			x,
			z,
			startTime: nowSec,
			strength: clamp(strength, 0.15, 1.5),
		};
		this.ripples.push(ripple);
		this.totalSpawned += 1;
		if (this.ripples.length > MAX_RIPPLES) {
			this.ripples.shift();
		}
		return ripple;
	}

	prune(nowSec: number): void {
		this.ripples = this.ripples.filter((r) => nowSec - r.startTime < RIPPLE_LIFETIME_SEC);
	}

	getActive(nowSec: number): WaterRipple[] {
		this.prune(nowSec);
		return this.ripples;
	}

	getTotalSpawned(): number {
		return this.totalSpawned;
	}
}

// ============================================================================
// 少女与掌心萤火虫 5.6 秒编舞状态机
// ============================================================================

export type GirlPhase = "idle" | "lifting" | "holding" | "releasing" | "returning";

export interface GirlAnimSample {
	phase: GirlPhase;
	elapsed: number;
	armLift: number;
	palmGlow: number;
	gazePitch: number;
	attractStrength: number;
	heroFireflyState: "hidden" | "approaching" | "resting" | "ascending";
	heroProgress: number;
	blinkAmount: number;
}

export const GIRL_SEQUENCE_DURATION = 5.6;

export class GirlInteractionController {
	private active = false;
	private elapsed = 0;
	private nextBlinkAt = 3.2;
	private blinkDuration = 0.16;
	private idleClock = 0;

	trigger(): boolean {
		if (this.active && this.elapsed < GIRL_SEQUENCE_DURATION - 0.6) {
			return false;
		}
		this.active = true;
		this.elapsed = 0;
		return true;
	}

	isActive(): boolean {
		return this.active;
	}

	getPhase(): GirlPhase {
		if (!this.active) return "idle";
		if (this.elapsed < 1.35) return "lifting";
		if (this.elapsed < 3.25) return "holding";
		if (this.elapsed < 4.55) return "releasing";
		return "returning";
	}

	update(dt: number, externalGazeUp = 0): GirlAnimSample {
		const safeDt = clamp(dt, 0, 0.1);
		this.idleClock += safeDt;

		let blinkAmount = 0;
		const sinceBlink = this.idleClock - this.nextBlinkAt;
		if (sinceBlink >= 0 && sinceBlink <= this.blinkDuration) {
			const p = sinceBlink / this.blinkDuration;
			blinkAmount = Math.sin(p * Math.PI);
		} else if (sinceBlink > this.blinkDuration) {
			const pseudo = Math.abs(Math.sin(this.idleClock * 12.9898) * 43758.5453) % 1;
			this.nextBlinkAt = this.idleClock + 3.4 + pseudo * 2.8;
		}

		const idleGaze =
			Math.sin(this.idleClock * 0.28) * 0.35 + Math.sin(this.idleClock * 0.13 + 1.1) * 0.25;

		if (!this.active) {
			return {
				phase: "idle",
				elapsed: 0,
				armLift: 0,
				palmGlow: 0,
				gazePitch: clamp(lerp(idleGaze, 0.92, clamp(externalGazeUp, 0, 1)), -0.65, 1.0),
				attractStrength: 0,
				heroFireflyState: "hidden",
				heroProgress: 0,
				blinkAmount,
			};
		}

		this.elapsed += safeDt;
		if (this.elapsed >= GIRL_SEQUENCE_DURATION) {
			this.active = false;
			this.elapsed = 0;
			return {
				phase: "idle",
				elapsed: 0,
				armLift: 0,
				palmGlow: 0,
				gazePitch: clamp(lerp(idleGaze, 0.92, clamp(externalGazeUp, 0, 1)), -0.65, 1.0),
				attractStrength: 0,
				heroFireflyState: "hidden",
				heroProgress: 0,
				blinkAmount,
			};
		}

		const t = this.elapsed;
		const phase = this.getPhase();

		const liftIn = smoothstep(0.0, 1.35, t);
		const liftOut = 1 - smoothstep(3.85, GIRL_SEQUENCE_DURATION, t);
		const armLift = liftIn * liftOut;

		const glowIn = smoothstep(1.05, 1.65, t);
		const glowOut = 1 - smoothstep(3.15, 4.15, t);
		const palmGlow = glowIn * glowOut;

		const attractIn = smoothstep(0.1, 1.2, t);
		const attractOut = 1 - smoothstep(3.25, 3.85, t);
		const attractStrength = attractIn * attractOut;

		const lookAtPalm = smoothstep(0.3, 1.3, t) * (1 - smoothstep(3.2, 3.85, t));
		const lookUpSky = smoothstep(3.25, 4.25, t) * (1 - smoothstep(4.95, GIRL_SEQUENCE_DURATION, t));
		let gazePitch = lerp(idleGaze, -0.32, lookAtPalm);
		gazePitch = lerp(gazePitch, 0.82, Math.max(lookUpSky, clamp(externalGazeUp, 0, 1)));

		let heroFireflyState: GirlAnimSample["heroFireflyState"] = "hidden";
		let heroProgress = 0;
		if (t < 1.35) {
			heroFireflyState = "approaching";
			heroProgress = smoothstep(0.0, 1.35, t);
		} else if (t < 3.25) {
			heroFireflyState = "resting";
			heroProgress = clamp((t - 1.35) / (3.25 - 1.35), 0, 1);
		} else if (t < 5.2) {
			heroFireflyState = "ascending";
			heroProgress = smoothstep(3.25, 5.2, t);
		}

		return {
			phase,
			elapsed: t,
			armLift,
			palmGlow,
			gazePitch,
			attractStrength,
			heroFireflyState,
			heroProgress,
			blinkAmount,
		};
	}
}

// ============================================================================
// 提灯三连击隐藏彩蛋（光带 + 流星雨）
// ============================================================================

export type EasterEggState = "idle" | "active";

export interface EasterEggSample {
	state: EasterEggState;
	clickCount: number;
	elapsed: number;
	lanternBoost: number;
	ribbonFormation: number;
	meteorShower: number;
	gazeUp: number;
}

export const EASTER_EGG_CLICK_WINDOW_SEC = 3.5;
export const EASTER_EGG_DURATION_SEC = 13.5;

export class LanternEasterEggController {
	private state: EasterEggState = "idle";
	private clickCount = 0;
	private lastClickTime = -100;
	private elapsed = 0;

	registerClick(nowSec: number): { triggered: boolean; clickCount: number } {
		if (this.state === "active") {
			return { triggered: false, clickCount: 3 };
		}

		if (nowSec - this.lastClickTime > EASTER_EGG_CLICK_WINDOW_SEC) {
			this.clickCount = 0;
		}

		this.clickCount += 1;
		this.lastClickTime = nowSec;

		if (this.clickCount >= 3) {
			this.state = "active";
			this.elapsed = 0;
			this.clickCount = 0;
			return { triggered: true, clickCount: 3 };
		}

		return { triggered: false, clickCount: this.clickCount };
	}

	isActive(): boolean {
		return this.state === "active";
	}

	getClickCount(nowSec: number): number {
		if (this.state === "active") return 3;
		if (nowSec - this.lastClickTime > EASTER_EGG_CLICK_WINDOW_SEC) return 0;
		return this.clickCount;
	}

	update(dt: number, nowSec: number): EasterEggSample {
		const safeDt = clamp(dt, 0, 0.1);

		if (this.state !== "active") {
			const currentClicks = this.getClickCount(nowSec);
			return {
				state: "idle",
				clickCount: currentClicks,
				elapsed: 0,
				lanternBoost: currentClicks * 0.16,
				ribbonFormation: 0,
				meteorShower: 0,
				gazeUp: 0,
			};
		}

		this.elapsed += safeDt;
		if (this.elapsed >= EASTER_EGG_DURATION_SEC) {
			this.state = "idle";
			this.elapsed = 0;
			return {
				state: "idle",
				clickCount: 0,
				elapsed: 0,
				lanternBoost: 0,
				ribbonFormation: 0,
				meteorShower: 0,
				gazeUp: 0,
			};
		}

		const t = this.elapsed;
		const lanternBoost = smoothstep(0.0, 1.5, t) * (1 - smoothstep(9.5, EASTER_EGG_DURATION_SEC, t));
		const ribbonFormation =
			smoothstep(0.7, 3.2, t) * (1 - smoothstep(9.4, EASTER_EGG_DURATION_SEC, t));
		const meteorShower = smoothstep(2.6, 3.8, t) * (1 - smoothstep(8.2, 10.2, t));
		const gazeUp = smoothstep(2.2, 3.4, t) * (1 - smoothstep(9.4, 11.4, t));

		return {
			state: "active",
			clickCount: 3,
			elapsed: t,
			lanternBoost,
			ribbonFormation,
			meteorShower,
			gazeUp,
		};
	}
}

// ============================================================================
// 萤火虫光标力场（移动驱散、静置环绕）
// ============================================================================

export interface Vec2 {
	x: number;
	y: number;
}

export function computeFireflyCursorForce(
	fx: number,
	fy: number,
	cursorX: number,
	cursorY: number,
	cursorActive: boolean,
	cursorIdleSec: number,
	radius = 2.6,
): Vec2 {
	if (!cursorActive) return { x: 0, y: 0 };

	const dx = fx - cursorX;
	const dy = fy - cursorY;
	const distSq = dx * dx + dy * dy;
	if (distSq < 0.0001 || distSq > radius * radius) {
		return { x: 0, y: 0 };
	}

	const dist = Math.sqrt(distSq);
	const falloff = 1 - dist / radius;
	const nx = dx / dist;
	const ny = dy / dist;

	if (cursorIdleSec < 1.25) {
		const repel = falloff * falloff * 2.4;
		return { x: nx * repel, y: ny * repel };
	}

	const gatherBlend = smoothstep(1.25, 2.8, cursorIdleSec);
	const orbitFactor = dist > 0.55 ? -1.0 : 0.6;
	const pull = falloff * gatherBlend * 0.95 * orbitFactor;
	return { x: nx * pull, y: ny * pull };
}
