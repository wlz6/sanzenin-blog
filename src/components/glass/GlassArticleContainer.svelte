<script lang="ts">
import type { Snippet } from "svelte";
import GlassButton from "./GlassButton.svelte";
import GlassPopover from "./GlassPopover.svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassTocItem } from "./types.ts";

let {
	title,
	subtitle,
	published,
	updated,
	readingMinutes,
	words,
	category,
	tags = [],
	toc = [],
	activeHeadingId,
	backLabel = "返回文章列表",
	backHref = "/blog",
	class: className = "",
	onBack,
	onSelectHeading,
	headerExtra,
	footer,
	comments,
	children,
}: {
	title: string;
	subtitle?: string;
	published?: string;
	updated?: string;
	readingMinutes?: number;
	words?: number;
	category?: string;
	tags?: readonly string[];
	toc?: readonly GlassTocItem[];
	activeHeadingId?: string;
	backLabel?: string;
	backHref?: string;
	class?: string;
	onBack?: (event: MouseEvent) => void;
	onSelectHeading?: (item: GlassTocItem) => void;
	headerExtra?: Snippet;
	footer?: Snippet;
	comments?: Snippet;
	children?: Snippet;
} = $props();

let mobileTocOpen = $state(false);

function handleHeadingSelect(item: GlassTocItem, close?: () => void) {
	if (onSelectHeading) {
		onSelectHeading(item);
	} else if (typeof document !== "undefined") {
		const target = document.getElementById(item.id);
		if (target) {
			const reduced =
				window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
				document.documentElement.classList.contains("motion-reduced");
			target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
		}
	}
	close?.();
}
</script>

