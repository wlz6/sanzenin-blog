<script lang="ts">
import type {
	BlogPostIndexItem,
	BlogTaxonomyCount,
} from "../../lib/api/social-client.ts";
import { GlassButton, GlassInput } from "../glass/index.ts";

const PAGE_SIZE = 12;
const INITIAL_VISIBLE_TAGS = 16;

let {
	posts,
	categories,
	tags,
	initialCategory = "",
	initialTag = "",
	initialQuery = "",
	initialPage = 1,
}: {
	posts: BlogPostIndexItem[];
	categories: BlogTaxonomyCount[];
	tags: BlogTaxonomyCount[];
	initialCategory?: string;
	initialTag?: string;
	initialQuery?: string;
	initialPage?: number;
} = $props();

let query = $state(initialQuery);
let selectedCategory = $state(initialCategory);
let selectedTag = $state(initialTag);
let currentPage = $state(Math.max(1, initialPage));
let showAllTags = $state(false);

$effect(() => {
	query = initialQuery;
});

$effect(() => {
	selectedCategory = initialCategory;
});

$effect(() => {
	selectedTag = initialTag;
});

$effect(() => {
	currentPage = Math.max(1, initialPage);
});

const normalizedQuery = $derived(query.trim().toLowerCase());

const filteredPosts = $derived.by(() => {
	return posts.filter((post) => {
		if (selectedCategory && post.category !== selectedCategory) return false;
		if (selectedTag && !post.tags.includes(selectedTag)) return false;
		if (!normalizedQuery) return true;
		const haystack = [
			post.title,
			post.description,
			post.excerpt,
			post.category,
			...post.tags,
		]
			.join(" ")
			.toLowerCase();
		return normalizedQuery.split(/\s+/).every((term) => haystack.includes(term));
	});
});

const totalPages = $derived(Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE)));
const safePage = $derived(Math.min(Math.max(1, currentPage), totalPages));
const pagedPosts = $derived(
	filteredPosts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
);

const visibleTags = $derived.by(() => {
	if (showAllTags || tags.length <= INITIAL_VISIBLE_TAGS) return tags;
	const base = tags.slice(0, INITIAL_VISIBLE_TAGS);
	if (selectedTag && !base.some((item) => item.name === selectedTag)) {
		const active = tags.find((item) => item.name === selectedTag);
		if (active) return [...base, active];
	}
	return base;
});

const hasActiveFilter = $derived(
	Boolean(normalizedQuery || selectedCategory || selectedTag),
);

const pageNumbers = $derived.by(() => {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}
	const pages = new Set<number>([1, totalPages, safePage - 1, safePage, safePage + 1]);
	const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
	const items: Array<number | "ellipsis"> = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
			items.push("ellipsis");
		}
		items.push(sorted[i]);
	}
	return items;
});

function setCategory(name: string) {
	selectedCategory = selectedCategory === name ? "" : name;
	currentPage = 1;
}

function setTag(name: string) {
	selectedTag = selectedTag === name ? "" : name;
	currentPage = 1;
}

function handleSearchInput() {
	currentPage = 1;
}

function clearAllFilters() {
	query = "";
	selectedCategory = "";
	selectedTag = "";
	currentPage = 1;
}
</script>

