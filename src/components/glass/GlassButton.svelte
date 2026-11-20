<script lang="ts">
import { getContext, type Snippet } from "svelte";
import {
	GLASS_SURFACE_CONTEXT_KEY,
	pointerLight,
} from "../../lib/liquid-glass/index.ts";
import type {
	GlassButtonShape,
	GlassButtonSize,
	GlassButtonVariant,
	GlassZone,
} from "./types.ts";

let {
	variant = "regular",
	size = "md",
	shape = "pill",
	zone = "forest",
	href,
	target,
	rel,
	type = "button",
	disabled = false,
	loading = false,
	pressed,
	ariaLabel,
	ariaExpanded,
	ariaHaspopup,
	title,
	groupId,
	id,
	class: className = "",
	onclick,
	leading,
	trailing,
	children,
}: {
	variant?: GlassButtonVariant;
	size?: GlassButtonSize;
	shape?: GlassButtonShape;
	zone?: GlassZone;
	href?: string;
	target?: string;
	rel?: string;
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	loading?: boolean;
	pressed?: boolean;
	ariaLabel?: string;
	ariaExpanded?: boolean;
	ariaHaspopup?: "menu" | "listbox" | "tree" | "grid" | "dialog" | "true" | "false";
	title?: string;
	groupId?: string;
	id?: string;
	class?: string;
	onclick?: (event: MouseEvent) => void;
	leading?: Snippet;
	trailing?: Snippet;
	children?: Snippet;
} = $props();

const insideGlass = Boolean(getContext<boolean | undefined>(GLASS_SURFACE_CONTEXT_KEY));
const isGhost = $derived(variant === "ghost-on-glass" || insideGlass);
const isLaunch = $derived(variant === "launch-lens");

const surfaceVariant = $derived(
	isLaunch ? "launch-lens" : isGhost ? "note-card" : "floating-chrome",
);
const filterKind = $derived(
	isGhost ? "none" : isLaunch ? "lens" : "pill",
);
const computedRel = $derived(
	rel ?? (target === "_blank" ? "noopener noreferrer" : undefined),
);
</script>

