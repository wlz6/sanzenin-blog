<script lang="ts">
import type { GalleryItem } from "../../lib/api/social-client.ts";
import { GlassButton, GlassDialog } from "../glass/index.ts";

let {
	items,
}: {
	items: GalleryItem[];
} = $props();

type CategoryFilter = "all" | GalleryItem["category"];

let category = $state<CategoryFilter>("all");
let activeIndex = $state<number | null>(null);

const categoryLabels: Record<CategoryFilter, string> = {
	all: "全部",
	scene: "湖景与站点",
	scenery: "光影瞬间",
	diagram: "技术图解",
};

const filteredItems = $derived(
	category === "all" ? items : items.filter((item) => item.category === category),
);

const lightboxOpen = $derived(
	activeIndex !== null && activeIndex >= 0 && activeIndex < filteredItems.length,
);
const activeItem = $derived(
	activeIndex !== null ? filteredItems[activeIndex] ?? null : null,
);

function openLightbox(index: number) {
	activeIndex = index;
}

function closeLightbox() {
	activeIndex = null;
}

function stepLightbox(delta: number) {
	if (activeIndex === null || filteredItems.length === 0) return;
	activeIndex = (activeIndex + delta + filteredItems.length) % filteredItems.length;
}

$effect(() => {
	if (!lightboxOpen || typeof window === "undefined") return;
	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			stepLightbox(-1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			stepLightbox(1);
		}
	};
	window.addEventListener("keydown", onKeydown);
	return () => window.removeEventListener("keydown", onKeydown);
});
</script>

<section class="lg-gallery-space" aria-label="视觉画廊">
	<div class="lg-gallery-space__filters" role="group" aria-label="画廊分类">
		{#each (["all", "scene", "scenery", "diagram"] as const) as key (key)}
			<button
				type="button"
				class="lg-control lg-gallery-pill"
				data-active={category === key ? "true" : undefined}
				onclick={() => {
					category = key;
					activeIndex = null;
				}}
			>
				{categoryLabels[key]}
			</button>
		{/each}
	</div>

	<div class="lg-gallery-grid">
		{#each filteredItems as item, index (item.id)}
			<figure class="lg-gallery-card">
				<button
					type="button"
					class="lg-control lg-gallery-card__media"
					aria-label={`查看大图：${item.title}`}
					onclick={() => openLightbox(index)}
				>
					<img
						src={item.src}
						alt={item.title}
						loading="lazy"
						decoding="async"
						class="lg-gallery-card__img"
					/>
					<span class="lg-gallery-card__tag">{categoryLabels[item.category]}</span>
				</button>

				<figcaption class="lg-gallery-card__meta">
					<strong class="lg-gallery-card__title">{item.title}</strong>
					<p class="lg-gallery-card__caption">{item.caption}</p>
					{#if item.relatedPostSlug}
						<a href={`/posts/${item.relatedPostSlug}/`} class="lg-gallery-card__post">
							阅读关联笔记 ↗
						</a>
					{/if}
				</figcaption>
			</figure>
		{/each}
	</div>
</section>

<GlassDialog
	open={lightboxOpen}
	size="lg"
	title={activeItem?.title}
	description={activeItem?.caption}
	onClose={closeLightbox}
>
	{#if activeItem}
		<div class="lg-lightbox">
			<div class="lg-lightbox__stage">
				<img src={activeItem.src} alt={activeItem.title} class="lg-lightbox__img" />
			</div>
			<div class="lg-lightbox__bar">
				<span class="lg-lightbox__counter">
					{(activeIndex ?? 0) + 1} / {filteredItems.length}
				</span>
				<div class="lg-lightbox__nav">
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						disabled={filteredItems.length <= 1}
						onclick={() => stepLightbox(-1)}
					>
						← 上一张
					</GlassButton>
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						disabled={filteredItems.length <= 1}
						onclick={() => stepLightbox(1)}
					>
						下一张 →
					</GlassButton>
				</div>
			</div>
		</div>
	{/if}
</GlassDialog>

<style>
	.lg-gallery-space {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.lg-gallery-space__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.lg-gallery-pill {
		min-height: 32px;
		padding: 0 13px;
		border-radius: var(--lg-radius-pill);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
		cursor: pointer;
	}

	.lg-gallery-pill[data-active="true"] {
		background: var(--lg-firefly-soft);
		border-color: rgba(246, 215, 122, 0.45);
		color: var(--lg-firefly-gold);
		font-weight: 600;
	}

	.lg-gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
		gap: 18px;
	}

	.lg-gallery-card {
		margin: 0;
		display: flex;
		flex-direction: column;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		overflow: hidden;
		min-width: 0;
	}

	.lg-gallery-card__media {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 10;
		padding: 0;
		border: 0;
		background: rgba(8, 17, 32, 0.72);
		cursor: zoom-in;
		overflow: hidden;
	}

	.lg-gallery-card__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 280ms var(--lg-ease-out);
	}

	.lg-gallery-card__tag {
		position: absolute;
		top: 10px;
		left: 10px;
		padding: 3px 9px;
		border-radius: var(--lg-radius-pill);
		background: rgba(11, 22, 38, 0.78);
		border: 1px solid var(--lg-separator);
		color: var(--lg-ink-primary);
		font-size: 0.7rem;
	}

	.lg-gallery-card__meta {
		padding: 13px 15px 15px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.lg-gallery-card__title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--lg-ink-primary);
	}

	.lg-gallery-card__caption {
		margin: 0;
		font-size: var(--lg-text-micro);
		line-height: 1.55;
		color: var(--lg-ink-secondary);
	}

	.lg-gallery-card__post {
		margin-top: 4px;
		font-size: var(--lg-text-micro);
		color: var(--lg-moonlight);
		text-decoration: none;
		align-self: flex-start;
	}

	.lg-lightbox {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.lg-lightbox__stage {
		display: grid;
		place-items: center;
		background: rgba(6, 13, 25, 0.76);
		border-radius: var(--lg-radius-card);
		padding: 10px;
		max-height: 60dvh;
		overflow: hidden;
	}

	.lg-lightbox__img {
		max-width: 100%;
		max-height: 56dvh;
		object-fit: contain;
		border-radius: var(--lg-radius-control);
	}

	.lg-lightbox__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.lg-lightbox__counter {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.lg-lightbox__nav {
		display: inline-flex;
		gap: 8px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-gallery-pill:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
		.lg-gallery-card__media:hover .lg-gallery-card__img {
			transform: scale(1.03);
		}
		.lg-gallery-card__post:hover {
			color: var(--lg-firefly-gold);
			text-decoration: underline;
		}
	}
</style>
