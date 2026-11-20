<script lang="ts">
import { onMount, type Snippet } from "svelte";
import {
	GlassButton,
	GlassDialog,
	GlassDock,
	GlassNavigation,
	GlassPopover,
	GlassSurface,
	type GlassBreadcrumbItem,
	type GlassDockItem,
	type GlassTocItem,
} from "../glass/index.ts";
import { ArticleComments, AuthStatusMenu } from "../social/index.ts";
import { sceneBridge } from "../../scene/scene-bridge.ts";

let {
	siteMeta,
	title = "",
	postCategory = "",
	headings = [],
	postSlug,
	isPost = false,
	children,
}: {
	siteMeta: {
		siteTitle: string;
		profileName: string;
		githubUrl: string;
	};
	title?: string;
	postCategory?: string;
	headings?: readonly { depth: number; slug: string; text: string }[];
	postSlug?: string;
	isPost?: boolean;
	children?: Snippet;
} = $props();

const DOCK_ITEMS: readonly GlassDockItem[] = [
	{ id: "blog", label: "Blog", href: "/blog/", icon: "✦", ariaLabel: "Blog · 文章" },
	{ id: "projects", label: "Projects", href: "/projects/", icon: "⌘", ariaLabel: "Projects · 项目" },
	{ id: "gallery", label: "Gallery", href: "/gallery/", icon: "◈", ariaLabel: "Gallery · 画廊" },
	{ id: "about", label: "About", href: "/about/", icon: "☾", ariaLabel: "About · 关于" },
	{ id: "guestbook", label: "Guestbook", href: "/guestbook/", icon: "✎", ariaLabel: "Guestbook · 留言板" },
];

let articleSlotEl = $state<HTMLDivElement>();
let tocItems = $state<GlassTocItem[]>([]);
let activeHeadingId = $state<string | undefined>(undefined);
let readingProgress = $state(0);
let pageScrollTop = $state(0);
let mobileTocOpen = $state(false);
let currentPath = $state(typeof window !== "undefined" ? window.location.pathname : "/blog/");
let lightboxSrc = $state<string | null>(null);
let lightboxAlt = $state("");

const breadcrumbs = $derived.by<GlassBreadcrumbItem[]>(() => {
	const list: GlassBreadcrumbItem[] = [{ label: "← Blog", href: "/blog/" }];
	if (postCategory) {
		list.push({
			label: postCategory,
			href: `/blog/?category=${encodeURIComponent(postCategory)}`,
		});
	}
	if (title) {
		list.push({ label: title });
	}
	return list;
});

function extractToc(): GlassTocItem[] {
	const fromProps = headings
		.filter((h) => h.depth >= 2 && h.depth <= 3 && h.slug && h.text)
		.map((h) => ({
			id: h.slug,
			text: h.text.replace(/\s*#+$/, "").trim(),
			depth: h.depth,
		}));
	if (fromProps.length > 0) return fromProps;
	if (!articleSlotEl) return [];

	const nodes = articleSlotEl.querySelectorAll<HTMLElement>("h2[id], h3[id]");
	return Array.from(nodes).map((el) => ({
		id: el.id,
		text: (el.textContent ?? "").replace(/\s*#+$/, "").trim(),
		depth: el.tagName === "H2" ? 2 : 3,
	}));
}

function jumpToHeading(item: GlassTocItem, close?: () => void) {
	const target = document.getElementById(item.id);
	if (target) {
		const reduced =
			window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
			document.documentElement.classList.contains("motion-reduced");
		target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
		activeHeadingId = item.id;
	}
	close?.();
}

function scrollToTop() {
	const reduced =
		window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
		document.documentElement.classList.contains("motion-reduced");
	window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

function handleArticleClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLImageElement)) return;
	// 若图片由外层链接或 Fancybox 接管，保留其原生行为
	if (target.closest("a[href], [data-fancybox]")) return;
	if (target.naturalWidth < 120) return;
	lightboxSrc = target.currentSrc || target.src;
	lightboxAlt = target.alt || title || "文章配图";
}

onMount(() => {
	currentPath = window.location.pathname;
	document.documentElement.dataset.etherealMode = "reading";

	// 深度阅读态：柔和压暗与摄影景深，降低视觉干扰
	sceneBridge.setInteractionMode("reading");
	sceneBridge.setCameraTransition(1);
	sceneBridge.setOpticalBlur(isPost ? 0.44 : 0.62, 0.28);

	tocItems = extractToc();

	const updateScroll = () => {
		const top = Math.max(window.scrollY, document.documentElement.scrollTop);
		pageScrollTop = top;
		const maxScroll = Math.max(
			1,
			document.documentElement.scrollHeight - window.innerHeight,
		);
		readingProgress = Math.max(0, Math.min(1, top / maxScroll));
	};
	updateScroll();
	window.addEventListener("scroll", updateScroll, { passive: true });
	window.addEventListener("resize", updateScroll, { passive: true });

	let observer: IntersectionObserver | null = null;
	if (tocItems.length > 0 && typeof IntersectionObserver !== "undefined") {
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.target.id) {
						activeHeadingId = entry.target.id;
						break;
					}
				}
			},
			{ rootMargin: "-90px 0px -68% 0px", threshold: 0 },
		);
		for (const item of tocItems) {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		}
	}

	return () => {
		window.removeEventListener("scroll", updateScroll);
		window.removeEventListener("resize", updateScroll);
		observer?.disconnect();
	};
});
</script>

