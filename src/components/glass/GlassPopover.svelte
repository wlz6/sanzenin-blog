<script lang="ts">
import type { Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassPlacement, GlassZone } from "./types.ts";

let {
	open = $bindable(false),
	placement = "bottom-end",
	zone = "forest",
	title,
	ariaLabel,
	class: className = "",
	onClose,
	trigger,
	children,
}: {
	open?: boolean;
	placement?: GlassPlacement;
	zone?: GlassZone;
	title?: string;
	ariaLabel?: string;
	class?: string;
	onClose?: () => void;
	trigger?: Snippet<[{ toggle: () => void; open: boolean }]>;
	children?: Snippet<[{ close: () => void }]>;
} = $props();

let rootEl = $state<HTMLDivElement>();

const originMap: Record<GlassPlacement, string> = {
	"bottom-start": "top left",
	"bottom-center": "top center",
	"bottom-end": "top right",
	"top-start": "bottom left",
	"top-center": "bottom center",
	"top-end": "bottom right",
};

const transformOrigin = $derived(originMap[placement]);

function close() {
	if (!open) return;
	open = false;
	onClose?.();
}

function toggle() {
	if (open) close();
	else open = true;
}

$effect(() => {
	if (!open || typeof document === "undefined") return;
	const onPointerDown = (event: PointerEvent) => {
		if (rootEl && event.target instanceof Node && !rootEl.contains(event.target)) {
			close();
		}
	};
	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			close();
		}
	};
	document.addEventListener("pointerdown", onPointerDown);
	document.addEventListener("keydown", onKeydown);
	return () => {
		document.removeEventListener("pointerdown", onPointerDown);
		document.removeEventListener("keydown", onKeydown);
	};
});
</script>

<div bind:this={rootEl} class={`lg-popover-anchor ${className}`.trim()} data-lg-interactive="true">
	{@render trigger?.({ toggle, open })}

	{#if open}
		<div
			class={`lg-popover lg-popover--${placement}`}
			style={`--lg-origin: ${transformOrigin};`}
			role="dialog"
			aria-label={ariaLabel ?? title ?? "悬浮面板"}
		>
			<GlassSurface
				variant="overlay"
				{zone}
				elevation={3}
				embedded={false}
				radius="var(--lg-radius-panel)"
				class="lg-popover__surface"
			>
				{#if title}
					<div class="lg-popover__header">
						<span class="lg-popover__title">{title}</span>
					</div>
				{/if}
				<div class="lg-popover__body">
					{@render children?.({ close })}
				</div>
			</GlassSurface>
		</div>
	{/if}
</div>

<style>
	.lg-popover-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.lg-popover {
		position: absolute;
		z-index: 60;
		min-width: 14rem;
		max-width: min(24rem, calc(100vw - 24px));
		transform-origin: var(--lg-origin, top right);
		animation: lg-popover-in var(--lg-dur-popover) var(--lg-ease-out);
	}

	.lg-popover--bottom-start { top: calc(100% + 10px); left: 0; }
	.lg-popover--bottom-center { top: calc(100% + 10px); left: 50%; translate: -50% 0; }
	.lg-popover--bottom-end { top: calc(100% + 10px); right: 0; }
	.lg-popover--top-start { bottom: calc(100% + 10px); left: 0; }
	.lg-popover--top-center { bottom: calc(100% + 10px); left: 50%; translate: -50% 0; }
	.lg-popover--top-end { bottom: calc(100% + 10px); right: 0; }

	:global(.lg-popover__surface) {
		overflow: hidden;
	}

	.lg-popover__header {
		padding: 12px 16px 8px;
		border-bottom: 1px solid var(--lg-separator);
	}

	.lg-popover__title {
		font-size: var(--lg-text-ui);
		font-weight: 600;
		color: var(--lg-ink-primary);
	}

	.lg-popover__body {
		padding: 12px 16px;
		max-height: min(65dvh, 420px);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	@keyframes lg-popover-in {
		from { transform: scale(0.96); }
	}

	@media (max-width: 640px) {
		.lg-popover {
			position: fixed;
			inset: auto max(12px, var(--lg-safe-right)) calc(12px + var(--lg-safe-bottom)) max(12px, var(--lg-safe-left));
			translate: none;
			max-width: none;
			transform-origin: bottom center;
		}

		.lg-popover--bottom-start,
		.lg-popover--bottom-center,
		.lg-popover--bottom-end {
			top: var(--lg-popover-top, calc(68px + var(--lg-safe-top)));
			bottom: auto;
			transform-origin: top center;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-popover {
			animation: lg-popover-fade 160ms ease both;
		}
		@keyframes lg-popover-fade {
			from { opacity: 0; }
			to { opacity: 1; }
		}
	}
</style>
