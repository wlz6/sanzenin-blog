<script lang="ts">
import { tick, type Snippet } from "svelte";
import { pointerLight } from "../../lib/liquid-glass/index.ts";
import type {
	GlassBreadcrumbItem,
	GlassNavItem,
	GlassZone,
} from "./types.ts";

let {
	brand,
	brandHref = "/",
	items = [],
	activeId,
	breadcrumbs = [],
	progress,
	zone = "forest",
	compact = false,
	ariaLabel = "顶部导航",
	class: className = "",
	onBrandClick,
	onSelect,
	trailing,
}: {
	brand?: string;
	brandHref?: string;
	items?: readonly GlassNavItem[];
	activeId?: string;
	breadcrumbs?: readonly GlassBreadcrumbItem[];
	progress?: number;
	zone?: GlassZone;
	compact?: boolean;
	ariaLabel?: string;
	class?: string;
	onBrandClick?: (event: MouseEvent) => void;
	onSelect?: (item: GlassNavItem, event: MouseEvent) => void;
	trailing?: Snippet;
} = $props();

let trackEl = $state<HTMLElement>();
let fadeStart = $state(false);
let fadeEnd = $state(false);
let activeClip = $state("inset(0 100% 0 0 round 9999px)");
const navItemEls = new Map<string, HTMLElement>();
let hasInitialScroll = false;

function registerNavItem(node: HTMLElement, id: string) {
	navItemEls.set(id, node);
	return {
		update(nextId: string) {
			if (nextId !== id) {
				navItemEls.delete(id);
				id = nextId;
				navItemEls.set(id, node);
			}
		},
		destroy() {
			navItemEls.delete(id);
		},
	};
}

function ensureActiveVisible(instant: boolean) {
	if (!trackEl || !activeId) return;
	const activeEl = navItemEls.get(activeId);
	if (!activeEl) return;
	const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
	if (maxScroll <= 1) return;

	const targetLeft = Math.max(
		0,
		Math.min(
			maxScroll,
			activeEl.offsetLeft - (trackEl.clientWidth - activeEl.offsetWidth) / 2,
		),
	);
	const reduced =
		instant ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
		document.documentElement.classList.contains("motion-reduced");
	if (typeof trackEl.scrollTo === "function") {
		trackEl.scrollTo({ left: targetLeft, behavior: reduced ? "auto" : "smooth" });
	} else {
		trackEl.scrollLeft = targetLeft;
	}
}

function syncOverflowAndClip() {
	if (!trackEl) return;
	const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
	fadeStart = trackEl.scrollLeft > 2;
	fadeEnd = maxScroll > 2 && trackEl.scrollLeft < maxScroll - 2;

	if (!activeId) {
		activeClip = "inset(0 100% 0 0 round 9999px)";
		return;
	}
	const activeEl = navItemEls.get(activeId);
	if (!activeEl || trackEl.scrollWidth <= 0) {
		activeClip = "inset(0 100% 0 0 round 9999px)";
		return;
	}
	const total = trackEl.scrollWidth;
	const leftPct = (activeEl.offsetLeft / total) * 100;
	const rightPct = ((total - (activeEl.offsetLeft + activeEl.offsetWidth)) / total) * 100;
	activeClip = `inset(0 ${Math.max(0, rightPct).toFixed(2)}% 0 ${Math.max(0, leftPct).toFixed(2)}% round 9999px)`;
}

$effect(() => {
	void activeId;
	void items.length;
	const el = trackEl;
	if (!el) return;
	const ro = new ResizeObserver(() => {
		ensureActiveVisible(true);
		syncOverflowAndClip();
	});
	ro.observe(el);
	void tick().then(() => {
		const isFirst = !hasInitialScroll;
		hasInitialScroll = true;
		ensureActiveVisible(isFirst);
		syncOverflowAndClip();
	});
	return () => ro.disconnect();
});

const clampedProgress = $derived(
	typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : null,
);
</script>

<header
	class={`lg-surface lg-nav ${compact ? "lg-nav--compact" : ""} ${className}`.trim()}
	data-lg-variant="floating-chrome"
	data-lg-zone={zone}
	data-lg-filter="chrome"
	data-lg-elevation="2"
	data-lg-interactive="true"
	use:pointerLight={{ enabled: true, groupId: "top-nav" }}