<div class="lg-reading-page" data-reading-post={isPost ? "true" : "false"}>
	<GlassNavigation
		brand={siteMeta.profileName}
		brandHref="/"
		{breadcrumbs}
		progress={isPost ? readingProgress : undefined}
		zone="forest"
		compact={true}
	>
		{#snippet trailing()}
			{#if tocItems.length > 0}
				<div class="lg-reading-mobile-toc">
					<GlassPopover bind:open={mobileTocOpen} placement="bottom-end" title="文章目录">
						{#snippet trigger({ toggle, open })}
							<GlassButton
								variant="ghost-on-glass"
								size="sm"
								pressed={open}
								onclick={toggle}
								ariaLabel="打开文章目录"
							>
								目录
							</GlassButton>
						{/snippet}
						{#snippet children({ close })}
							<nav aria-label="文章目录" class="lg-reading-toc-list">
								{#each tocItems as item (item.id)}
									<button
										type="button"
										class="lg-control lg-reading-toc-item"
										data-depth={item.depth}
										data-active={activeHeadingId === item.id ? "true" : undefined}
										onclick={() => jumpToHeading(item, close)}
									>
										{item.text}
									</button>
								{/each}
							</nav>
						{/snippet}
					</GlassPopover>
				</div>
			{/if}
			<AuthStatusMenu redirectTo={currentPath} compact zone="forest" />
		{/snippet}
	</GlassNavigation>

	<div class="lg-reading-grid" class:has-toc={tocItems.length > 0}>
		<GlassSurface
			as="article"
			variant="reading-surface"
			zone="reading"
			elevation={4}
			pointerGlow={false}
			radius="var(--lg-radius-window)"
			class={isPost ? "lg-reading-surface lg-post-glass" : "lg-reading-surface"}
		>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				id="lg-article-slot"
				bind:this={articleSlotEl}
				class="lg-reading-slot"
				onclick={handleArticleClick}
			>
				{@render children?.()}
			</div>

			{#if isPost && postSlug}
				<section class="lg-reading-comments" aria-label="文章评论区">
					<ArticleComments slug={postSlug} articleTitle={title} />
				</section>
			{/if}
		</GlassSurface>

		{#if tocItems.length > 0}
			<aside class="lg-reading-rail" aria-label="文章目录">
				<GlassSurface
					variant="floating-chrome"
					zone="moonlight"
					elevation={3}
					filter="chrome"
					radius="var(--lg-radius-panel)"
					class="lg-reading-toc-card"
				>
					<div class="lg-reading-toc-title lg-type-micro">目录 · TOC</div>
					<nav class="lg-reading-toc-list">
						{#each tocItems as item (item.id)}
							<button
								type="button"
								class="lg-control lg-reading-toc-item"
								data-depth={item.depth}
								data-active={activeHeadingId === item.id ? "true" : undefined}
								onclick={() => jumpToHeading(item)}
							>
								{item.text}
							</button>
						{/each}
					</nav>
				</GlassSurface>
			</aside>
		{/if}
	</div>

	<GlassDock
		items={DOCK_ITEMS}
		activeId="blog"
		scrollTop={pageScrollTop}
		readingMode={true}
		zone="forest"
	>
		{#snippet satelliteEnd()}
			<GlassButton
				variant="regular"
				shape="circle"
				size="md"
				ariaLabel="回到顶部"
				title="回到顶部"
				onclick={scrollToTop}
			>
				↑
			</GlassButton>
		{/snippet}
	</GlassDock>

	<GlassDialog
		open={Boolean(lightboxSrc)}
		title={lightboxAlt}
		size="lg"
		onClose={() => {
			lightboxSrc = null;
		}}
	>
		{#if lightboxSrc}
			<figure class="lg-lightbox-figure">
				<img src={lightboxSrc} alt={lightboxAlt} class="lg-lightbox-img" />
			</figure>
		{/if}
	</GlassDialog>
</div>

<style>
	.lg-reading-page {
		position: relative;
		z-index: 20;
		min-height: 100dvh;
		padding:
			calc(82px + var(--lg-safe-top))
			max(14px, var(--lg-safe-right))
			calc(108px + var(--lg-safe-bottom))
			max(14px, var(--lg-safe-left));
	}

	.lg-reading-grid {
		display: grid;
		grid-template-columns: minmax(0, 820px);
		justify-content: center;
		align-items: start;
		gap: 24px;
		max-width: 1140px;
		margin-inline: auto;
	}

	:global([data-post-entrance="true"]) .lg-reading-grid {
		animation: lg-reading-enter var(--lg-dur-modal) var(--lg-ease-out);
	}

	@keyframes lg-reading-enter {
		from { opacity: 0.7; translate: 0 8px; }
	}

	@keyframes lg-reading-fade {
		from { opacity: 0.7; }
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-post-entrance="true"]) .lg-reading-grid {
			animation: lg-reading-fade var(--lg-dur-dropdown) var(--lg-ease-out);
		}
	}

	:global(html.motion-reduced [data-post-entrance="true"]) .lg-reading-grid {
		animation: lg-reading-fade var(--lg-dur-dropdown) var(--lg-ease-out);
	}

	@media (min-width: 1200px) {
		.lg-reading-grid.has-toc {
			grid-template-columns: minmax(0, 820px) 260px;
		}
	}

	:global(.lg-reading-surface) {
		width: 100%;
		overflow: hidden;
	}

	.lg-reading-slot {
		padding: clamp(18px, 3vw, 38px);
		color: var(--lg-ink-primary);
		user-select: text;
		-webkit-user-select: text;
	}

	/* 将 Shirone SSR 渲染的卡片、正文、公式、代码与上下篇自然融入深海高对比阅读体系 */
	.lg-reading-slot :global(.post-card),
	.lg-reading-slot :global(.m3-card) {
		background: transparent !important;
		box-shadow: none !important;
		border-color: var(--lg-separator) !important;
		color: var(--lg-ink-primary);
		padding-inline: 0 !important;
	}

	.lg-reading-slot :global(.post-nav) {
		background: var(--lg-fill-note-embedded) !important;
		border: 1px solid var(--lg-separator) !important;
		padding-inline: 16px !important;
	}

	.lg-reading-slot :global(.custom-md) {
		--on-surface: var(--lg-ink-primary);
		--on-surface-variant: var(--lg-ink-secondary);
		--primary: var(--lg-moonlight);
		--outline-variant: var(--lg-separator);
		--inline-code-bg: var(--lg-fill-code);
		--inline-code-color: var(--lg-ink-primary);
		--tw-prose-body: var(--lg-ink-primary);
		--tw-prose-headings: var(--lg-ink-primary);
		--tw-prose-links: var(--lg-moonlight);
		--tw-prose-bold: var(--lg-ink-primary);
		--tw-prose-quotes: var(--lg-ink-secondary);
		--tw-prose-captions: var(--lg-ink-tertiary);
		max-width: 76ch;
		line-height: 1.78;
		overflow-wrap: anywhere;
	}

	.lg-reading-slot :global(.custom-md img) {
		border-radius: var(--lg-radius-card);
		cursor: zoom-in;
	}

	.lg-reading-slot :global(.onload-animation) {
		animation: none !important;
		opacity: 1 !important;
		transform: none !important;
	}

	.lg-reading-comments {
		padding: 0 clamp(18px, 3vw, 38px) clamp(24px, 3.2vw, 40px);
		border-top: 1px solid var(--lg-separator);
		padding-top: 26px;
	}

	.lg-reading-mobile-toc {
		display: inline-flex;
	}

	.lg-reading-rail {
		display: none;
		position: sticky;
		top: calc(78px + var(--lg-safe-top));
	}

	@media (min-width: 1200px) {
		.lg-reading-mobile-toc {
			display: none;
		}
		.lg-reading-rail {
			display: block;
		}
	}

	:global(.lg-reading-toc-card) {
		--lg-surface-fill: rgba(11, 22, 38, 0.72);
		--lg-dimmer-bg: rgba(8, 17, 32, 0.24);
		padding: 14px;
		max-height: calc(100dvh - 140px);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.lg-reading-toc-title {
		color: var(--lg-ink-secondary);
		margin-bottom: 10px;
		padding-inline: 8px;
	}

	.lg-reading-toc-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lg-reading-toc-item {
		width: 100%;
		text-align: start;
		border: 0;
		border-radius: var(--lg-radius-xs);
		background: transparent;
		color: rgba(232, 243, 250, 0.90);
		padding: 6px 8px;
		font-size: 0.8125rem;
		line-height: 1.42;
		cursor: pointer;
	}

	.lg-reading-toc-item[data-depth="3"] {
		padding-inline-start: 18px;
	}

	.lg-reading-toc-item[data-active="true"] {
		background: var(--lg-firefly-soft);
		color: var(--lg-firefly-gold);
		font-weight: 500;
	}

	.lg-lightbox-figure {
		margin: 0;
		display: grid;
		place-items: center;
	}

	.lg-lightbox-img {
		max-width: 100%;
		max-height: 70dvh;
		object-fit: contain;
		border-radius: var(--lg-radius-card);
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-reading-toc-item:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
	}
</style>
