<script lang="ts">
import type { Snippet } from "svelte";

let {
	value = $bindable(""),
	type = "text",
	name,
	id,
	label,
	placeholder,
	hint,
	error,
	disabled = false,
	required = false,
	readonly = false,
	maxlength,
	autocomplete,
	inputmode,
	enterkeyhint,
	ariaLabel,
	class: className = "",
	oninput,
	onchange,
	onkeydown,
	leading,
	trailing,
}: {
	value?: string;
	type?: "text" | "search" | "email" | "url" | "password" | "tel" | "number";
	name?: string;
	id?: string;
	label?: string;
	placeholder?: string;
	hint?: string;
	error?: string;
	disabled?: boolean;
	required?: boolean;
	readonly?: boolean;
	maxlength?: number;
	autocomplete?: HTMLInputElement["autocomplete"];
	inputmode?: HTMLInputElement["inputMode"];
	enterkeyhint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
	ariaLabel?: string;
	class?: string;
	oninput?: (event: Event) => void;
	onchange?: (event: Event) => void;
	onkeydown?: (event: KeyboardEvent) => void;
	leading?: Snippet;
	trailing?: Snippet;
} = $props();

const fallbackId = `lg-input-${Math.random().toString(36).slice(2, 8)}`;
const fieldId = $derived(id ?? fallbackId);
const descId = $derived(error || hint ? `${fieldId}-desc` : undefined);
</script>

<div class={`lg-field-wrap ${className}`.trim()} data-lg-interactive="true">
	{#if label}
		<label class="lg-field-label" for={fieldId}>
			{label}
			{#if required}<span class="lg-field-req" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<div class="lg-input-shell" data-error={error ? "true" : undefined} data-disabled={disabled ? "true" : undefined}>
		{#if leading}
			<span class="lg-input-slot">{@render leading()}</span>
		{/if}
		<input
			id={fieldId}
			class="lg-field lg-input-el"
			bind:value
			{type}
			{name}
			{placeholder}
			{disabled}
			{required}
			{readonly}
			{maxlength}
			{autocomplete}
			{inputmode}
			{enterkeyhint}
			aria-label={ariaLabel}
			aria-invalid={error ? "true" : undefined}
			aria-describedby={descId}
			{oninput}
			{onchange}
			{onkeydown}
		/>
		{#if trailing}
			<span class="lg-input-slot">{@render trailing()}</span>
		{/if}
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

	.lg-field-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--lg-ink-secondary);
	}

	.lg-field-req {
		color: var(--lg-firefly-gold);
		margin-inline-start: 3px;
	}

	/* 嵌入式凹槽材质，不叠加二次 backdrop-filter */
	.lg-input-shell {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 12px;
		border-radius: var(--lg-radius-control);
		background: var(--lg-fill-recessed);
		border: 1px solid var(--lg-separator);
		box-shadow: inset 0 1px 2px rgba(4, 10, 22, 0.36);
		transition:
			border-color 160ms var(--lg-ease-out),
			background-color 160ms var(--lg-ease-out),
			box-shadow 160ms var(--lg-ease-out);
	}

	.lg-input-shell:focus-within {
		background: var(--lg-fill-recessed-focus);
		border-color: var(--lg-moonlight);
		box-shadow:
			inset 0 1px 2px rgba(4, 10, 22, 0.30),
			0 0 0 2px rgba(246, 215, 122, 0.24);
	}

	.lg-input-shell[data-error="true"] {
		border-color: var(--lg-status-err);
	}

	.lg-input-shell[data-disabled="true"] {
		opacity: 0.5;
	}

	.lg-input-el {
		flex: 1;
		min-width: 0;
		width: 100%;
		border: 0;
		background: transparent;
		color: var(--lg-ink-primary);
		font-family: var(--lg-font-ui);
		font-size: 0.9375rem;
		line-height: 1.4;
		padding: 10px 0;
		outline: none;
	}

	.lg-input-el:focus-visible {
		outline: none;
	}

	.lg-input-el::placeholder {
		color: var(--lg-ink-tertiary);
	}

	.lg-input-slot {
		display: inline-flex;
		align-items: center;
		color: var(--lg-ink-tertiary);
		flex: none;
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
		.lg-input-el {
			font-size: 16px;
		}
	}
</style>
