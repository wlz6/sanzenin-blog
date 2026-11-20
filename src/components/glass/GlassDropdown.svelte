<script lang="ts">
import { tick, type Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassDropdownItem, GlassPlacement, GlassZone } from "./types.ts";

let {
	open = $bindable(false),
	items,
	selectedId,
	placement = "bottom-end",
	zone = "forest",
	ariaLabel = "下拉菜单",
	class: className = "",
	onSelect,
	onClose,
	trigger,
}: {
	open?: boolean;
	items: readonly GlassDropdownItem[];
	selectedId?: string;
	placement?: GlassPlacement;
	zone?: GlassZone;
	ariaLabel?: string;
	class?: string;
	onSelect?: (item: GlassDropdownItem) => void;
	onClose?: () => void;
	trigger?: Snippet<[{ toggle: () => void; open: boolean }]>;
} = $props();

let rootEl = $state<HTMLDivElement>();
let menuEl = $state<HTMLDivElement>();
let activeIndex = $state(-1);

const originMap: Record<GlassPlacement, string> = {
	"bottom-start": "top left",
	"bottom-center": "top center",
	"bottom-end": "top right",
	"top-start": "bottom left",
	"top-center": "bottom center",
	"top-end": "bottom right",
};

const transformOrigin = $derived(originMap[placement]);

function firstEnabledIndex(from = 0, step = 1): number {
	const count = items.length;
	if (count === 0) return -1;
	for (let i = 0; i < count; i++) {
		const idx = (from + i * step + count) % count;
		if (!items[idx].disabled) return idx;
	}
	return -1;
}

function close() {
	if (!open) return;
	open = false;
	activeIndex = -1;
	onClose?.();
}

function toggle() {
	if (open) close();
	else open = true;
}

function focusItem(index: number) {
	if (index < 0 || !menuEl) return;
	activeIndex = index;
	const el = menuEl.querySelector<HTMLButtonElement>(`[data-item-index="${index}"]`);
	el?.focus({ preventScroll: true });
}

function selectItem(item: GlassDropdownItem) {
	if (item.disabled) return;
	onSelect?.(item);
	close();
}