>
	<span class="lg-dimmer" aria-hidden="true"></span>
	<span class="lg-backdrop" aria-hidden="true"></span>
	<span class="lg-tint" aria-hidden="true"></span>
	<span class="lg-rim" aria-hidden="true"></span>
	<span class="lg-specular" aria-hidden="true"></span>

	<div class="lg-content lg-nav__inner">
		{#if brand}
			<a
				href={brandHref}
				class="lg-control lg-nav__brand"
				onclick={onBrandClick}
			>
				{brand}
			</a>
		{/if}

		{#if breadcrumbs.length > 0}
			<nav class="lg-nav__crumbs" aria-label="页面路径">
				{#each breadcrumbs as crumb, index (crumb.label + index)}
					{#if index > 0}
						<span class="lg-nav__sep" aria-hidden="true">/</span>
					{/if}
					{#if crumb.href}
						<a
							href={crumb.href}
							class="lg-control lg-nav__crumb"
							onclick={(e) => {
								if (crumb.onClick) {
									e.preventDefault();
									crumb.onClick();
								}
							}}
						>
							{crumb.label}
						</a>
					{:else if crumb.onClick}
						<button type="button" class="lg-control lg-nav__crumb" onclick={crumb.onClick}>
							{crumb.label}
						</button>
					{:else}
						<span class="lg-nav__crumb lg-nav__crumb--current" aria-current="page">{crumb.label}</span>
					{/if}
				{/each}
			</nav>
		{:else if items.length > 0}
			<nav
				bind:this={trackEl}
				class="lg-nav__track"
				class:fade-start={fadeStart}
				class:fade-end={fadeEnd}
				aria-label={ariaLabel}
				onscroll={syncOverflowAndClip}
			>
				<div class="lg-nav__items">
					{#each items as item (item.id)}
						{@const isActive = item.id === activeId}
						{#if item.href}
							<a
								href={item.href}
								class="lg-control lg-nav__item"
								aria-label={item.ariaLabel ?? item.label}
								aria-current={isActive ? "page" : undefined}
								use:registerNavItem={item.id}
								onclick={(e) => onSelect?.(item, e)}
							>
								{item.label}
							</a>
						{:else}
							<button
								type="button"
								class="lg-control lg-nav__item"
								aria-label={item.ariaLabel ?? item.label}
								aria-pressed={isActive}
								use:registerNavItem={item.id}
								onclick={(e) => onSelect?.(item, e)}
							>
								{item.label}
							</button>
						{/if}
					{/each}

					<!-- 离主线程合成的 clip-path 激活态胶囊覆盖层 -->
					<div
						class="lg-nav-pill"
						aria-hidden="true"
						style:clip-path={activeClip}
					>
						{#each items as item (item.id)}
							<span class="lg-nav__item lg-nav__item--lit">{item.label}</span>
						{/each}
					</div>
				</div>
			</nav>
		{/if}

		{#if trailing}
			<div class="lg-nav__trailing">
				{@render trailing()}
			</div>
		{/if}
	</div>

	{#if clampedProgress !== null}
		<div class="lg-nav__progress" aria-hidden="true">
			<span
				class="lg-nav__progress-bar"
				style:transform={`scaleX(${clampedProgress.toFixed(4)})`}
			></span>
		</div>
	{/if}
</header>

<style>
	.lg-nav {
		position: fixed;
		inset-block-start: calc(12px + var(--lg-safe-top));
		inset-inline: 0;
		margin-inline: auto;
		width: max-content;
		max-width: calc(100vw - 24px - var(--lg-safe-left) - var(--lg-safe-right));
		z-index: 42;
		--lg-surface-radius: var(--lg-radius-pill);
		overflow: hidden;
	}

	.lg-nav__inner {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px;
	}

	.lg-nav--compact .lg-nav__inner {
		padding: 4px 6px;
	}

	.lg-nav__brand {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 12px;
		border-radius: var(--lg-radius-pill);
		font-family: var(--lg-font-display);
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--lg-ink-primary);
		text-decoration: none;
		white-space: nowrap;
	}

	.lg-nav__track {
		min-width: 0;
		max-width: 56vw;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.lg-nav__track::-webkit-scrollbar {
		display: none;
	}

	.lg-nav__track.fade-start {
		-webkit-mask-image: linear-gradient(to right, transparent, #000 22px);
		mask-image: linear-gradient(to right, transparent, #000 22px);
	}

	.lg-nav__track.fade-end {
		-webkit-mask-image: linear-gradient(to right, #000 calc(100% - 22px), transparent);
		mask-image: linear-gradient(to right, #000 calc(100% - 22px), transparent);
	}

	.lg-nav__track.fade-start.fade-end {
		-webkit-mask-image: linear-gradient(to right, transparent, #000 22px, #000 calc(100% - 22px), transparent);
		mask-image: linear-gradient(to right, transparent, #000 22px, #000 calc(100% - 22px), transparent);
	}

	.lg-nav__items {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.lg-nav__item {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 14px;
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

	.lg-nav-pill {
		position: absolute;
		inset: 0;
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: rgba(185, 216, 232, 0.22);
		border-radius: var(--lg-radius-pill);
		pointer-events: none;
		transition: clip-path 240ms var(--lg-ease-in-out);
	}

	.lg-nav__item--lit {
		color: var(--lg-ink-primary);
	}

	.lg-nav__crumbs {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		overflow: hidden;
	}

	.lg-nav__crumb {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--lg-radius-pill);
		background: transparent;
		color: var(--lg-ink-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	.lg-nav__crumb--current {
		color: var(--lg-ink-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: min(44vw, 320px);
		cursor: default;
	}

	.lg-nav__sep {
		color: var(--lg-ink-tertiary);
		font-size: 0.75rem;
	}

	.lg-nav__trailing {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex: none;
	}

	.lg-nav__progress {
		position: absolute;
		inset-inline: 18px;
		bottom: 0;
		height: 2px;
		z-index: 4;
		background: rgba(185, 216, 232, 0.14);
		overflow: hidden;
		pointer-events: none;
	}

	.lg-nav__progress-bar {
		display: block;
		width: 100%;
		height: 100%;
		transform-origin: left center;
		background: linear-gradient(90deg, var(--lg-moonlight), var(--lg-firefly-gold));
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-nav__item:hover,
		.lg-nav__crumb:not(.lg-nav__crumb--current):hover,
		.lg-nav__brand:hover {
			color: var(--lg-ink-primary);
			background: rgba(185, 216, 232, 0.12);
		}
	}
</style>
