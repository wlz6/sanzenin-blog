<script lang="ts">
import type { Snippet } from "svelte";
import { GlassButton, GlassSurface } from "../glass/index.ts";
import type { LaunchTimelineFrame } from "../../lib/liquid-glass/index.ts";

let {
	profileName,
	githubUrl,
	frame,
	active = true,
	reducedMotion = false,
	onLaunch,
	timeChoices,
}: {
	profileName: string;
	githubUrl: string;
	frame: LaunchTimelineFrame;
	active?: boolean;
	reducedMotion?: boolean;
	onLaunch: () => void;
	timeChoices: Snippet<[boolean]>;
} = $props();

const isHidden = $derived(!active && frame.heroOpacity <= 0.01);
const heroTransform = $derived(
	reducedMotion || (frame.heroTranslateY === 0 && frame.heroScale === 1)
		? "none"
		: `translate3d(0, ${frame.heroTranslateY.toFixed(2)}px, 0) scale(${frame.heroScale.toFixed(4)})`,
);
</script>

<section
	class="lg-launch-screen"
	aria-label="湖畔入口"
	aria-hidden={isHidden ? "true" : undefined}
	inert={isHidden || !active}
	style:opacity={frame.heroOpacity.toFixed(4)}
>
	<div class="lg-launch-center" style:transform={heroTransform}>
		<h1 class="lg-launch-id lg-type-hero">{profileName}</h1>
		<div class="lg-launch-action">
			<GlassButton
				variant="launch-lens"
				size="xl"
				zone="forest"
				onclick={onLaunch}
				ariaLabel="进入博客空间"
			>
				Launch
			</GlassButton>
		</div>
	</div>

	<div class="lg-launch-time">
		<GlassSurface variant="dock-pill" zone="forest" elevation={2} pointerGlow={false}>
			{@render timeChoices(true)}
		</GlassSurface>
	</div>

	<!-- 元素 3：GitHub 极简外链（位于右上深色夜空区） -->
	{#if githubUrl}
		<div class="lg-launch-github" style:transform={heroTransform}>
			<GlassButton
				variant="clear"
				size="sm"
				zone="forest"
				href={githubUrl}
				target="_blank"
				rel="noopener noreferrer"
				ariaLabel="访问 GitHub 主页"
			>
				{#snippet leading()}
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
						/>
					</svg>
				{/snippet}
				GitHub
			</GlassButton>
		</div>
	{/if}
</section>

<style>
	.lg-launch-screen {
		position: fixed;
		inset: 0;
		z-index: 25;
		min-height: 100svh;
		pointer-events: none;
	}

	.lg-launch-center {
		position: absolute;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		max-width: min(90vw, 480px);
		text-align: center;
		pointer-events: none;
	}

	.lg-launch-id {
		margin: 0;
		color: var(--lg-moon-core);
		font-weight: 400;
		letter-spacing: -0.025em;
		text-shadow:
			0 2px 26px rgba(8, 17, 34, 0.62),
			0 1px 6px rgba(8, 17, 34, 0.45);
		user-select: none;
		pointer-events: none;
	}

	.lg-launch-action {
		pointer-events: auto;
	}

	.lg-launch-time {
		position: absolute;
		inset-inline: max(12px, var(--lg-safe-left)) max(12px, var(--lg-safe-right));
		bottom: calc(20px + var(--lg-safe-bottom));
		display: flex;
		justify-content: center;
	}

	.lg-launch-time > :global(.lg-surface) {
		pointer-events: auto;
		max-width: 100%;
	}

	.lg-launch-github {
		position: absolute;
		top: calc(22px + var(--lg-safe-top));
		right: calc(26px + var(--lg-safe-right));
		pointer-events: auto;
	}

	@media (max-width: 768px) {
		.lg-launch-center {
			gap: 18px;
		}
		.lg-launch-github {
			top: calc(14px + var(--lg-safe-top));
			right: calc(16px + var(--lg-safe-right));
		}
	}
</style>
