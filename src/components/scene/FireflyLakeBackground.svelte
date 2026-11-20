<script lang="ts">
import { onMount } from "svelte";
import { url } from "@utils/url-utils";
import { SCENE_ASSETS } from "../../scene/assets.ts";
import { FireflyLakeEngine } from "../../scene/FireflyLakeEngine.ts";
import {
	sceneBridge,
	type InteractionMode,
	type SceneBridgeState,
	type SceneQuality,
	type TimeOfDay,
} from "../../scene/scene-bridge.ts";

interface Props {
	timeOfDay?: TimeOfDay;
	quality?: SceneQuality;
	interactionMode?: InteractionMode;
	reducedMotion?: boolean;
}

let { timeOfDay, quality, interactionMode, reducedMotion }: Props = $props();

let mountEl: HTMLDivElement;
let bridgeState = $state<SceneBridgeState>(sceneBridge.getState());

const fallbackUrl = url(SCENE_ASSETS.fallbackPoster);
const posterFilters = {
	blue_hour: { sepia: 0, hue: 0, saturation: 1, brightness: 1, contrast: 1 },
	moonlit: { sepia: 0, hue: 0, saturation: 1.06, brightness: 1.08, contrast: 1 },
	midnight: { sepia: 0, hue: 0, saturation: 1, brightness: 0.82, contrast: 1.08 },
	dusk: { sepia: 0.32, hue: -22, saturation: 1.18, brightness: 1, contrast: 1 },
} satisfies Record<TimeOfDay, object>;
const showWebgl = $derived(
	bridgeState.quality !== "static" && !bridgeState.webglFallback && bridgeState.assetsReady,
);

const staticFilterStyle = $derived.by(() => {
	const blurPx = (bridgeState.opticalBlur * 8).toFixed(2);
	const { sepia, hue, saturation, brightness, contrast } = posterFilters[bridgeState.timeOfDay];
	const bright = (brightness * (1 - bridgeState.opticalDim * 0.28)).toFixed(3);
	return `blur(${blurPx}px) brightness(${bright}) sepia(${sepia}) hue-rotate(${hue}deg) saturate(${saturation}) contrast(${contrast})`;
});

const staticScaleStyle = $derived(
	bridgeState.reducedMotion
		? "none"
		: `scale(${(1 + bridgeState.cameraTransition * 0.065 + bridgeState.opticalBlur * 0.025).toFixed(4)})`,
);

$effect(() => {
	if (timeOfDay) sceneBridge.setTimeOfDay(timeOfDay);
});

$effect(() => {
	if (quality) sceneBridge.setQuality(quality);
});

$effect(() => {
	if (interactionMode) sceneBridge.setInteractionMode(interactionMode);
});

$effect(() => {
	if (reducedMotion !== undefined) sceneBridge.setReducedMotion(reducedMotion);
});

$effect(() => {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	if (bridgeState.interactionMode === "launch" && bridgeState.hoverTarget !== "none") {
		root.dataset.sceneHover = bridgeState.hoverTarget;
	} else {
		delete root.dataset.sceneHover;
	}
});

onMount(() => {
	const root = document.documentElement;
	const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

	const syncMotionPreference = () => {
		const isReduced =
			reducedMotion === true || motionQuery.matches || root.classList.contains("motion-reduced");
		sceneBridge.setReducedMotion(isReduced);
	};
	syncMotionPreference();

	const motionObserver = new MutationObserver(syncMotionPreference);
	motionObserver.observe(root, { attributes: true, attributeFilter: ["class"] });
	motionQuery.addEventListener("change", syncMotionPreference);

	const initial = sceneBridge.getState();
	const basePrefix = url("/");
	const engine = new FireflyLakeEngine({
		basePath: basePrefix,
		initialTimeOfDay: timeOfDay ?? initial.timeOfDay,
		initialQuality: quality ?? initial.quality,
		initialInteractionMode: interactionMode ?? initial.interactionMode,
		initialReducedMotion: initial.reducedMotion,
	});

	const unsubscribeBridge = sceneBridge.subscribe((next) => {
		bridgeState = next;
	});

	engine.mount(mountEl);
	const detachEngine = sceneBridge.attachEngine(engine);

	return () => {
		motionObserver.disconnect();
		motionQuery.removeEventListener("change", syncMotionPreference);
		unsubscribeBridge();
		detachEngine();
		engine.dispose();
		delete root.dataset.sceneHover;
	};
});
</script>

<div
	id="firefly-lake-scene"
	class="firefly-scene-root"
	data-testid="lake-scene-root"
	data-time-phase={bridgeState.timeOfDay}
	data-reduced-motion={bridgeState.reducedMotion}
	data-scene-quality={bridgeState.quality}
	data-interaction-mode={bridgeState.interactionMode}
	data-girl-state={bridgeState.girlPhase}
	data-easter-egg={bridgeState.easterEggState}
	data-lantern-clicks={bridgeState.lanternClicks}
	data-ripple-count={bridgeState.rippleTotal}
	data-assets-ready={bridgeState.assetsReady ? "true" : "false"}
	data-webgl-fallback={bridgeState.webglFallback ? "true" : "false"}
	aria-hidden="true"
	data-pagefind-ignore
>
	<img
		src={fallbackUrl}
		alt=""
		class="firefly-scene-poster"
		style:filter={staticFilterStyle}
		style:transform={staticScaleStyle}
		decoding="async"
		fetchpriority="high"
	/>
	<div
		bind:this={mountEl}
		class="firefly-scene-canvas-host"
		class:is-visible={showWebgl}
	></div>
</div>

<style>
	.firefly-scene-root {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		user-select: none;
		background-color: #0b1528;
	}

	.firefly-scene-poster,
	.firefly-scene-canvas-host {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.firefly-scene-poster {
		object-fit: cover;
		object-position: 62% 52%;
		transition:
			filter var(--lg-dur-dock) var(--lg-ease-out),
			transform var(--lg-dur-popover) var(--lg-ease-camera);
	}

	.firefly-scene-canvas-host {
		opacity: 0;
		transition: opacity 560ms ease-out;
	}

	.firefly-scene-canvas-host.is-visible {
		opacity: 1;
	}

	:global(html[data-scene-hover="girl"]),
	:global(html[data-scene-hover="lantern"]) {
		cursor: pointer;
	}

	:global(html[data-scene-hover="lake"]) {
		cursor: crosshair;
	}

	.firefly-scene-root[data-reduced-motion="true"] .firefly-scene-poster {
		transition: filter var(--lg-dur-dropdown) var(--lg-ease-out);
	}

	.firefly-scene-root[data-reduced-motion="true"] .firefly-scene-canvas-host {
		transition-duration: var(--lg-dur-dropdown);
	}
</style>
