<script lang="ts">
import { onMount } from "svelte";
import {
	type CommentItem,
	type CommentSort,
	SocialApiError,
	createPostComment,
	deleteComment,
	getPostComments,
	moderateComment,
	updateComment,
} from "../../lib/api/social-client.ts";
import {
	GlassButton,
	GlassCommentCard,
	type GlassCommentData,
	GlassSurface,
	GlassTextarea,
} from "../glass/index.ts";
import AuthStatusMenu from "./AuthStatusMenu.svelte";
import ContinueWithGithubButton from "./ContinueWithGithubButton.svelte";
import { authStore } from "./auth-store.svelte.ts";

const COMMENT_MAX_LENGTH = 4000;
const PAGE_LIMIT = 20;

let {
	slug,
	articleTitle,
}: {
	slug: string;
	articleTitle?: string;
} = $props();

let items = $state<CommentItem[]>([]);
let sort = $state<CommentSort>("newest");
let page = $state(1);
let total = $state(0);
let totalWithReplies = $state(0);
let hasMore = $state(false);
let includeHidden = $state(false);

let loading = $state(true);
let loadingMore = $state(false);
let loadError = $state("");

let draft = $state("");
let submitting = $state(false);
let submitError = $state("");
let submitSuccess = $state("");

let replyTo = $state<CommentItem | null>(null);
let replyDraft = $state("");
let replyBusy = $state(false);
let replyError = $state("");

let editingId = $state<number | null>(null);
let editDraft = $state("");
let editBusy = $state(false);
let editError = $state("");

let actionBusyId = $state<number | null>(null);
let actionError = $state("");
let mounted = $state(false);
let successTimer: number | undefined;

const isAdmin = $derived(authStore.user?.role === "admin");

function toCardData(item: CommentItem, depth: number): GlassCommentData {
	return {
		id: String(item.id),
		authorName: item.author.displayName || item.author.username,
		authorLogin: item.author.username,
		authorAvatar: item.author.avatarUrl,
		authorUrl: item.author.profileUrl,
		isAdmin: item.author.role === "admin",
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		bodyHtml: item.bodyHtml,
		status: item.status,
		depth,
	};
}

function formatError(err: unknown, fallback: string): string {
	if (err instanceof SocialApiError) {
		if (err.status === 429 && err.retryAfterSec) {
			return `${err.message}（约 ${err.retryAfterSec} 秒后可重试）`;
		}
		return err.message;
	}
	return err instanceof Error ? err.message : fallback;
}

function flashSuccess(message: string) {
	submitSuccess = message;
	if (typeof window !== "undefined") {
		window.clearTimeout(successTimer);
		successTimer = window.setTimeout(() => {
			submitSuccess = "";
		}, 3200);
	}
}

async function fetchPage(targetPage: number, append: boolean) {
	if (!slug) return;
	if (append) loadingMore = true;
	else loading = true;
	loadError = "";
	try {
		const res = await getPostComments(slug, {
			sort,
			page: targetPage,
			limit: PAGE_LIMIT,
			includeHidden: isAdmin && includeHidden,
		});
		items = append ? [...items, ...res.items] : res.items;
		page = res.page;
		total = res.total;
		totalWithReplies = res.totalWithReplies;
		hasMore = res.hasMore;
	} catch (err) {
		loadError = formatError(err, "加载评论失败，请稍后重试。");
	} finally {
		loading = false;
		loadingMore = false;
	}
}

onMount(() => {
	mounted = true;
	void authStore.ensureLoaded();
	return () => {
		if (typeof window !== "undefined") {
			window.clearTimeout(successTimer);
		}
	};
});

$effect(() => {
	if (!mounted) return;
	const currentSlug = slug;
	const currentSort = sort;
	const showHidden = isAdmin && includeHidden;
	void currentSort;
	void showHidden;
	if (!currentSlug) return;
	replyTo = null;
	editingId = null;
	actionError = "";
	void fetchPage(1, false);
});

