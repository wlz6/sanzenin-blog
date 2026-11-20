<script lang="ts">
import { onMount, tick, type Snippet } from "svelte";
import {
	LG_SPRINGS,
	pointerLight,
	stepDockRecede,
	type DockRecedeSnapshot,
} from "../../lib/liquid-glass/index.ts";
import type { DockRecedeState, GlassDockItem, GlassZone } from "./types.ts";

let {
	items,
	activeId,
	recedeState,
	scrollTop,
	readingMode = false,
	zone = "forest",
	ariaLabel = "空间导航 Dock",
	class: className = "",
	onSelect,
	satelliteStart,
	satelliteEnd,
}: {
	items: readonly GlassDockItem[];
	activeId: string;
	recedeState?: DockRecedeState;
	scrollTop?: number;
	readingMode?: boolean;
	zone?: GlassZone;
	ariaLabel?: string;
	class?: string;
	onSelect?: (item: GlassDockItem, event: MouseEvent) => void;
	satelliteStart?: Snippet;
	satelliteEnd?: Snippet;
} = $props();

let trackEl = $state<HTMLDivElement>();
let lensEl = $state<HTMLSpanElement>();
let hoverExpanded = $state(false);
let reducedMotion = $state(false);
let recedeTracker: DockRecedeSnapshot = {
	state: "expanded",
	lastScrollTop: 0,
	accumulatedDelta: 0,
};
let autoRecedeState = $state<DockRecedeState>("expanded");

$effect(() => {
	if (typeof scrollTop !== "number") return;
	recedeTracker = stepDockRecede(recedeTracker, scrollTop, { readingMode });
	autoRecedeState = recedeTracker.state;
});

const buttonEls = new Map<string, HTMLElement>();

let springX = 0;
let springW = 0;
let targetX = 0;
let targetW = 0;
let velX = 0;
let velW = 0;
let initialized = false;
let rafId: number | null = null;
let lastTime = 0;

let activeClip = $state("inset(0 100% 0 0 round 9999px)");
const baseRecede = $derived<DockRecedeState>(recedeState ?? autoRecedeState);
const effectiveRecede = $derived<DockRecedeState>(
	hoverExpanded ? "expanded" : baseRecede,
);

function registerItem(node: HTMLElement, id: string) {
	buttonEls.set(id, node);
	return {
		update(nextId: string) {
			if (nextId !== id) {
				buttonEls.delete(id);
				id = nextId;
				buttonEls.set(id, node);
			}
		},
		destroy() {
			buttonEls.delete(id);
		},
	};
}

function measureActiveTarget(): { x: number; w: number; trackWidth: number } | null {
	if (!trackEl) return null;
	const activeBtn = buttonEls.get(activeId);
	if (!activeBtn) return null;
	return {
		x: activeBtn.offsetLeft,
		w: activeBtn.offsetWidth,
		trackWidth: trackEl.scrollWidth,
	};
}

function ensureDockActiveVisible(instant: boolean) {
	if (!trackEl) return;
	const activeBtn = buttonEls.get(activeId);
	if (!activeBtn) return;
	const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
	if (maxScroll <= 1) return;

	const targetLeft = Math.max(
		0,
		Math.min(
			maxScroll,
			activeBtn.offsetLeft - (trackEl.clientWidth - activeBtn.offsetWidth) / 2,
		),
	);
	if (typeof trackEl.scrollTo === "function") {
		trackEl.scrollTo({
			left: targetLeft,
			behavior: instant || reducedMotion ? "auto" : "smooth",
		});
	} else {
		trackEl.scrollLeft = targetLeft;
	}
}

