<script lang="ts">
import type { Snippet } from "svelte";

let {
	value = $bindable(""),
	name,
	id,
	label,
	placeholder,
	hint,
	error,
	rows = 4,
	maxlength,
	showCount = false,
	disabled = false,
	required = false,
	readonly = false,
	ariaLabel,
	class: className = "",
	oninput,
	onkeydown,
	toolbar,
}: {
	value?: string;
	name?: string;
	id?: string;
	label?: string;
	placeholder?: string;
	hint?: string;
	error?: string;
	rows?: number;
	maxlength?: number;
	showCount?: boolean;
	disabled?: boolean;
	required?: boolean;
	readonly?: boolean;
	ariaLabel?: string;
	class?: string;
	oninput?: (event: Event) => void;
	onkeydown?: (event: KeyboardEvent) => void;
	toolbar?: Snippet;
} = $props();

const fallbackId = `lg-textarea-${Math.random().toString(36).slice(2, 8)}`;
const fieldId = $derived(id ?? fallbackId);
const descId = $derived(error || hint ? `${fieldId}-desc` : undefined);
const charCount = $derived(value.length);
</script>

<div class={`lg-field-wrap ${className}`.trim()} data-lg-interactive="true">
	{#if label}
		<div class="lg-textarea-top">
			<label class="lg-field-label" for={fieldId}>
				{label}
				{#if required}<span class="lg-field-req" aria-hidden="true">*</span>{/if}
			</label>
			{#if showCount}
				<span class="lg-textarea-count" aria-live="polite">
					{charCount}{#if maxlength} / {maxlength}{/if}
				</span>
			{/if}
		</div>
	{/if}

	<div class="lg-textarea-shell" data-error={error ? "true" : undefined} data-disabled={disabled ? "true" : undefined}>
		{#if toolbar}
			<div class="lg-textarea-toolbar">
				{@render toolbar()}
			</div>
		{/if}
		<textarea
			id={fieldId}
			class="lg-field lg-textarea-el"
			bind:value
			{name}
			{rows}
			{placeholder}
			{maxlength}
			{disabled}
			{required}
			{readonly}
			aria-label={ariaLabel}
			aria-invalid={error ? "true" : undefined}
			aria-describedby={descId}
			{oninput}
			{onkeydown}
		></textarea>
	</div>

	{#if error}
		<p id={descId} class="lg-field-msg lg-field-msg--err" role="alert">{error}</p>
	{:else if hint}
		<p id={descId} class="lg-field-msg">{hint}</p>
	{/if}
</div>

<style>
	.lg-field-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.lg-textarea-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.lg-field-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--lg-ink-secondary);
	}

	.lg-field-req {
		color: var(--lg-firefly-gold);
		margin-inline-start: 3px;
	}

	.lg-textarea-count {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.lg-textarea-shell {
		display: flex;
		flex-direction: column;
		border-radius: var(--lg-radius-card);
		background: var(--lg-fill-recessed);
		border: 1px solid var(--lg-separator);
		box-shadow: inset 0 1px 2px rgba(4, 10, 22, 0.36);
		overflow: hidden;
		transition:
			border-color 160ms var(--lg-ease-out),
			background-color 160ms var(--lg-ease-out),
			box-shadow 160ms var(--lg-ease-out);
	}

	.lg-textarea-shell:focus-within {
		background: var(--lg-fill-recessed-focus);
		border-color: var(--lg-moonlight);
		box-shadow:
			inset 0 1px 2px rgba(4, 10, 22, 0.30),
			0 0 0 2px rgba(246, 215, 122, 0.24);
	}

	.lg-textarea-shell[data-error="true"] {
		border-color: var(--lg-status-err);
	}

	.lg-textarea-shell[data-disabled="true"] {
		opacity: 0.5;
	}

	.lg-textarea-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--lg-separator);
		background: rgba(185, 216, 232, 0.05);
	}

	.lg-textarea-el {
		width: 100%;
		min-width: 0;
		border: 0;
		background: transparent;
		color: var(--lg-ink-primary);
		font-family: var(--lg-font-ui);
		font-size: 0.9375rem;
		line-height: 1.65;
		padding: 12px 14px;
		resize: vertical;
		overscroll-behavior: contain;
		outline: none;
	}

	.lg-textarea-el:focus-visible {
		outline: none;
	}

	.lg-textarea-el::placeholder {
		color: var(--lg-ink-tertiary);
	}

	.lg-field-msg {
		margin: 0;
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-field-msg--err {
		color: var(--lg-status-err);
	}

	@media (pointer: coarse) {
		.lg-textarea-el {
			font-size: 16px;
		}
	}
</style>
