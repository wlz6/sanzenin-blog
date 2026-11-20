export {
	REFRACTION_PRESETS,
	bakeDisplacementMapDataUrl,
	computeFresnelBevelSample,
	populateDisplacementMaps,
	sdRoundedBox,
	type RefractionPreset,
	type RefractionPresetId,
} from "./displacement.ts";

export {
	detectLiquidGlassCapability,
	initLiquidGlassCapability,
	type CapabilityEnvironment,
	type LiquidGlassCapability,
	type PerfTier,
	type RefractMode,
} from "./capability.ts";

export { pointerLight, type PointerLightOptions } from "./pointer-light.ts";

export {
	TransitionCoordinator,
	easeOutCamera,
	easeOutQuintic,
	evaluateLaunchTimeline,
	stepDockRecede,
	type DockRecedeMode,
	type DockRecedeSnapshot,
	type LaunchTimelineFrame,
	type SceneTransitionTarget,
	type TransitionCallbacks,
	type TransitionDirection,
	type WorkspaceStage,
} from "./transition-coordinator.ts";

export const LG_SPRINGS = {
	uiCriticallyDamped: { response: 0.34, dampingRatio: 1.0 },
	momentumFlick: { response: 0.38, dampingRatio: 0.86 },
	dockPillMorph: { response: 0.30, dampingRatio: 0.88 },
	lensGelFlex: { response: 0.26, dampingRatio: 0.78 },
	sheetSnap: { response: 0.32, dampingRatio: 0.85 },
} as const;

export const GLASS_SURFACE_CONTEXT_KEY = Symbol("liquid-glass-surface");
