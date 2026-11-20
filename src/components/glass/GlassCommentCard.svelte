<script lang="ts">
import type { Snippet } from "svelte";
import GlassSurface from "./GlassSurface.svelte";
import type { GlassCommentData, GlassZone } from "./types.ts";

let {
	comment,
	zone = "forest",
	canReply = true,
	canEdit = false,
	canDelete = false,
	canModerate = false,
	class: className = "",
	onReply,
	onEdit,
	onDelete,
	onModerate,
	replies,
	children,
}: {
	comment: GlassCommentData;
	zone?: GlassZone;
	canReply?: boolean;
	canEdit?: boolean;
	canDelete?: boolean;
	canModerate?: boolean;
	class?: string;
	onReply?: (comment: GlassCommentData) => void;
	onEdit?: (comment: GlassCommentData) => void;
	onDelete?: (comment: GlassCommentData) => void;
	onModerate?: (comment: GlassCommentData, action: "hide" | "unhide" | "delete") => void;
	replies?: Snippet;
	children?: Snippet;
} = $props();

const depth = $derived(Math.min(3, Math.max(0, comment.depth ?? 0)));
const isHidden = $derived(comment.status === "hidden");
const isDeleted = $derived(comment.status === "deleted");
const isEdited = $derived(
	Boolean(comment.updatedAt && comment.updatedAt !== comment.createdAt),
);

function formatDate(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}
</script>

<article
	class={`lg-comment-thread ${className}`.trim()}
	style={depth > 0 ? `--lg-comment-depth: ${depth};` : undefined}
	data-comment-id={comment.id}
	data-comment-status={comment.status ?? "visible"}
>
	<GlassSurface
		variant="note-card"
		{zone}
		elevation={1}
		pointerGlow={false}
		radius="var(--lg-radius-card)"
		class="lg-comment-card"
	>
		<header class="lg-comment__head">
			<div class="lg-comment__author">
				{#if comment.authorAvatar}
					<img
						src={comment.authorAvatar}
						alt={comment.authorName}
						width="34"
						height="34"
						loading="lazy"
						decoding="async"
						class="lg-comment__avatar"
					/>
				{:else}
					<span class="lg-comment__avatar lg-comment__avatar--fallback" aria-hidden="true">
						{(comment.authorName || comment.authorLogin || "?").slice(0, 1).toUpperCase()}
					</span>
				{/if}

				<div class="lg-comment__meta">
					<div class="lg-comment__name-row">
						{#if comment.authorUrl}
							<a
								href={comment.authorUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="lg-comment__name"
							>
								{comment.authorName || comment.authorLogin}
							</a>
						{:else}
							<span class="lg-comment__name">{comment.authorName || comment.authorLogin}</span>
						{/if}
						<span class="lg-comment__login">@{comment.authorLogin}</span>
						{#if comment.isAdmin}
							<span class="lg-comment__badge">作者</span>
						{/if}
						{#if isHidden}
							<span class="lg-comment__badge lg-comment__badge--warn">已隐藏</span>
						{/if}
					</div>
					<time class="lg-comment__time" datetime={comment.createdAt}>
						{formatDate(comment.createdAt)}{#if isEdited} · 已编辑{/if}
					</time>
				</div>
			</div>
		</header>

		<div class="lg-comment__body">
			{#if isDeleted}
				<p class="lg-comment__placeholder">该内容已删除。</p>
			{:else if children}
				{@render children()}
			{:else if comment.bodyHtml}
				<!-- 由后端 marked + xss 严格白名单净化后的安全 HTML -->
				<div class="lg-comment__prose">{@html comment.bodyHtml}</div>
			{/if}
		</div>

		{#if !isDeleted && (canReply || canEdit || canDelete || canModerate)}
			<footer class="lg-comment__actions" data-lg-interactive="true">
				{#if canReply && onReply}
					<button type="button" class="lg-control lg-comment__act" onclick={() => onReply(comment)}>
						回复
					</button>
				{/if}
				{#if canEdit && onEdit}
					<button type="button" class="lg-control lg-comment__act" onclick={() => onEdit(comment)}>
						编辑
					</button>
				{/if}
				{#if canDelete && onDelete}
					<button
						type="button"
						class="lg-control lg-comment__act lg-comment__act--danger"
						onclick={() => onDelete(comment)}
					>
						删除
					</button>
				{/if}
				{#if canModerate && onModerate}
					<button
						type="button"
						class="lg-control lg-comment__act"
						onclick={() => onModerate(comment, isHidden ? "unhide" : "hide")}
					>
						{isHidden ? "恢复可见" : "隐藏"}
					</button>
				{/if}
			</footer>
		{/if}
	</GlassSurface>

	{#if replies}
		<div class="lg-comment__replies">
			{@render replies()}
		</div>
	{/if}
</article>

<style>
	.lg-comment-thread {
		margin-inline-start: calc(var(--lg-comment-depth, 0) * 18px);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	:global(.lg-comment-card) {
		padding: 14px 16px;
	}

	.lg-comment__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 10px;
	}

	.lg-comment__author {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.lg-comment__avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--lg-separator-strong);
		flex: none;
	}

	.lg-comment__avatar--fallback {
		display: grid;
		place-items: center;
		background: var(--lg-accent-soft);
		color: var(--lg-ink-primary);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.lg-comment__meta {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lg-comment__name-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}

	.lg-comment__name {
		font-size: var(--lg-text-ui);
		font-weight: 600;
		color: var(--lg-ink-primary);
		text-decoration: none;
	}

	.lg-comment__login,
	.lg-comment__time {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-comment__badge {
		padding: 1px 7px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-firefly-soft);
		color: var(--lg-firefly-gold);
		font-size: 0.6875rem;
		font-weight: 600;
	}

	.lg-comment__badge--warn {
		background: rgba(242, 139, 130, 0.16);
		color: var(--lg-status-err);
	}

	.lg-comment__body {
		font-size: 0.9375rem;
		line-height: 1.68;
		color: var(--lg-ink-primary);
		user-select: text;
		overflow-wrap: anywhere;
	}

	.lg-comment__prose :global(p) {
		margin: 0 0 8px;
	}

	.lg-comment__prose :global(p:last-child) {
		margin-bottom: 0;
	}

	.lg-comment__prose :global(a) {
		color: var(--lg-moonlight);
		text-decoration: underline;
	}

	.lg-comment__prose :global(code) {
		font-family: var(--lg-font-mono);
		font-size: 0.85em;
		padding: 1px 5px;
		border-radius: 6px;
		background: var(--lg-fill-code);
	}

	.lg-comment__prose :global(pre) {
		padding: 10px 12px;
		border-radius: var(--lg-radius-control);
		background: var(--lg-fill-code);
		overflow-x: auto;
	}

	.lg-comment__placeholder {
		margin: 0;
		color: var(--lg-ink-tertiary);
		font-style: italic;
	}

	.lg-comment__actions {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px solid var(--lg-separator);
	}

	.lg-comment__act {
		min-height: 32px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--lg-radius-xs);
		background: transparent;
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
		font-weight: 500;
		cursor: pointer;
	}

	.lg-comment__act--danger {
		color: var(--lg-status-err);
	}

	.lg-comment__replies {
		padding-inline-start: 12px;
		border-inline-start: 1px solid var(--lg-separator);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-comment__act:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}
		.lg-comment__act--danger:hover {
			background: rgba(242, 139, 130, 0.14);
			color: var(--lg-status-err);
		}
	}
</style>