function applyLensTransform(x: number, w: number, vx: number, trackWidth: number) {
	if (!lensEl) return;
	const stretchX = reducedMotion ? 1 : 1 + Math.min(0.14, Math.abs(vx) / 2600);
	const stretchY = reducedMotion ? 1 : 1 - Math.min(0.06, Math.abs(vx) / 5200);
	lensEl.style.width = `${Math.max(0, w).toFixed(2)}px`;
	lensEl.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale(${stretchX.toFixed(4)}, ${stretchY.toFixed(4)})`;
	lensEl.style.opacity = w > 0 ? "1" : "0";

	if (trackWidth > 0) {
		const leftPct = Math.max(0, (x / trackWidth) * 100);
		const rightPct = Math.max(0, ((trackWidth - (x + w)) / trackWidth) * 100);
		activeClip = `inset(0 ${rightPct.toFixed(2)}% 0 ${leftPct.toFixed(2)}% round 9999px)`;
	}
}

function stopSpring() {
	if (rafId !== null && typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	lastTime = 0;
}

function stepSpring(now: number) {
	const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
	lastTime = now;

	const { response, dampingRatio } = LG_SPRINGS.dockPillMorph;
	const omega = (2 * Math.PI) / response;
	const damping = 2 * dampingRatio * omega;
	const stiffness = omega * omega;

	const ax = -stiffness * (springX - targetX) - damping * velX;
	velX += ax * dt;
	springX += velX * dt;

	const aw = -stiffness * (springW - targetW) - damping * velW;
	velW += aw * dt;
	springW += velW * dt;

	const trackWidth = trackEl?.scrollWidth ?? 0;
	const settled =
		Math.abs(springX - targetX) < 0.2 &&
		Math.abs(velX) < 1.2 &&
		Math.abs(springW - targetW) < 0.2 &&
		Math.abs(velW) < 1.2;

	if (settled) {
		springX = targetX;
		springW = targetW;
		velX = 0;
		velW = 0;
		applyLensTransform(springX, springW, 0, trackWidth);
		rafId = null;
		lastTime = 0;
		return;
	}

	applyLensTransform(springX, springW, velX, trackWidth);
	rafId = requestAnimationFrame(stepSpring);
}

function syncLens(instant = false) {
	const measured = measureActiveTarget();
	if (!measured) return;
	const firstSync = !initialized;
	ensureDockActiveVisible(instant || firstSync);
	targetX = measured.x;
	targetW = measured.w;

	if (!initialized || instant || reducedMotion || typeof requestAnimationFrame !== "function") {
		stopSpring();
		initialized = true;
		springX = targetX;
		springW = targetW;
		velX = 0;
		velW = 0;
		applyLensTransform(springX, springW, 0, measured.trackWidth);
		return;
	}

	if (rafId === null) {
		lastTime = performance.now();
		rafId = requestAnimationFrame(stepSpring);
	}
}

$effect(() => {
	void activeId;
	void items.length;
	void effectiveRecede;
	void tick().then(() => syncLens(false));
});

onMount(() => {
	const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
	const updateReduced = () => {
		reducedMotion = mq.matches || document.documentElement.classList.contains("motion-reduced");
	};
	updateReduced();
	mq.addEventListener("change", updateReduced);

	let ro: ResizeObserver | null = null;
	if (trackEl) {
		ro = new ResizeObserver(() => syncLens(true));
		ro.observe(trackEl);
	}
	void tick().then(() => syncLens(true));

	return () => {
		stopSpring();
		mq.removeEventListener("change", updateReduced);
		ro?.disconnect();
	};
});

function handleItemClick(item: GlassDockItem, event: MouseEvent) {
	if (onSelect) {
		onSelect(item, event);
	}
}
</script>

<!-- 底部唤醒感应区（隐藏态时移入底缘即时展开） -->
{#if baseRecede === "hidden-edge"}
	<div
		class="lg-dock-reveal-zone"
		aria-hidden="true"
		onpointerenter={() => {
			hoverExpanded = true;
		}}
	></div>
{/if}

<div
	class={`lg-dock-shell ${className}`.trim()}
	data-lg-recede={effectiveRecede}
	data-lg-group="main-dock"
	data-lg-interactive="true"
	onpointerenter={() => {
		if (baseRecede !== "expanded") hoverExpanded = true;
	}}
	onpointerleave={() => {
		hoverExpanded = false;
	}}
>
	{#if satelliteStart}
		<div class="lg-dock-satellite">
			{@render satelliteStart()}
		</div>
	{/if}

	<nav
		aria-label={ariaLabel}
		class="lg-surface lg-dock"
		data-lg-variant="dock-pill"
		data-lg-zone={zone}
		data-lg-filter="pill"
		data-lg-elevation="3"
		use:pointerLight={{ enabled: true, groupId: "main-dock" }}
	>
		<span class="lg-dimmer" aria-hidden="true"></span>
		<span class="lg-backdrop" aria-hidden="true"></span>
		<span class="lg-tint" aria-hidden="true"></span>
		<span class="lg-rim" aria-hidden="true"></span>
		<span class="lg-specular" aria-hidden="true"></span>

		<div class="lg-content lg-dock__track" bind:this={trackEl}>
			<!-- 弹簧驱动的连续激活态液态透镜胶囊 -->
			<span class="lg-dock-lens" bind:this={lensEl} aria-hidden="true"></span>

			{#each items as item (item.id)}
				{@const isActive = item.id === activeId}
				{#if item.href}
					<a
						href={item.href}
						class="lg-control lg-dock__item"
						aria-label={item.ariaLabel ?? item.label}
						aria-current={isActive ? "page" : undefined}
						data-active={isActive ? "true" : undefined}
						use:registerItem={item.id}
						onclick={(e) => handleItemClick(item, e)}
					>
						{#if item.icon}<span class="lg-dock__icon" aria-hidden="true">{item.icon}</span>{/if}
						<span class="lg-dock__label">{item.label}</span>
						{#if item.badge !== undefined}<span class="lg-dock__badge">{item.badge}</span>{/if}
					</a>
				{:else}
					<button
						type="button"
						class="lg-control lg-dock__item"
						aria-label={item.ariaLabel ?? item.label}
						aria-pressed={isActive}
						data-active={isActive ? "true" : undefined}
						use:registerItem={item.id}
						onclick={(e) => handleItemClick(item, e)}
					>
						{#if item.icon}<span class="lg-dock__icon" aria-hidden="true">{item.icon}</span>{/if}
						<span class="lg-dock__label">{item.label}</span>
						{#if item.badge !== undefined}<span class="lg-dock__badge">{item.badge}</span>{/if}
					</button>
				{/if}
			{/each}

			<!-- 同步高亮文本覆盖层（通过 clip-path 随透镜胶囊精准裁切，无色差滞后） -->
			<div
				class="lg-dock__active-overlay"
				aria-hidden="true"
				style:clip-path={activeClip}
			>
				{#each items as item (item.id)}
					<span class="lg-dock__item lg-dock__item--lit">
						{#if item.icon}<span class="lg-dock__icon">{item.icon}</span>{/if}
						<span class="lg-dock__label">{item.label}</span>
						{#if item.badge !== undefined}<span class="lg-dock__badge">{item.badge}</span>{/if}
					</span>
				{/each}
			</div>
		</div>
	</nav>

	{#if satelliteEnd}
		<div class="lg-dock-satellite">
			{@render satelliteEnd()}
		</div>
	{/if}
</div>

<style>
	.lg-dock-reveal-zone {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		height: calc(48px + var(--lg-safe-bottom));
		z-index: 39;
	}

	.lg-dock-shell {
		position: fixed;
		inset-inline: 0;
		bottom: calc(14px + var(--lg-safe-bottom));
		margin-inline: auto;
		width: max-content;
		max-width: calc(100vw - 20px - var(--lg-safe-left) - var(--lg-safe-right));
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition:
			transform var(--lg-dur-dock) var(--lg-ease-out),
			opacity var(--lg-dur-dock) var(--lg-ease-out);
	}

	.lg-dock-shell[data-lg-recede="receded"] {
		transform: translate3d(0, 12px, 0) scale(0.86);
		opacity: 0.78;
	}

	.lg-dock-shell[data-lg-recede="hidden-edge"] {
		transform: translate3d(0, calc(100% + var(--lg-safe-bottom) + 20px), 0);
		opacity: 0;
		pointer-events: none;
	}

	.lg-dock-satellite {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}

	.lg-dock {
		--lg-surface-radius: var(--lg-radius-pill);
		padding: 5px;
		max-width: 100%;
		overflow: hidden;
	}

	.lg-dock__track {
		position: relative;
		display: flex;
		align-items: center;
		gap: 2px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.lg-dock__track::-webkit-scrollbar {
		display: none;
	}

	.lg-dock-lens {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: 0;
		border-radius: var(--lg-radius-pill);
		background:
			radial-gradient(120% 100% at 50% 0%, rgba(238, 246, 251, 0.24), transparent 64%),
			rgba(185, 216, 232, 0.20);
		box-shadow:
			inset 0 1px 0 rgba(238, 246, 251, 0.45),
			inset 0 -1px 0 rgba(246, 215, 122, 0.22),
			0 4px 14px rgba(5, 13, 27, 0.22);
		border: 1px solid rgba(238, 246, 251, 0.26);
		transform-origin: center;
		pointer-events: none;
		opacity: 0;
	}

	.lg-dock__item {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 44px;
		padding: 0 15px;
		border: 0;
		border-radius: var(--lg-radius-pill);
		background: transparent;
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-ui);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	.lg-dock__active-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 2px;
		pointer-events: none;
	}

	.lg-dock__item--lit {
		color: var(--lg-ink-primary);
		text-shadow: 0 0 12px rgba(246, 215, 122, 0.34);
	}

	.lg-dock__icon {
		display: inline-flex;
		align-items: center;
		font-size: 1rem;
		line-height: 1;
	}

	.lg-dock__badge {
		padding: 1px 6px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-firefly-soft);
		color: var(--lg-firefly-gold);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-dock__item:hover {
			color: var(--lg-ink-primary);
		}
	}

	@media (max-width: 640px) {
		.lg-dock-shell {
			bottom: calc(10px + var(--lg-safe-bottom));
			gap: 6px;
		}
		.lg-dock__item {
			padding: 0 11px;
			font-size: 0.8125rem;
		}
		.lg-dock-shell[data-lg-recede="receded"] .lg-dock__label {
			display: none;
		}
	}
</style>