async function handleSubmitTop(event: SubmitEvent) {
	event.preventDefault();
	if (submitting || !authStore.user) return;
	const text = draft.trim();
	if (!text) {
		submitError = "请输入评论内容。";
		return;
	}
	submitting = true;
	submitError = "";
	try {
		await createPostComment(slug, { bodyMd: text });
		draft = "";
		flashSuccess("评论已发布");
		await fetchPage(1, false);
	} catch (err) {
		submitError = formatError(err, "发布评论失败，请稍后重试。");
	} finally {
		submitting = false;
	}
}

function findItemById(list: CommentItem[], id: number): CommentItem | null {
	for (const entry of list) {
		if (entry.id === id) return entry;
		const nested = findItemById(entry.replies, id);
		if (nested) return nested;
	}
	return null;
}

function startReply(card: GlassCommentData) {
	const found = findItemById(items, Number(card.id));
	if (!found) return;
	editingId = null;
	replyTo = found;
	replyDraft = "";
	replyError = "";
}

async function handleSubmitReply(event: SubmitEvent) {
	event.preventDefault();
	if (!replyTo || replyBusy || !authStore.user) return;
	const text = replyDraft.trim();
	if (!text) {
		replyError = "请输入回复内容。";
		return;
	}
	replyBusy = true;
	replyError = "";
	try {
		await createPostComment(slug, { bodyMd: text, parentId: replyTo.id });
		replyTo = null;
		replyDraft = "";
		flashSuccess("回复已发布");
		await fetchPage(1, false);
	} catch (err) {
		replyError = formatError(err, "发送回复失败，请稍后重试。");
	} finally {
		replyBusy = false;
	}
}

function startEdit(card: GlassCommentData) {
	const found = findItemById(items, Number(card.id));
	if (!found) return;
	replyTo = null;
	editingId = found.id;
	editDraft = found.bodyMd;
	editError = "";
}

async function handleSaveEdit(commentId: number) {
	if (editBusy) return;
	const text = editDraft.trim();
	if (!text) {
		editError = "评论内容不能为空。";
		return;
	}
	editBusy = true;
	editError = "";
	try {
		await updateComment(commentId, { bodyMd: text });
		editingId = null;
		editDraft = "";
		flashSuccess("评论已更新");
		await fetchPage(1, false);
	} catch (err) {
		editError = formatError(err, "保存修改失败，请稍后重试。");
	} finally {
		editBusy = false;
	}
}

async function handleDelete(card: GlassCommentData) {
	const id = Number(card.id);
	if (actionBusyId !== null) return;
	actionBusyId = id;
	actionError = "";
	try {
		await deleteComment(id);
		if (replyTo?.id === id) replyTo = null;
		if (editingId === id) editingId = null;
		await fetchPage(1, false);
	} catch (err) {
		actionError = formatError(err, "删除评论失败，请稍后重试。");
	} finally {
		actionBusyId = null;
	}
}

async function handleModerate(card: GlassCommentData, action: "hide" | "unhide" | "delete") {
	const id = Number(card.id);
	if (actionBusyId !== null) return;
	actionBusyId = id;
	actionError = "";
	try {
		await moderateComment(id, action);
		await fetchPage(1, false);
	} catch (err) {
		actionError = formatError(err, "审核操作失败，请稍后重试。");
	} finally {
		actionBusyId = null;
	}
}
</script>

