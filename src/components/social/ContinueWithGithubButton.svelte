<script lang="ts">
import { onMount } from "svelte";
import { GlassButton } from "../glass/index.ts";
import { authStore } from "./auth-store.svelte.ts";

let {
	redirectTo,
	label = "Continue with GitHub",
	size = "md",
	variant = "regular",
	class: className = "",
}: {
	redirectTo?: string;
	label?: string;
	size?: "sm" | "md" | "lg";
	variant?: "regular" | "clear" | "tinted";
	class?: string;
} = $props();

let configNotice = $state("");

onMount(() => {
	void authStore.ensureLoaded();
});

const loginHref = $derived(
	authStore.oauthConfigured ? authStore.getLoginUrl(redirectTo) : undefined,
);

function handleUnavailableClick() {
	if (authStore.loading) return;
	if (!authStore.oauthConfigured) {
		configNotice =
			"服务端尚未配置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET，暂无法发起 GitHub 登录。";
	}
}
</script>

<div class={`lg-github-login-wrap ${className}`.trim()}>
	<GlassButton
		{variant}
		{size}
		href={loginHref}
		disabled={authStore.loading && !authStore.oauthConfigured}
		ariaLabel={label}
		onclick={loginHref ? undefined : handleUnavailableClick}
	>
		{#snippet leading()}
			<svg
				class="lg-github-icon"
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.65 3.01 8.59 7.19 9.98.53.1.72-.23.72-.51 0-.25-.01-1.08-.01-1.96-2.92.63-3.54-1.24-3.54-1.24-.48-1.21-1.17-1.53-1.17-1.53-.96-.65.07-.64.07-.64 1.06.07 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.09-.68.37-1.15.67-1.41-2.33-.26-4.78-1.17-4.78-5.19 0-1.15.41-2.09 1.09-2.82-.11-.27-.47-1.35.1-2.81 0 0 .89-.28 2.91 1.08a10.1 10.1 0 0 1 5.3 0c2.02-1.36 2.91-1.08 2.91-1.08.57 1.46.21 2.54.1 2.81.68.73 1.09 1.67 1.09 2.82 0 4.03-2.45 4.92-4.79 5.18.38.33.71.97.71 1.96 0 1.42-.01 2.56-.01 2.91 0 .28.19.62.73.51A10.5 10.5 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5Z"
				/>
			</svg>
		{/snippet}
		{label}
	</GlassButton>

	{#if configNotice}
		<p class="lg-github-login-notice" role="status">{configNotice}</p>
	{/if}
</div>

<style>
	.lg-github-login-wrap {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		max-width: 100%;
	}

	.lg-github-icon {
		display: block;
		flex: none;
	}

	.lg-github-login-notice {
		margin: 0;
		padding: 6px 10px;
		border-radius: var(--lg-radius-xs);
		background: rgba(246, 215, 122, 0.12);
		border: 1px solid rgba(246, 215, 122, 0.28);
		color: var(--lg-firefly-gold);
		font-size: var(--lg-text-micro);
		line-height: 1.5;
	}
</style>