$effect(() => {
	if (!open || typeof document === "undefined") return;

	void tick().then(() => {
		const selectedIdx = selectedId
			? items.findIndex((item) => item.id === selectedId && !item.disabled)
			: -1;
		focusItem(selectedIdx >= 0 ? selectedIdx : firstEnabledIndex(0, 1));
	});

	const onPointerDown = (event: PointerEvent) => {
		if (rootEl && event.target instanceof Node && !rootEl.contains(event.target)) {
			close();
		}
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			close();
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			focusItem(firstEnabledIndex(activeIndex + 1, 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			focusItem(firstEnabledIndex(activeIndex <= 0 ? items.length - 1 : activeIndex - 1, -1));
		} else if (event.key === "Home") {
			event.preventDefault();
			focusItem(firstEnabledIndex(0, 1));
		} else if (event.key === "End") {
			event.preventDefault();
			focusItem(firstEnabledIndex(items.length - 1, -1));
		} else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			const lower = event.key.toLowerCase();
			const match = items.findIndex(
				(item, idx) =>
					idx > activeIndex &&
					!item.disabled &&
					item.label.toLowerCase().startsWith(lower),
			);
			const fallback =
				match >= 0
					? match
					: items.findIndex(
							(item) => !item.disabled && item.label.toLowerCase().startsWith(lower),
						);
			if (fallback >= 0) {
				event.preventDefault();
				focusItem(fallback);
			}
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

<div bind:this={rootEl} class={`lg-dropdown-anchor ${className}`.trim()} data-lg-interactive="true">
	{@render trigger?.({ toggle, open })}

	{#if open}
		<div
			bind:this={menuEl}
			class={`lg-dropdown lg-dropdown--${placement}`}
			style={`--lg-origin: ${transformOrigin};`}
			role="menu"
			aria-label={ariaLabel}
		>
			<GlassSurface
				variant="floating-chrome"
				{zone}
				elevation={3}
				filter="chrome"
				radius="var(--lg-radius-panel)"
				class="lg-dropdown__surface"
			>
				<div class="lg-dropdown__list">
					{#each items as item, idx (item.id)}
						{#if item.dividerBefore && idx > 0}
							<div class="lg-dropdown__divider" role="separator"></div>
						{/if}
						<button
							type="button"
							role="menuitem"
							disabled={item.disabled}
							data-item-index={idx}
							data-selected={item.id === selectedId ? "true" : undefined}
							data-danger={item.danger ? "true" : undefined}
							class="lg-control lg-dropdown__item"
							onclick={() => selectItem(item)}
						>
							{#if item.icon}
								<span class="lg-dropdown__icon" aria-hidden="true">{item.icon}</span>
							{/if}
							<span class="lg-dropdown__text">
								<span class="lg-dropdown__label">{item.label}</span>
								{#if item.description}
									<span class="lg-dropdown__desc">{item.description}</span>
								{/if}
							</span>
							{#if item.shortcut}
								<kbd class="lg-dropdown__kbd">{item.shortcut}</kbd>
							{:else if item.id === selectedId}
								<span class="lg-dropdown__check" aria-hidden="true">✓</span>
							{/if}
						</button>
					{/each}
				</div>
			</GlassSurface>
		</div>
	{/if}
</div>

<style>
	.lg-dropdown-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.lg-dropdown {
		position: absolute;
		z-index: 62;
		min-width: 13.5rem;
		max-width: min(20rem, calc(100vw - 24px));
		transform-origin: var(--lg-origin, top right);
		animation: lg-dropdown-in var(--lg-dur-dropdown) var(--lg-ease-out) both;
	}

	.lg-dropdown--bottom-start { top: calc(100% + 8px); left: 0; }
	.lg-dropdown--bottom-center { top: calc(100% + 8px); left: 50%; translate: -50% 0; }
	.lg-dropdown--bottom-end { top: calc(100% + 8px); right: 0; }
	.lg-dropdown--top-start { bottom: calc(100% + 8px); left: 0; }
	.lg-dropdown--top-center { bottom: calc(100% + 8px); left: 50%; translate: -50% 0; }
	.lg-dropdown--top-end { bottom: calc(100% + 8px); right: 0; }

	:global(.lg-dropdown__surface) {
		--lg-surface-fill: var(--lg-fill-elevated);
		overflow: hidden;
	}

	.lg-dropdown__list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
	}

	.lg-dropdown__divider {
		height: 1px;
		margin: 4px 8px;
		background: var(--lg-separator);
	}

	.lg-dropdown__item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 40px;
		padding: 8px 12px;
		border: 0;
		border-radius: var(--lg-radius-control);
		background: transparent;
		color: var(--lg-ink-primary);
		text-align: start;
		cursor: pointer;
	}

	.lg-dropdown__item[data-selected="true"] {
		background: var(--lg-accent-soft);
	}

	.lg-dropdown__item[data-danger="true"] {
		color: var(--lg-status-err);
	}

	.lg-dropdown__item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.lg-dropdown__icon {
		width: 18px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		font-size: 0.95rem;
	}

	.lg-dropdown__text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lg-dropdown__label {
		font-size: var(--lg-text-ui);
		font-weight: 500;
		line-height: 1.25;
	}

	.lg-dropdown__desc {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		line-height: 1.3;
	}

	.lg-dropdown__kbd {
		font-family: var(--lg-font-mono);
		font-size: 0.6875rem;
		padding: 2px 6px;
		border-radius: 6px;
		background: rgba(185, 216, 232, 0.12);
		color: var(--lg-ink-secondary);
		flex: none;
	}

	.lg-dropdown__check {
		color: var(--lg-firefly-gold);
		font-size: 0.875rem;
		flex: none;
	}

	@keyframes lg-dropdown-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-dropdown__item:hover:not(:disabled) {
			background: var(--lg-fill-note-hover);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-dropdown {
			animation: lg-dropdown-fade 140ms ease both;
		}
		@keyframes lg-dropdown-fade {
			from { opacity: 0; }
			to { opacity: 1; }
		}
	}
</style>