<section class="lg-comments" aria-label={articleTitle ? `${articleTitle} 评论区` : "文章评论区"}>
	<header class="lg-comments__head">
		<div class="lg-comments__title-group">
			<h2 class="lg-comments__title">评论与讨论</h2>
			<span class="lg-comments__count" aria-live="polite">{totalWithReplies} 条</span>
		</div>

		<div class="lg-comments__controls">
			<div class="lg-comments__sort" role="group" aria-label="评论排序">
				<button
					type="button"
					class="lg-control lg-comments__sort-btn"
					data-active={sort === "newest" ? "true" : undefined}
					onclick={() => (sort = "newest")}
				>
					最新
				</button>
				<button
					type="button"
					class="lg-control lg-comments__sort-btn"
					data-active={sort === "oldest" ? "true" : undefined}
					onclick={() => (sort = "oldest")}
				>
					最早
				</button>
			</div>

			{#if isAdmin}
				<button
					type="button"
					class="lg-control lg-comments__sort-btn"
					data-active={includeHidden ? "true" : undefined}
					onclick={() => (includeHidden = !includeHidden)}
				>
					{includeHidden ? "已含隐藏" : "显示隐藏"}
				</button>
			{/if}

			<AuthStatusMenu compact zone="reading" />
		</div>
	</header>

	<GlassSurface
		variant="note-card"
		zone="reading"
		elevation={1}
		pointerGlow={false}
		radius="var(--lg-radius-card)"
		class="lg-comments__composer"
	>
		{#if authStore.user}
			<form class="lg-comments__form" onsubmit={handleSubmitTop}>
				<GlassTextarea
					bind:value={draft}
					label="发表评论（支持基础 Markdown）"
					placeholder="写下你的思考、补充或问题…"
					rows={4}
					maxlength={COMMENT_MAX_LENGTH}
					showCount={true}
					error={submitError || undefined}
				/>
				<div class="lg-comments__form-foot">
					<span class="lg-comments__hint">以 @{authStore.user.username} 身份发布</span>
					<div class="lg-comments__form-actions">
						{#if submitSuccess}
							<span class="lg-comments__ok" role="status">{submitSuccess}</span>
						{/if}
						<GlassButton type="submit" variant="tinted" size="sm" zone="reading" loading={submitting}>
							发布评论
						</GlassButton>
					</div>
				</div>
			</form>
		{:else}
			<div class="lg-comments__login-prompt">
				<p class="lg-comments__login-text">
					使用 GitHub 登录后即可参与评论与回复，所有访客均可自由阅读下方讨论。
				</p>
				<ContinueWithGithubButton size="sm" variant="regular" />
			</div>
		{/if}
	</GlassSurface>

	{#if actionError}
		<div class="lg-comments__banner lg-comments__banner--err" role="alert">
			<span>{actionError}</span>
		</div>
	{/if}

	{#if loading}
		<div class="lg-comments__state" aria-busy="true">
			<p>正在加载评论…</p>
		</div>
	{:else if loadError}
		<div class="lg-comments__banner lg-comments__banner--err" role="alert">
			<span>{loadError}</span>
			<GlassButton variant="ghost-on-glass" size="sm" zone="reading" onclick={() => void fetchPage(1, false)}>
				重试
			</GlassButton>
		</div>
	{:else if items.length === 0}
		<div class="lg-comments__state">
			<p>还没有评论，欢迎成为第一位留下想法的人。</p>
		</div>
	{:else}
		{#snippet renderThread(node: CommentItem, depth: number)}
			{@const isOwner = authStore.user?.id === node.author.id}
			{@const canEdit = isOwner && node.status !== "deleted"}
			{@const canDelete = (isOwner || isAdmin) && node.status !== "deleted"}
			<div class="lg-comments__node">
				<GlassCommentCard
					comment={toCardData(node, depth)}
					zone="reading"
					canReply={Boolean(authStore.user) && node.status === "visible"}
					{canEdit}
					{canDelete}
					canModerate={isAdmin}
					onReply={startReply}
					onEdit={startEdit}
					onDelete={handleDelete}
					onModerate={handleModerate}
				>
					{#if editingId === node.id}
						<div class="lg-comments__inline-box">
							<GlassTextarea
								bind:value={editDraft}
								label="编辑评论"
								rows={3}
								maxlength={COMMENT_MAX_LENGTH}
								showCount={true}
								error={editError || undefined}
							/>
							<div class="lg-comments__inline-actions">
								<GlassButton
									variant="ghost-on-glass"
									size="sm"
									zone="reading"
									onclick={() => (editingId = null)}
								>
									取消
								</GlassButton>
								<GlassButton
									variant="tinted"
									size="sm"
									zone="reading"
									loading={editBusy}
									onclick={() => void handleSaveEdit(node.id)}
								>
									保存修改
								</GlassButton>
							</div>
						</div>
					{:else}
						<div class="lg-comment__prose">{@html node.bodyHtml}</div>
					{/if}

					{#snippet replies()}
						{#if replyTo?.id === node.id}
							<form class="lg-comments__reply-form" onsubmit={handleSubmitReply}>
								<GlassTextarea
									bind:value={replyDraft}
									label={`回复 @${node.author.username}`}
									placeholder="写下你的回复…"
									rows={3}
									maxlength={COMMENT_MAX_LENGTH}
									showCount={true}
									error={replyError || undefined}
								/>
								<div class="lg-comments__inline-actions">
									<GlassButton
										variant="ghost-on-glass"
										size="sm"
										zone="reading"
										onclick={() => (replyTo = null)}
									>
										取消
									</GlassButton>
									<GlassButton
										type="submit"
										variant="tinted"
										size="sm"
										zone="reading"
										loading={replyBusy}
									>
										发送回复
									</GlassButton>
								</div>
							</form>
						{/if}

						{#each node.replies as child (child.id)}
							{@render renderThread(child, Math.min(2, depth + 1))}
						{/each}
					{/snippet}
				</GlassCommentCard>
			</div>
		{/snippet}

		<div class="lg-comments__list">
			{#each items as item (item.id)}
				{@render renderThread(item, 0)}
			{/each}
		</div>

		{#if hasMore}
			<div class="lg-comments__more">
				<GlassButton
					variant="ghost-on-glass"
					size="sm"
					zone="reading"
					loading={loadingMore}
					onclick={() => void fetchPage(page + 1, true)}
				>
					加载更多评论（已显示 {items.length} / {total} 条主评论）
				</GlassButton>
			</div>
		{/if}
	{/if}
</section>

<style>
	.lg-comments {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.lg-comments__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.lg-comments__title-group {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.lg-comments__title {
		margin: 0;
		font-family: var(--lg-font-display);
		font-size: var(--lg-text-h2);
		font-weight: 500;
		color: var(--lg-ink-primary);
	}

	.lg-comments__count {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-comments__controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.lg-comments__sort {
		display: inline-flex;
		padding: 3px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-fill-recessed);
		border: 1px solid var(--lg-separator);
	}

	.lg-comments__sort-btn {
		min-height: 30px;
		padding: 0 12px;
		border: 0;
		border-radius: var(--lg-radius-pill);
		background: transparent;
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-micro);
		font-weight: 500;
		cursor: pointer;
	}

	.lg-comments__sort-btn[data-active="true"] {
		background: var(--lg-accent-soft);
		color: var(--lg-ink-primary);
	}

	:global(.lg-comments__composer) {
		padding: 16px;
	}

	.lg-comments__form,
	.lg-comments__reply-form,
	.lg-comments__inline-box {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.lg-comments__form-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
	}

	.lg-comments__form-actions,
	.lg-comments__inline-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	.lg-comments__hint {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-comments__ok {
		font-size: var(--lg-text-micro);
		color: var(--lg-status-ok);
	}

	.lg-comments__login-prompt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.lg-comments__login-text {
		margin: 0;
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-secondary);
		line-height: 1.55;
	}

	.lg-comments__list {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}

	.lg-comments__node {
		min-width: 0;
	}

	.lg-comment__prose {
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
		overflow-wrap: anywhere;
	}

	.lg-comment__prose :global(pre) {
		padding: 10px 12px;
		border-radius: var(--lg-radius-control);
		background: var(--lg-fill-code);
		overflow-x: auto;
	}

	.lg-comment__prose :global(code) {
		font-family: var(--lg-font-mono);
		font-size: 0.85em;
		padding: 1px 5px;
		border-radius: 6px;
		background: var(--lg-fill-code);
	}

	.lg-comments__state,
	.lg-comments__banner {
		padding: 14px 16px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-ui);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.lg-comments__state p {
		margin: 0;
	}

	.lg-comments__banner--err {
		border-color: rgba(242, 139, 130, 0.36);
		background: rgba(242, 139, 130, 0.10);
		color: var(--lg-status-err);
	}

	.lg-comments__more {
		display: flex;
		justify-content: center;
		padding-top: 4px;
	}
</style>
