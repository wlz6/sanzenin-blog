<script lang="ts">
import type { Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassElevation, GlassZone } from "./types.ts";

let {
	variant = "floating-chrome",
	zone = "forest",
	elevation = 2,
	focused = false,
	title,
	caption,
	subtitle,
	scrollEdge = "soft",
	id,
	ariaLabel,
	class: className = "",
	bodyClass = "",
	initialScrollTop = 0,
	onScroll,
	onFocus,
	headerActions,
	footer,
	children,
}: {
	variant?: "floating-chrome" | "reading-surface";
	zone?: GlassZone;
	elevation?: GlassElevation;
	focused?: boolean;
	title?: string;
	caption?: string;
	subtitle?: string;
	scrollEdge?: "soft" | "hard" | "none";
	id?: string;
	ariaLabel?: string;
	class?: string;
	bodyClass?: string;
	initialScrollTop?: number;
	onScroll?: (scrollTop: number, scrollLeft: number) => void;
	onFocus?: () => void;
	headerActions?: Snippet;
	footer?: Snippet;
	children?: Snippet;
} = $props();

let bodyEl = $state<HTMLDivElement>();
let edgeTop = $state(false);
let edgeBottom = $state(false);

function updateScrollEdges() {
	if (!bodyEl || scrollEdge === "none") {
		edgeTop = false;
		edgeBottom = false;
		return;
	}
	const { scrollTop, scrollHeight, clientHeight } = bodyEl;
	edgeTop = scrollTop > 4;
	edgeBottom = scrollHeight - clientHeight - scrollTop > 4;
}

$effect(() => {
	const el = bodyEl;
	if (!el) return;
	if (initialScrollTop > 0 && el.scrollTop === 0) {
		el.scrollTop = initialScrollTop;
	}
	updateScrollEdges();
	const ro = new ResizeObserver(updateScrollEdges);
	ro.observe(el);
	return () => ro.disconnect();
});

function handleScroll(event: Event) {
	const target = event.currentTarget as HTMLDivElement;
	updateScrollEdges();
	onScroll?.(target.scrollTop, target.scrollLeft);
}
</script>

<GlassSurface
	as="section"
	{id}
	role="region"
	ariaLabel={ariaLabel ?? title}
	{variant}
	{zone}
	{elevation}
	filter={variant === "floating-chrome" ? "panel" : "none"}
	{focused}
	radius="var(--lg-radius-window)"
	class={`lg-panel ${className}`.trim()}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="lg-panel__shell"
		data-lg-interactive="true"
		onpointerdown={() => onFocus?.()}
	>
		{#if title || caption || headerActions}
			<header class="lg-panel__header">
				<div class="lg-panel__heading">
					{#if caption}<span class="lg-panel__caption lg-type-micro">{caption}</span>{/if}
					{#if title}<h2 class="lg-panel__title">{title}</h2>{/if}
					{#if subtitle}<p class="lg-panel__subtitle">{subtitle}</p>{/if}
				</div>
				{#if headerActions}
					<div class="lg-panel__actions">
						{@render headerActions()}
					</div>
				{/if}
			</header>
		{/if}

		<div
			bind:this={bodyEl}
			class={`lg-panel__body ${scrollEdge !== "none" ? "lg-scroll-edge" : ""} ${scrollEdge === "hard" ? "lg-scroll-edge--hard" : ""} ${bodyClass}`.trim()}
			data-edge-top={edgeTop ? "true" : "false"}
			data-edge-bottom={edgeBottom ? "true" : "false"}
			onscroll={handleScroll}
		>
			{@render children?.()}
		</div>

		{#if footer}
			<footer class="lg-panel__footer">
				{@render footer()}
			</footer>
		{/if}
	</div>
</GlassSurface>

<style>
	:global(.lg-panel) {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	:global(.lg-panel > .lg-content) {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.lg-panel__shell {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.lg-panel__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 18px 22px 14px;
		border-bottom: 1px solid var(--lg-separator);
		flex: none;
	}

	.lg-panel__heading {
		min-width: 0;
		flex: 1;
	}

	.lg-panel__caption {
		display: block;
		color: var(--lg-ink-accent);
		text-transform: uppercase;
		margin-bottom: 4px;
	}

	.lg-panel__title {
		margin: 0;
		font-family: var(--lg-font-display);
		font-size: clamp(1.35rem, 2.2vw, 1.85rem);
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--lg-ink-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lg-panel__subtitle {
		margin: 6px 0 0;
		font-size: var(--lg-text-ui);
		line-height: 1.5;
		color: var(--lg-ink-secondary);
	}

	.lg-panel__actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}

	.lg-panel__body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 18px 22px 24px;
		scrollbar-width: thin;
		scrollbar-color: rgba(185, 216, 232, 0.32) transparent;
	}

	.lg-panel__body::-webkit-scrollbar {
		width: 5px;
	}

	.lg-panel__body::-webkit-scrollbar-thumb {
		background: rgba(185, 216, 232, 0.32);
		border-radius: 999px;
	}

	.lg-panel__footer {
		flex: none;
		padding: 12px 22px;
		border-top: 1px solid var(--lg-separator);
	}

	@media (max-width: 640px) {
		.lg-panel__header {
			padding: 14px 16px 12px;
		}
		.lg-panel__body {
			padding: 14px 16px 20px;
		}
		.lg-panel__footer {
			padding: 10px 16px;
		}
	}
</style>
