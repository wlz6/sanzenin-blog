<script lang="ts">
import { getContext, setContext, type Snippet } from "svelte";
import {
	GLASS_SURFACE_CONTEXT_KEY,
	pointerLight,
} from "../../lib/liquid-glass/index.ts";
import type {
	GlassElevation,
	GlassFilterKind,
	GlassVariant,
	GlassZone,
} from "./types.ts";

let {
	as = "div",
	variant = "floating-chrome",
	zone = "forest",
	elevation = 2,
	filter,
	focused = false,
	interactive = false,
	embedded,
	pointerGlow = true,
	groupId,
	radius,
	id,
	role,
	ariaLabel,
	class: className = "",
	style: styleAttr = "",
	children,
}: {
	as?: "div" | "section" | "article" | "aside" | "header" | "nav" | "footer";
	variant?: GlassVariant;
	zone?: GlassZone;
	elevation?: GlassElevation;
	filter?: GlassFilterKind;
	focused?: boolean;
	interactive?: boolean;
	embedded?: boolean;
	pointerGlow?: boolean;
	groupId?: string;
	radius?: string;
	id?: string;
	role?: string;
	ariaLabel?: string;
	class?: string;
	style?: string;
	children?: Snippet;
} = $props();

const insideGlass = Boolean(getContext<boolean | undefined>(GLASS_SURFACE_CONTEXT_KEY));
setContext(GLASS_SURFACE_CONTEXT_KEY, true);

const isEmbedded = $derived(embedded ?? insideGlass);
const resolvedFilter = $derived.by<GlassFilterKind>(() => {
	if (isEmbedded || variant === "reading-surface" || variant === "note-card") return "none";
	if (filter) return filter;
	if (variant === "launch-lens") return "lens";
	if (variant === "dock-pill") return "pill";
	return "chrome";
});

const lightEnabled = $derived(
	pointerGlow && !isEmbedded && variant !== "reading-surface",
);

const mergedStyle = $derived(
	[radius ? `--lg-surface-radius: ${radius};` : "", styleAttr]
		.filter(Boolean)
		.join(" "),
);
</script>

<svelte:element
	this={as}
	{id}
	{role}
	aria-label={ariaLabel}
	class={`lg-surface ${className}`.trim()}
	style={mergedStyle || undefined}
	data-lg-variant={variant}
	data-lg-zone={zone}
	data-lg-elevation={elevation}
	data-lg-filter={resolvedFilter}
	data-lg-focused={focused ? "true" : undefined}
	data-lg-embedded={isEmbedded ? "true" : undefined}
	data-lg-interactive={interactive ? "true" : undefined}
	use:pointerLight={{ enabled: lightEnabled, groupId }}
>
	{#if !isEmbedded}
		<span class="lg-dimmer" aria-hidden="true"></span>
		<span class="lg-backdrop" aria-hidden="true"></span>
	{/if}
	<span class="lg-tint" aria-hidden="true"></span>
	<span class="lg-rim" aria-hidden="true"></span>
	{#if lightEnabled}
		<span class="lg-specular" aria-hidden="true"></span>
	{/if}
	<div class="lg-content">
		{@render children?.()}
	</div>
</svelte:element>
