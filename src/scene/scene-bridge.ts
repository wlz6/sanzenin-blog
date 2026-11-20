import {
	clamp,
	TIME_THEMES,
	type EasterEggState,
	type GirlPhase,
	type InteractionMode,
	type SceneQuality,
	type TimeOfDay,
} from "./simulationLogic.ts";

export type SceneHoverTarget = "none" | "girl" | "lantern" | "lake";

export interface SceneBridgeState {
	timeOfDay: TimeOfDay;
	quality: SceneQuality;
	interactionMode: InteractionMode;
	cameraTransition: number;
	opticalBlur: number;
	opticalDim: number;
	reducedMotion: boolean;
	audioEnabled: boolean;
	hoverTarget: SceneHoverTarget;
	girlPhase: GirlPhase;
	easterEggState: EasterEggState;
	lanternClicks: number;
	rippleTotal: number;
	assetsReady: boolean;
	webglFallback: boolean;
	assetError: boolean;
	paused: boolean;
	mounted: boolean;
}

export type SceneBridgeListener = (state: Readonly<SceneBridgeState>) => void;

export interface SceneEngineAdapter {
	setCameraTransition: (progress: number) => void;
	setOpticalBlur: (blur: number, dim: number) => void;
	setInteractionMode: (mode: InteractionMode) => void;
	setTimeOfDay: (phase: TimeOfDay) => void;
	setQuality: (quality: SceneQuality) => void;
	setReducedMotion: (reduced: boolean) => void;
	setAudioEnabled: (enabled: boolean) => Promise<boolean>;
	triggerGirl: () => boolean;
	triggerLantern: () => { triggered: boolean; clickCount: number };
	spawnRipple: (x?: number, z?: number, strength?: number) => void;
	getState: () => Readonly<SceneBridgeState>;
	subscribe: (listener: SceneBridgeListener) => () => void;
	dispose: () => void;
}

export interface SceneBridge {
	attachEngine: (engine: SceneEngineAdapter) => () => void;
	setCameraTransition: (progress: number) => void;
	setOpticalBlur: (blur: number, dim: number) => void;
	setInteractionMode: (mode: InteractionMode) => void;
	setTimeOfDay: (phase: TimeOfDay) => void;
	setQuality: (quality: SceneQuality) => void;
	setReducedMotion: (reduced: boolean) => void;
	setAudioEnabled: (enabled: boolean) => Promise<boolean>;
	triggerGirl: () => boolean;
	triggerLantern: () => { triggered: boolean; clickCount: number };
	spawnRipple: (x?: number, z?: number, strength?: number) => void;
	getState: () => Readonly<SceneBridgeState>;
	subscribe: (listener: SceneBridgeListener) => () => void;
	dispose: () => void;
}

function createInitialBridgeState(defaultQuality: SceneQuality): SceneBridgeState {
	return {
		timeOfDay: "blue_hour",
		quality: defaultQuality,
		interactionMode: "launch",
		cameraTransition: 0,
		opticalBlur: 0,
		opticalDim: 0,
		reducedMotion: false,
		audioEnabled: false,
		hoverTarget: "none",
		girlPhase: "idle",
		easterEggState: "idle",
		lanternClicks: 0,
		rippleTotal: 0,
		assetsReady: false,
		webglFallback: false,
		assetError: false,
		paused: false,
		mounted: false,
	};
}

function detectInitialQuality(): SceneQuality {
	if (typeof window === "undefined") return "balanced";
	const isMobile = window.matchMedia("(max-width: 779px)").matches;
	const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
	return isMobile || cores <= 4 ? "balanced" : "high";
}

function syncRootScenePhase(phase: TimeOfDay): void {
	if (typeof document !== "undefined") {
		document.documentElement.dataset.scenePhase = phase;
	}
}

/**
 * 创建独立的场景状态桥接器：在 WebGL 引擎挂载前缓存调用并在挂载后自动重放，
 * 供 LaunchScreen / SpatialWorkspace / ArticleReadingView / 主题切换统一调用。
 */