<section class="lg-blog-space" aria-label="文章归档与检索">
	<div class="lg-blog-space__controls">
		<div class="lg-blog-space__search-row">
			<div class="lg-blog-space__search-box">
				<GlassInput
					bind:value={query}
					type="search"
					placeholder="搜索标题、分类、标签或正文摘要…"
					ariaLabel="搜索文章"
					enterkeyhint="search"
					oninput={handleSearchInput}
				>
					{#snippet leading()}
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<circle cx="11" cy="11" r="7" />
							<path d="m20 20-3.5-3.5" stroke-linecap="round" />
						</svg>
					{/snippet}
				</GlassInput>
			</div>

			<div class="lg-blog-space__meta-actions">
				<span class="lg-blog-space__count" aria-live="polite">
					共 {filteredPosts.length} / {posts.length} 篇
				</span>
				{#if hasActiveFilter}
					<GlassButton variant="ghost-on-glass" size="sm" onclick={clearAllFilters}>
						清除筛选
					</GlassButton>
				{/if}
			</div>
		</div>

		{#if categories.length > 0}
			<div class="lg-blog-space__taxonomy" role="group" aria-label="按分类筛选">
				<span class="lg-blog-space__tax-label">分类</span>
				<div class="lg-blog-space__pills">
					{#each categories as cat (cat.name)}
						<button
							type="button"
							class="lg-control lg-blog-pill"
							data-active={selectedCategory === cat.name ? "true" : undefined}
							onclick={() => setCategory(cat.name)}
						>
							<span>{cat.name}</span>
							<span class="lg-blog-pill__num">{cat.count}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if tags.length > 0}
			<div class="lg-blog-space__taxonomy" role="group" aria-label="按标签筛选">
				<span class="lg-blog-space__tax-label">标签</span>
				<div class="lg-blog-space__pills">
					{#each visibleTags as tag (tag.name)}
						<button
							type="button"
							class="lg-control lg-blog-pill"
							data-active={selectedTag === tag.name ? "true" : undefined}
							onclick={() => setTag(tag.name)}
						>
							<span>#{tag.name}</span>
							<span class="lg-blog-pill__num">{tag.count}</span>
						</button>
					{/each}
					{#if tags.length > INITIAL_VISIBLE_TAGS}
						<button
							type="button"
							class="lg-control lg-blog-pill lg-blog-pill--toggle"
							onclick={() => (showAllTags = !showAllTags)}
						>
							{showAllTags ? "收起标签" : `展开全部 (${tags.length})`}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if pagedPosts.length === 0}
		<div class="lg-blog-space__empty">
			<p>没有找到符合当前筛选条件的文章。</p>
			<GlassButton variant="ghost-on-glass" size="sm" onclick={clearAllFilters}>
				重置筛选条件
			</GlassButton>
		</div>
	{:else}
		<div class="lg-blog-space__list">
			{#each pagedPosts as post (post.slug)}
				<a href={post.url} class="lg-control lg-blog-card">
					<div class="lg-blog-card__top">
						<div class="lg-blog-card__meta">
							<time datetime={post.published}>{post.published}</time>
							<span aria-hidden="true">·</span>
							<span>{post.readingMinutes} 分钟阅读</span>
							{#if post.category}
								<span class="lg-blog-card__cat">{post.category}</span>
							{/if}
						</div>
						<span class="lg-blog-card__arrow" aria-hidden="true">↗</span>
					</div>

					<h3 class="lg-blog-card__title">{post.title}</h3>
					<p class="lg-blog-card__desc">{post.description || post.excerpt}</p>

					{#if post.tags.length > 0}
						<div class="lg-blog-card__tags">
							{#each post.tags.slice(0, 5) as tag (tag)}
								<span class="lg-blog-card__tag">#{tag}</span>
							{/each}
						</div>
					{/if}
				</a>
			{/each}
		</div>

		{#if totalPages > 1}
			<nav class="lg-blog-space__pager" aria-label="文章分页">
				<GlassButton
					variant="ghost-on-glass"
					size="sm"
					disabled={safePage <= 1}
					onclick={() => (currentPage = Math.max(1, safePage - 1))}
				>
					上一页
				</GlassButton>

				<div class="lg-blog-space__pages">
					{#each pageNumbers as entry, idx (idx)}
						{#if entry === "ellipsis"}
							<span class="lg-blog-space__ellipsis" aria-hidden="true">…</span>
						{:else}
							<button
								type="button"
								class="lg-control lg-blog-page-btn"
								data-active={entry === safePage ? "true" : undefined}
								aria-current={entry === safePage ? "page" : undefined}
								onclick={() => (currentPage = entry)}
							>
								{entry}
							</button>
						{/if}
					{/each}
				</div>

				<GlassButton
					variant="ghost-on-glass"
					size="sm"
					disabled={safePage >= totalPages}
					onclick={() => (currentPage = Math.min(totalPages, safePage + 1))}
				>
					下一页
				</GlassButton>
			</nav>
		{/if}
	{/if}
</section>

<style>
	.lg-blog-space {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.lg-blog-space__controls {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.lg-blog-space__search-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
	}

	.lg-blog-space__search-box {
		flex: 1 1 260px;
		min-width: 0;
	}

	.lg-blog-space__meta-actions {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.lg-blog-space__count {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.lg-blog-space__taxonomy {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.lg-blog-space__tax-label {
		flex: none;
		padding-top: 6px;
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		font-weight: 500;
	}

	.lg-blog-space__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
	}

	.lg-blog-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 30px;
		padding: 0 11px;
		border-radius: var(--lg-radius-pill);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
		cursor: pointer;
	}

	.lg-blog-pill[data-active="true"] {
		background: var(--lg-firefly-soft);
		border-color: rgba(246, 215, 122, 0.45);
		color: var(--lg-firefly-gold);
	}

	.lg-blog-pill--toggle {
		border-style: dashed;
		color: var(--lg-ink-tertiary);
	}

	.lg-blog-pill__num {
		opacity: 0.72;
		font-variant-numeric: tabular-nums;
	}

	.lg-blog-space__list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.lg-blog-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 15px 17px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.lg-blog-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.lg-blog-card__meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 7px;
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-blog-card__cat {
		padding: 1px 8px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-accent-soft);
		color: var(--lg-moonlight);
		font-weight: 500;
	}

	.lg-blog-card__arrow {
		color: var(--lg-ink-tertiary);
		font-size: 0.875rem;
		flex: none;
	}

	.lg-blog-card__title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		line-height: 1.42;
		color: var(--lg-ink-primary);
		overflow-wrap: anywhere;
	}

	.lg-blog-card__desc {
		margin: 0;
		font-size: var(--lg-text-ui);
		line-height: 1.6;
		color: var(--lg-ink-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.lg-blog-card__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding-top: 2px;
	}

	.lg-blog-card__tag {
		font-size: 0.72rem;
		color: var(--lg-ink-tertiary);
	}

	.lg-blog-space__empty {
		padding: 28px 18px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: var(--lg-ink-secondary);
	}

	.lg-blog-space__empty p {
		margin: 0;
	}

	.lg-blog-space__pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		padding-top: 6px;
	}

	.lg-blog-space__pages {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}

	.lg-blog-page-btn {
		min-width: 34px;
		min-height: 34px;
		padding: 0 10px;
		border-radius: var(--lg-radius-pill);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
	}

	.lg-blog-page-btn[data-active="true"] {
		background: var(--lg-firefly-soft);
		border-color: rgba(246, 215, 122, 0.5);
		color: var(--lg-firefly-gold);
		font-weight: 600;
	}

	.lg-blog-space__ellipsis {
		color: var(--lg-ink-tertiary);
		padding: 0 4px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-blog-pill:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
		.lg-blog-card:hover {
			background: var(--lg-fill-note-hover);
			border-color: var(--lg-separator-strong);
		}
		.lg-blog-card:hover .lg-blog-card__arrow {
			color: var(--lg-firefly-gold);
		}
		.lg-blog-page-btn:hover:not([data-active="true"]) {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
	}
</style>