<div class={`lg-article-layout ${className}`.trim()}>
	<GlassSurface
		as="article"
		variant="reading-surface"
		zone="reading"
		elevation={4}
		pointerGlow={false}
		radius="var(--lg-radius-window)"
		class="lg-article"
	>
		<div class="lg-article__inner">
			<div class="lg-article__topbar" data-lg-interactive="true">
				<GlassButton
					variant="ghost-on-glass"
					size="sm"
					href={backHref}
					onclick={onBack}
				>
					← {backLabel}
				</GlassButton>

				<div class="lg-article__topbar-right">
					{@render headerExtra?.()}
					{#if toc.length > 0}
						<div class="lg-article__mobile-toc">
							<GlassPopover bind:open={mobileTocOpen} placement="bottom-end" title="目录">
								{#snippet trigger({ toggle, open })}
									<GlassButton
										variant="ghost-on-glass"
										size="sm"
										pressed={open}
										onclick={toggle}
										ariaLabel="打开文章目录"
									>
										目录 ({toc.length})
									</GlassButton>
								{/snippet}
								{#snippet children({ close })}
									<nav aria-label="文章目录" class="lg-toc-list">
										{#each toc as item (item.id)}
											<button
												type="button"
												class="lg-control lg-toc-item"
												data-depth={Math.min(4, Math.max(1, item.depth))}
												data-active={activeHeadingId === item.id ? "true" : undefined}
												onclick={() => handleHeadingSelect(item, close)}
											>
												{item.text}
											</button>
										{/each}
									</nav>
								{/snippet}
							</GlassPopover>
						</div>
					{/if}
				</div>
			</div>

			<header class="lg-article__header">
				<div class="lg-article__meta">
					{#if category}<span class="lg-article__category">{category}</span>{/if}
					{#if published}<time datetime={published}>{published}</time>{/if}
					{#if updated && updated !== published}<span>更新于 {updated}</span>{/if}
					{#if readingMinutes}<span>约 {readingMinutes} 分钟</span>{/if}
					{#if words}<span>{words} 字</span>{/if}
				</div>
				<h1 class="lg-article__title lg-type-h1">{title}</h1>
				{#if subtitle}<p class="lg-article__subtitle">{subtitle}</p>{/if}
				{#if tags.length > 0}
					<ul class="lg-article__tags" aria-label="文章标签">
						{#each tags as tag (tag)}
							<li class="lg-article__tag">#{tag}</li>
						{/each}
					</ul>
				{/if}
			</header>

			<div class="lg-article__prose">
				{@render children?.()}
			</div>

			{#if footer}
				<footer class="lg-article__footer">
					{@render footer()}
				</footer>
			{/if}

			{#if comments}
				<section class="lg-article__comments" aria-label="文章评论">
					{@render comments()}
				</section>
			{/if}
		</div>
	</GlassSurface>

	{#if toc.length > 0}
		<aside class="lg-article__rail" aria-label="文章目录">
			<GlassSurface
				variant="floating-chrome"
				zone="forest"
				elevation={2}
				filter="chrome"
				radius="var(--lg-radius-panel)"
				class="lg-toc-card"
			>
				<div class="lg-toc-head lg-type-micro">目录</div>
				<nav class="lg-toc-list">
					{#each toc as item (item.id)}
						<button
							type="button"
							class="lg-control lg-toc-item"
							data-depth={Math.min(4, Math.max(1, item.depth))}
							data-active={activeHeadingId === item.id ? "true" : undefined}
							onclick={() => handleHeadingSelect(item)}
						>
							{item.text}
						</button>
					{/each}
				</nav>
			</GlassSurface>
		</aside>
	{/if}
</div>

<style>
	.lg-article-layout {
		display: grid;
		grid-template-columns: minmax(0, 780px);
		justify-content: center;
		align-items: start;
		gap: 24px;
		width: 100%;
		max-width: 1120px;
		margin-inline: auto;
	}

	@media (min-width: 1200px) {
		.lg-article-layout:has(.lg-article__rail) {
			grid-template-columns: minmax(0, 780px) 260px;
		}
	}

	:global(.lg-article) {
		width: 100%;
	}

	.lg-article__inner {
		padding: clamp(20px, 3.2vw, 40px);
	}

	.lg-article__topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 24px;
	}

	.lg-article__topbar-right {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.lg-article__mobile-toc {
		display: inline-flex;
	}

	.lg-article__rail {
		display: none;
		position: sticky;
		top: calc(76px + var(--lg-safe-top));
	}

	@media (min-width: 1200px) {
		.lg-article__mobile-toc {
			display: none;
		}
		.lg-article__rail {
			display: block;
		}
	}

	.lg-article__header {
		padding-bottom: 22px;
		border-bottom: 1px solid var(--lg-separator);
		margin-bottom: 28px;
	}

	.lg-article__meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 14px;
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		margin-bottom: 12px;
	}

	.lg-article__category {
		color: var(--lg-firefly-gold);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.lg-article__title {
		margin: 0;
		color: var(--lg-ink-primary);
	}

	.lg-article__subtitle {
		margin: 12px 0 0;
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--lg-ink-secondary);
	}

	.lg-article__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.lg-article__tag {
		padding: 3px 10px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-fill-note-embedded);
		border: 1px solid var(--lg-separator);
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
	}

	/* 长文高对比度深读排版：零装饰滚动动画，强制文本可选 */
	.lg-article__prose {
		max-width: 76ch;
		font-size: var(--lg-text-body);
		line-height: 1.78;
		color: var(--lg-ink-primary);
		user-select: text;
		-webkit-user-select: text;
		overflow-wrap: anywhere;
	}

	.lg-article__prose :global(p) {
		margin: 0 0 1.25em;
	}

	.lg-article__prose :global(h2) {
		margin: 2em 0 0.75em;
		font-family: var(--lg-font-display);
		font-size: var(--lg-text-h2);
		line-height: 1.24;
		letter-spacing: -0.015em;
		color: var(--lg-ink-primary);
	}

	.lg-article__prose :global(h3) {
		margin: 1.6em 0 0.6em;
		font-size: var(--lg-text-h3);
		line-height: 1.35;
		font-weight: 600;
		color: var(--lg-ink-primary);
	}

	.lg-article__prose :global(a) {
		color: var(--lg-moonlight);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.lg-article__prose :global(blockquote) {
		margin: 1.4em 0;
		padding: 12px 16px;
		border-inline-start: 3px solid var(--lg-firefly-gold);
		background: rgba(185, 216, 232, 0.06);
		border-radius: 0 var(--lg-radius-control) var(--lg-radius-control) 0;
		color: var(--lg-ink-secondary);
	}

	.lg-article__prose :global(:not(pre) > code) {
		font-family: var(--lg-font-mono);
		font-size: 0.88em;
		padding: 2px 6px;
		border-radius: 6px;
		background: var(--lg-fill-code);
		color: var(--lg-ink-primary);
	}

	.lg-article__prose :global(pre) {
		max-width: 100%;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		padding: 16px 18px;
		border-radius: var(--lg-radius-card);
		background: var(--lg-fill-code);
		border: 1px solid var(--lg-separator);
		font-family: var(--lg-font-mono);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.lg-article__prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--lg-radius-card);
	}

	.lg-article__prose :global(table) {
		display: block;
		max-width: 100%;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		border-collapse: collapse;
	}

	.lg-article__prose :global(.katex-display) {
		max-width: 100%;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
	}

	.lg-article__footer {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px solid var(--lg-separator);
	}

	.lg-article__comments {
		margin-top: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--lg-separator);
	}

	:global(.lg-toc-card) {
		padding: 14px;
		max-height: calc(100dvh - 130px);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.lg-toc-head {
		color: var(--lg-ink-tertiary);
		text-transform: uppercase;
		margin-bottom: 10px;
		padding-inline: 8px;
	}

	.lg-toc-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lg-toc-item {
		width: 100%;
		text-align: start;
		border: 0;
		border-radius: var(--lg-radius-xs);
		background: transparent;
		color: var(--lg-ink-secondary);
		padding: 6px 8px;
		font-size: 0.8125rem;
		line-height: 1.4;
		cursor: pointer;
		transition:
			background-color 150ms var(--lg-ease-out),
			color 150ms var(--lg-ease-out);
	}

	.lg-toc-item[data-depth="3"] { padding-inline-start: 18px; }
	.lg-toc-item[data-depth="4"] { padding-inline-start: 28px; }

	.lg-toc-item[data-active="true"] {
		background: var(--lg-firefly-soft);
		color: var(--lg-firefly-gold);
		font-weight: 500;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-toc-item:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
	}
</style>
