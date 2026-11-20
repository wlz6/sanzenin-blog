<script lang="ts">
import { onMount } from "svelte";
import { GlassButton, GlassPopover, type GlassZone } from "../glass/index.ts";
import { authStore } from "./auth-store.svelte.ts";
import ContinueWithGithubButton from "./ContinueWithGithubButton.svelte";

let {
	redirectTo,
	compact = false,
	zone = "forest",
}: {
	redirectTo?: string;
	compact?: boolean;
	zone?: GlassZone;
} = $props();

let popoverOpen = $state(false);
let logoutBusy = $state(false);
let logoutError = $state("");

onMount(() => {
	void authStore.ensureLoaded();
});

async function handleLogout(close: () => void) {
	if (logoutBusy) return;
	logoutBusy = true;
	logoutError = "";
	try {
		await authStore.logout();
		close();
	} catch (err) {
		logoutError = err instanceof Error ? err.message : "退出登录失败";
	} finally {
		logoutBusy = false;
	}
}
</script>

{#if authStore.user}
	{@const user = authStore.user}
	<GlassPopover bind:open={popoverOpen} placement="bottom-end" {zone} ariaLabel="GitHub 账号菜单" class="lg-auth-popover">
		{#snippet trigger({ toggle, open })}
			<button
				type="button"
				class="lg-control lg-auth-chip"
				data-compact={compact ? "true" : undefined}
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label={`当前登录用户 ${user.username}`}
				onclick={toggle}
			>
				{#if user.avatarUrl}
					<img
						src={user.avatarUrl}
						alt={user.displayName || user.username}
						width="26"
						height="26"
						class="lg-auth-chip__avatar"
					/>
				{:else}
					<span class="lg-auth-chip__avatar lg-auth-chip__avatar--fallback" aria-hidden="true">
						{user.username.slice(0, 1).toUpperCase()}
					</span>
				{/if}
				<span class="lg-auth-chip__name">{user.displayName || user.username}</span>
				{#if user.role === "admin"}
					<span class="lg-auth-chip__badge">站长</span>
				{/if}
			</button>
		{/snippet}

		{#snippet children({ close })}
			<div class="lg-auth-menu">
				<div class="lg-auth-menu__profile">
					{#if user.avatarUrl}
						<img
							src={user.avatarUrl}
							alt={user.displayName || user.username}
							width="40"
							height="40"
							class="lg-auth-menu__avatar"
						/>
					{/if}
					<div class="lg-auth-menu__meta">
						<div class="lg-auth-menu__name-row">
							<strong class="lg-auth-menu__display">{user.displayName || user.username}</strong>
							{#if user.role === "admin"}
								<span class="lg-auth-chip__badge">站长</span>
							{/if}
						</div>
						<span class="lg-auth-menu__login">@{user.username}</span>
						<span class="lg-auth-menu__status">已通过 GitHub 登录</span>
					</div>
				</div>

				<div class="lg-auth-menu__actions">
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						href={user.profileUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="lg-auth-menu__btn"
					>
						GitHub 主页
					</GlassButton>
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						loading={logoutBusy}
						onclick={() => void handleLogout(close)}
						class="lg-auth-menu__btn lg-auth-menu__btn--danger"
					>
						退出登录
					</GlassButton>
				</div>

				{#if logoutError}
					<p class="lg-auth-menu__err" role="alert">{logoutError}</p>
				{/if}
			</div>
		{/snippet}
	</GlassPopover>
{:else}
	<ContinueWithGithubButton
		{redirectTo}
		label={compact ? "GitHub 登录" : "Continue with GitHub"}
		size={compact ? "sm" : "md"}
		variant="regular"
	/>
{/if}

<style>
	.lg-auth-chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 4px 12px 4px 6px;
		border-radius: var(--lg-radius-pill);
		border: 1px solid var(--lg-separator-strong);
		background: rgba(16, 36, 52, 0.46);
		color: var(--lg-ink-primary);
		font-family: var(--lg-font-ui);
		font-size: var(--lg-text-ui);
		font-weight: 500;
		cursor: pointer;
	}

	.lg-auth-chip[data-compact="true"] {
		min-height: 36px;
		padding: 3px 10px 3px 5px;
		font-size: 0.8125rem;
	}

	.lg-auth-chip__avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--lg-separator-strong);
		flex: none;
	}

	.lg-auth-chip__avatar--fallback {
		display: grid;
		place-items: center;
		background: var(--lg-accent-soft);
		font-weight: 600;
		font-size: 0.75rem;
	}

	.lg-auth-chip__name {
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lg-auth-chip__badge {
		padding: 1px 7px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-firefly-soft);
		color: var(--lg-firefly-gold);
		font-size: 0.6875rem;
		font-weight: 600;
		flex: none;
	}

	.lg-auth-menu {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 14.5rem;
	}

	.lg-auth-menu__profile {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lg-auth-menu__avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--lg-separator-strong);
		flex: none;
	}

	.lg-auth-menu__meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.lg-auth-menu__name-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.lg-auth-menu__display {
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lg-auth-menu__login,
	.lg-auth-menu__status {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-auth-menu__status {
		color: var(--lg-status-ok);
	}

	.lg-auth-menu__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--lg-separator);
	}

	:global(.lg-auth-popover .lg-popover__surface) {
		--lg-surface-fill: var(--lg-fill-solid);
		--lg-surface-shadow: var(--lg-elev-3);
	}

	:global(.lg-auth-menu__btn) {
		flex: 1 1 auto;
	}

	:global(.lg-auth-menu__btn--danger) {
		color: var(--lg-status-err);
	}

	.lg-auth-menu__err {
		margin: 0;
		font-size: var(--lg-text-micro);
		color: var(--lg-status-err);
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-auth-chip:hover {
			background: rgba(185, 216, 232, 0.16);
			border-color: var(--lg-moonlight);
		}
	}
</style>
