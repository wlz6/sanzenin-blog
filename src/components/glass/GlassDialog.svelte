<script lang="ts">
import { tick, type Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassZone } from "./types.ts";

let {
	open = $bindable(false),
	title,
	description,
	size = "md",
	zone = "forest",
	instant = false,
	closeOnBackdrop = true,
	ariaLabel,
	id,
	class: className = "",
	onClose,
	headerExtra,
	footer,
	children,
}: {
	open?: boolean;
	title?: string;
	description?: string;
	size?: "sm" | "md" | "lg";
	zone?: GlassZone;
	instant?: boolean;
	closeOnBackdrop?: boolean;
	ariaLabel?: string;
	id?: string;
	class?: string;
	onClose?: () => void;
	headerExtra?: Snippet;
	footer?: Snippet;
	children?: Snippet;
} = $props();

let dialogEl = $state<HTMLDivElement>();
let previouslyFocused: HTMLElement | null = null;

function closeDialog() {
	open = false;
	onClose?.();
}

function portal(node: HTMLElement) {
	if (typeof document !== "undefined" && document.body && node.parentNode !== document.body) {
		document.body.appendChild(node);
	}
	return {
		destroy() {
			if (typeof document !== "undefined" && node.parentNode === document.body) {
				node.remove();
			}
		},
	};
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
	return Array.from(
		root.querySelectorAll<HTMLElement>(
			'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
		),
	).filter((el) => el.offsetParent !== null);
}

$effect(() => {
	if (!open || typeof document === "undefined") return;
	previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

	void tick().then(() => {
		if (!dialogEl) return;
		const focusables = getFocusableElements(dialogEl);
		(focusables[0] ?? dialogEl).focus({ preventScroll: true });
	});

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			closeDialog();
			return;
		}
		if (event.key !== "Tab" || !dialogEl) return;
		const focusables = getFocusableElements(dialogEl);
		if (focusables.length === 0) {
			event.preventDefault();
			return;
		}
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	document.addEventListener("keydown", onKeydown);
	return () => {
		document.removeEventListener("keydown", onKeydown);
		if (previouslyFocused && previouslyFocused.isConnected) {
			previouslyFocused.focus({ preventScroll: true });
		}
		previouslyFocused = null;
	};
});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		use:portal
		class="lg-dialog-backdrop"
		data-instant={instant ? "true" : undefined}
		data-lg-interactive="true"
		onpointerdown={(e) => {
			if (closeOnBackdrop && e.target === e.currentTarget) {
				closeDialog();
			}
		}}
	>
		<div
			bind:this={dialogEl}
			{id}
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel ?? title ?? "对话框"}
			tabindex="-1"
			class={`lg-dialog lg-dialog--${size} ${className}`.trim()}
			data-instant={instant ? "true" : undefined}
		>
			<GlassSurface
				variant="floating-chrome"
				{zone}
				elevation={4}
				filter="chrome"
				radius="var(--lg-radius-window)"
				class="lg-dialog__surface"
			>
				{#if title || headerExtra}
					<header class="lg-dialog__header">
						<div class="lg-dialog__titles">
							{#if title}<h2 class="lg-dialog__title">{title}</h2>{/if}
							{#if description}<p class="lg-dialog__desc">{description}</p>{/if}
						</div>
						<div class="lg-dialog__controls">
							{@render headerExtra?.()}
							<button
								type="button"
								class="lg-control lg-dialog__close"
								aria-label="关闭对话框"
								onclick={closeDialog}
							>
								✕
							</button>
						</div>
					</header>
				{/if}

				<div class="lg-dialog__body">
					{@render children?.()}
				</div>

				{#if footer}
					<footer class="lg-dialog__footer">
						{@render footer()}
					</footer>
				{/if}
			</GlassSurface>
		</div>
	</div>
{/if}

<style>
	.lg-dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		padding:
			calc(20px + var(--lg-safe-top))
			calc(16px + var(--lg-safe-right))
			calc(20px + var(--lg-safe-bottom))
			calc(16px + var(--lg-safe-left));
		background: var(--lg-scrim-modal);
		animation: lg-backdrop-in var(--lg-dur-modal) var(--lg-ease-out) both;
	}

	.lg-dialog-backdrop[data-instant="true"] {
		animation-duration: 120ms;
	}

	.lg-dialog {
		width: min(100%, 40rem);
		max-height: min(82dvh, 720px);
		display: flex;
		flex-direction: column;
		transform-origin: center;
		animation: lg-dialog-in var(--lg-dur-modal) var(--lg-ease-out) both;
	}

	.lg-dialog[data-instant="true"] {
		animation-duration: 120ms;
	}

	.lg-dialog--sm {
		width: min(100%, 28rem);
	}

	.lg-dialog--lg {
		width: min(100%, 52rem);
	}

	:global(.lg-dialog__surface) {
		--lg-surface-fill: var(--lg-fill-elevated);
		display: flex;
		flex-direction: column;
		max-height: inherit;
		overflow: hidden;
	}

	:global(.lg-dialog__surface > .lg-content) {
		display: flex;
		flex-direction: column;
		max-height: inherit;
		min-height: 0;
	}

	.lg-dialog__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 20px 24px 14px;
		border-bottom: 1px solid var(--lg-separator);
		flex: none;
	}

	.lg-dialog__titles {
		min-width: 0;
		flex: 1;
	}

	.lg-dialog__title {
		margin: 0;
		font-family: var(--lg-font-display);
		font-size: clamp(1.35rem, 2.2vw, 1.75rem);
		font-weight: 500;
		line-height: 1.18;
		letter-spacing: -0.02em;
		color: var(--lg-ink-primary);
	}

	.lg-dialog__desc {
		margin: 6px 0 0;
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-secondary);
		line-height: 1.5;
	}

	.lg-dialog__controls {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}

	.lg-dialog__close {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border: 1px solid var(--lg-separator);
		border-radius: var(--lg-radius-pill);
		background: rgba(185, 216, 232, 0.10);
		color: var(--lg-ink-primary);
		cursor: pointer;
	}

	.lg-dialog__body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 18px 24px 22px;
	}

	.lg-dialog__footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
		padding: 14px 24px;
		border-top: 1px solid var(--lg-separator);
		flex: none;
	}

	@keyframes lg-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes lg-dialog-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-dialog__close:hover {
			background: rgba(185, 216, 232, 0.20);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-dialog {
			animation: lg-backdrop-in 160ms ease both;
		}
	}
</style>