{#if href}
	<a
		{id}
		href={disabled ? undefined : href}
		{target}
		rel={computedRel}
		aria-label={ariaLabel}
		aria-disabled={disabled || loading ? "true" : undefined}
		{title}
		data-lg-interactive="true"
		data-lg-variant={surfaceVariant}
		data-lg-zone={zone}
		data-lg-filter={filterKind}
		data-lg-embedded={isGhost ? "true" : undefined}
		data-lg-btn-variant={variant}
		data-lg-size={size}
		data-lg-shape={shape}
		data-lg-pressed={pressed ? "true" : undefined}
		class={`lg-surface lg-control lg-btn ${className}`.trim()}
		{onclick}
		use:pointerLight={{ enabled: !disabled && !loading, groupId }}
	>
		{#if !isGhost}
			<span class="lg-dimmer" aria-hidden="true"></span>
			<span class="lg-backdrop" aria-hidden="true"></span>
		{/if}
		<span class="lg-tint" aria-hidden="true"></span>
		<span class="lg-rim" aria-hidden="true"></span>
		<span class="lg-specular" aria-hidden="true"></span>
		<span class="lg-content lg-btn__inner">
			{#if leading}<span class="lg-btn__slot">{@render leading()}</span>{/if}
			{#if children}<span class="lg-btn__label">{@render children()}</span>{/if}
			{#if trailing}<span class="lg-btn__slot">{@render trailing()}</span>{/if}
		</span>
	</a>
{:else}
	<button
		{id}
		{type}
		disabled={disabled || loading}
		aria-label={ariaLabel}
		aria-pressed={pressed}
		aria-expanded={ariaExpanded}
		aria-haspopup={ariaHaspopup}
		aria-busy={loading ? "true" : undefined}
		{title}
		data-lg-interactive="true"
		data-lg-variant={surfaceVariant}
		data-lg-zone={zone}
		data-lg-filter={filterKind}
		data-lg-embedded={isGhost ? "true" : undefined}
		data-lg-btn-variant={variant}
		data-lg-size={size}
		data-lg-shape={shape}
		data-lg-pressed={pressed ? "true" : undefined}
		class={`lg-surface lg-control lg-btn ${className}`.trim()}
		{onclick}
		use:pointerLight={{ enabled: !disabled && !loading, groupId }}
	>
		{#if !isGhost}
			<span class="lg-dimmer" aria-hidden="true"></span>
			<span class="lg-backdrop" aria-hidden="true"></span>
		{/if}
		<span class="lg-tint" aria-hidden="true"></span>
		<span class="lg-rim" aria-hidden="true"></span>
		<span class="lg-specular" aria-hidden="true"></span>
		<span class="lg-content lg-btn__inner">
			{#if loading}
				<span class="lg-btn__spinner" aria-hidden="true"></span>
			{:else if leading}
				<span class="lg-btn__slot">{@render leading()}</span>
			{/if}
			{#if children}<span class="lg-btn__label">{@render children()}</span>{/if}
			{#if trailing}<span class="lg-btn__slot">{@render trailing()}</span>{/if}
		</span>
	</button>
{/if}

<style>
	.lg-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
		min-height: 44px;
		min-width: 44px;
		--lg-surface-radius: var(--lg-radius-pill);
		--lg-surface-shadow: var(--lg-elev-2);
	}

	.lg-btn[data-lg-shape="rounded"] {
		--lg-surface-radius: var(--lg-radius-control);
	}

	.lg-btn[data-lg-shape="circle"] {
		--lg-surface-radius: 50%;
		aspect-ratio: 1;
	}

	.lg-btn[data-lg-btn-variant="clear"] {
		--lg-surface-fill: rgba(16, 29, 56, 0.16);
		--lg-blur: 14px;
		--lg-blur-svg: 6px;
		--lg-saturate: 170%;
		--lg-surface-rim: var(--lg-rim-lens);
		text-shadow: 0 1px 10px rgba(8, 17, 34, 0.55);
	}

	.lg-btn[data-lg-btn-variant="clear"][data-lg-zone="moonlight"] {
		--lg-dimmer-bg: var(--lg-scrim-clear-dim);
	}

	.lg-btn[data-lg-btn-variant="tinted"] {
		--lg-surface-fill:
			radial-gradient(120% 100% at 50% 0%, rgba(255, 244, 210, 0.22), transparent 60%),
			rgba(246, 215, 122, 0.24);
		--lg-surface-rim: var(--lg-rim-focus);
		color: #fffaf0;
		text-shadow: 0 1px 8px rgba(24, 18, 8, 0.45);
	}

	.lg-btn[data-lg-btn-variant="ghost-on-glass"] {
		--lg-surface-fill: rgba(185, 216, 232, 0.10);
		--lg-surface-rim: var(--lg-rim-reading);
		--lg-surface-shadow: none;
	}

	.lg-btn[data-lg-btn-variant="launch-lens"] {
		min-height: 54px;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 12px rgba(8, 17, 34, 0.52);
	}

	.lg-btn[data-lg-pressed="true"] {
		--lg-surface-rim: var(--lg-rim-focus);
		--lg-surface-fill: rgba(246, 215, 122, 0.20);
	}

	.lg-btn__inner {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0 18px;
		font-size: var(--lg-text-ui);
		font-weight: 500;
		line-height: 1;
		white-space: nowrap;
	}

	.lg-btn[data-lg-shape="circle"] .lg-btn__inner {
		padding: 0;
	}

	.lg-btn[data-lg-size="sm"] {
		min-height: 36px;
		min-width: 36px;
	}

	.lg-btn[data-lg-size="sm"] .lg-btn__inner {
		padding: 0 12px;
		font-size: 0.8125rem;
		gap: 6px;
	}

	.lg-btn[data-lg-size="lg"] {
		min-height: 50px;
	}

	.lg-btn[data-lg-size="lg"] .lg-btn__inner {
		padding: 0 24px;
		font-size: 0.9375rem;
		gap: 10px;
	}

	.lg-btn[data-lg-size="xl"] {
		min-height: 56px;
	}

	.lg-btn[data-lg-size="xl"] .lg-btn__inner {
		padding: 0 32px;
		font-size: 1rem;
		gap: 10px;
	}

	.lg-btn__slot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}

	.lg-btn__label {
		display: inline-flex;
		align-items: center;
	}

	.lg-btn:disabled,
	.lg-btn[aria-disabled="true"] {
		opacity: 0.45;
		cursor: not-allowed;
		pointer-events: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-btn:hover:not(:disabled) {
			transform: translateY(-1px);
		}
		.lg-btn[data-lg-btn-variant="launch-lens"]:hover:not(:disabled) {
			transform: translateY(-1.5px) scale(1.018);
		}
		.lg-btn[data-lg-btn-variant="ghost-on-glass"]:hover:not(:disabled) {
			--lg-surface-fill: rgba(185, 216, 232, 0.18);
		}
	}

	.lg-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	.lg-btn[data-lg-btn-variant="launch-lens"]:active:not(:disabled) {
		transform: scale(0.955);
	}

	.lg-btn__spinner {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid rgba(238, 246, 251, 0.30);
		border-top-color: var(--lg-firefly-gold);
		animation: lg-spin 720ms linear infinite;
	}

	@keyframes lg-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-btn[data-lg-btn-variant="launch-lens"]:is(:hover, :active):not(:disabled),
		.lg-btn:hover:not(:disabled),
		.lg-btn:active:not(:disabled) {
			transform: none;
		}
	}

	:global(html.motion-reduced) .lg-btn[data-lg-btn-variant="launch-lens"]:is(:hover, :active):not(:disabled) {
		transform: none;
	}
</style>
