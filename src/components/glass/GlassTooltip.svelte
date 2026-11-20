<script module lang="ts">
let lastTooltipClosedAt = 0;
const INSTANT_HOP_WINDOW_MS = 400;
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";

let {
	content,
	placement = "top",
	delay = 350,
	disabled = false,
	class: className = "",
	children,
}: {
	content: string;
	placement?: "top" | "bottom";
	delay?: number;
	disabled?: boolean;
	class?: string;
	children?: Snippet;
} = $props();

const tooltipId = `lg-tip-${Math.random().toString(36).slice(2, 8)}`;
let visible = $state(false);
let instant = $state(false);
let openTimer: ReturnType<typeof setTimeout> | null = null;

function isFineHover(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function clearTimer() {
	if (openTimer !== null) {
		clearTimeout(openTimer);
		openTimer = null;
	}
}

function show(fromFocus = false) {
	if (disabled || !content) return;
	if (!fromFocus && !isFineHover()) return;
	clearTimer();

	const recentlyClosed = performance.now() - lastTooltipClosedAt < INSTANT_HOP_WINDOW_MS;
	if (recentlyClosed || delay <= 0) {
		instant = recentlyClosed;
		visible = true;
		return;
	}

	instant = false;
	openTimer = setTimeout(() => {
		visible = true;
		openTimer = null;
	}, delay);
}

function hide() {
	clearTimer();
	if (visible) {
		lastTooltipClosedAt = performance.now();
		visible = false;
	}
}

$effect(() => () => clearTimer());
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class={`lg-tooltip-wrap ${className}`.trim()}
	aria-describedby={visible ? tooltipId : undefined}
	onpointerenter={() => show(false)}
	onpointerleave={hide}
	onfocusin={() => show(true)}
	onfocusout={hide}
	onkeydown={(e) => {
		if (e.key === "Escape") hide();
	}}
>
	{@render children?.()}

	{#if visible && content}
		<span
			id={tooltipId}
			role="tooltip"
			class={`lg-tooltip lg-tooltip--${placement}`}
			data-instant={instant ? "true" : undefined}
		>
			<GlassSurface
				variant="floating-chrome"
				zone="moonlight"
				elevation={2}
				filter="none"
				pointerGlow={false}
				radius="var(--lg-radius-pill)"
				class="lg-tooltip__surface"
			>
				<span class="lg-tooltip__text">{content}</span>
			</GlassSurface>
		</span>
	{/if}
</span>

<style>
	.lg-tooltip-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.lg-tooltip {
		position: absolute;
		left: 50%;
		z-index: 80;
		pointer-events: none;
		white-space: nowrap;
		animation: lg-tooltip-in var(--lg-dur-tooltip) var(--lg-ease-out) both;
	}

	.lg-tooltip--top {
		bottom: calc(100% + 8px);
		transform: translateX(-50%);
		transform-origin: bottom center;
	}

	.lg-tooltip--bottom {
		top: calc(100% + 8px);
		transform: translateX(-50%);
		transform-origin: top center;
	}

	.lg-tooltip[data-instant="true"] {
		animation-duration: 0ms;
	}

	:global(.lg-tooltip__surface) {
		--lg-blur: 16px;
		padding: 5px 10px;
	}

	.lg-tooltip__text {
		font-size: var(--lg-text-micro);
		font-weight: 500;
		color: var(--lg-ink-primary);
		line-height: 1.3;
	}

	@keyframes lg-tooltip-in {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-tooltip {
			animation-duration: 0ms;
		}
	}
</style>