export function createSceneBridge(initialQuality?: SceneQuality): SceneBridge {
	let state = createInitialBridgeState(initialQuality ?? detectInitialQuality());
	let engine: SceneEngineAdapter | null = null;
	let unsubscribeEngine: (() => void) | null = null;
	const listeners = new Set<SceneBridgeListener>();

	const notify = () => {
		const snapshot = { ...state };
		for (const listener of listeners) {
			listener(snapshot);
		}
	};

	const patchState = (patch: Partial<SceneBridgeState>) => {
		let changed = false;
		for (const key of Object.keys(patch) as (keyof SceneBridgeState)[]) {
			if (state[key] !== patch[key]) {
				changed = true;
				break;
			}
		}
		if (!changed) return;
		state = { ...state, ...patch };
		notify();
	};

	const bridge: SceneBridge = {
		attachEngine: (nextEngine) => {
			if (unsubscribeEngine) {
				unsubscribeEngine();
				unsubscribeEngine = null;
			}
			engine = nextEngine;

			// 将挂载前已设定的状态立即同步给新挂载的引擎
			nextEngine.setTimeOfDay(state.timeOfDay);
			nextEngine.setQuality(state.quality);
			nextEngine.setInteractionMode(state.interactionMode);
			nextEngine.setReducedMotion(state.reducedMotion);
			nextEngine.setCameraTransition(state.cameraTransition);
			nextEngine.setOpticalBlur(state.opticalBlur, state.opticalDim);

			unsubscribeEngine = nextEngine.subscribe((engineState) => {
				patchState(engineState);
			});

			return () => {
				if (engine === nextEngine) {
					unsubscribeEngine?.();
					unsubscribeEngine = null;
					engine = null;
					patchState({ mounted: false, paused: true, hoverTarget: "none" });
				}
			};
		},

		setCameraTransition: (progress) => {
			const clamped = clamp(progress, 0, 1);
			patchState({ cameraTransition: clamped });
			engine?.setCameraTransition(clamped);
		},

		setOpticalBlur: (blur, dim) => {
			const nextBlur = clamp(blur, 0, 1);
			const nextDim = clamp(dim, 0, 1);
			patchState({ opticalBlur: nextBlur, opticalDim: nextDim });
			engine?.setOpticalBlur(nextBlur, nextDim);
		},

		setInteractionMode: (mode) => {
			patchState({
				interactionMode: mode,
				hoverTarget: mode === "launch" ? state.hoverTarget : "none",
			});
			engine?.setInteractionMode(mode);
		},

		setTimeOfDay: (phase) => {
			if (!(phase in TIME_THEMES)) return;
			syncRootScenePhase(phase);
			patchState({ timeOfDay: phase });
			engine?.setTimeOfDay(phase);
		},

		setQuality: (quality) => {
			patchState({ quality });
			engine?.setQuality(quality);
		},

		setReducedMotion: (reduced) => {
			patchState({ reducedMotion: reduced });
			engine?.setReducedMotion(reduced);
		},

		setAudioEnabled: async (enabled) => {
			if (!engine) {
				patchState({ audioEnabled: false });
				return false;
			}
			const result = await engine.setAudioEnabled(enabled);
			patchState({ audioEnabled: result });
			return result;
		},

		triggerGirl: () => (engine ? engine.triggerGirl() : false),

		triggerLantern: () => (engine ? engine.triggerLantern() : { triggered: false, clickCount: 0 }),

		spawnRipple: (x, z, strength) => {
			engine?.spawnRipple(x, z, strength);
		},

		getState: () => ({ ...state }),

		subscribe: (listener) => {
			listeners.add(listener);
			listener({ ...state });
			return () => {
				listeners.delete(listener);
			};
		},

		dispose: () => {
			unsubscribeEngine?.();
			unsubscribeEngine = null;
			engine?.dispose();
			engine = null;
			patchState({ mounted: false, paused: true, hoverTarget: "none", audioEnabled: false });
		},
	};

	return bridge;
}

export const sceneBridge: SceneBridge = createSceneBridge();

export type { EasterEggState, GirlPhase, InteractionMode, SceneQuality, TimeOfDay };
