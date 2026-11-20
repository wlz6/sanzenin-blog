<script lang="ts">
import { onMount } from "svelte";
import {
	type CommentItem,
	type CommentSort,
	SocialApiError,
	createGuestbookEntry,
	deleteGuestbookEntry,
	getGuestbookEntries,
	moderateComment,
	updateGuestbookEntry,
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

const GUESTBOOK_MAX_LENGTH = 1000;
const PAGE_LIMIT = 18;

let {
	class: className = "",
}: {
	class?: string;
} = $props();

let entries = $state<CommentItem[]>([]);
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

let replyToId = $state<number | null>(null);
let replyDraft = $state("");
let replyBusy = $state(false);
let replyError = $state("");

let editingId = $state<number | null>(null);
let editDraft = $state("");
let editBusy = $state(false);
let editError = $state("");

let busyId = $state<number | null>(null);
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
	if (append) loadingMore = true;
	else loading = true;
	loadError = "";
	try {
		const res = await getGuestbookEntries({
			sort,
			page: targetPage,
			limit: PAGE_LIMIT,
			includeHidden: isAdmin && includeHidden,
		});
		entries = append ? [...entries, ...res.items] : res.items;
		page = res.page;
		total = res.total;
		totalWithReplies = res.totalWithReplies;
		hasMore = res.hasMore;
	} catch (err) {
		loadError = formatError(err, "加载留言失败，请稍后重试。");
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
	const currentSort = sort;
	const showHidden = isAdmin && includeHidden;
	void currentSort;
	void showHidden;
	void fetchPage(1, false);
});

function findEntryById(list: CommentItem[], id: number): CommentItem | null {
	for (const item of list) {
		if (item.id === id) return item;
		const nested = findEntryById(item.replies, id);
		if (nested) return nested;
	}
	return null;
}

async function handleCreateEntry(event: SubmitEvent) {
	event.preventDefault();
	if (submitting || !authStore.user) return;
	const text = draft.trim();
	if (!text) {
		submitError = "请写下留言内容。";
		return;
	}
	submitting = true;
	submitError = "";
	try {
		await createGuestbookEntry({ bodyMd: text });
		draft = "";
		flashSuccess("便签已留在湖畔");
		await fetchPage(1, false);
	} catch (err) {
		submitError = formatError(err, "发布留言失败，请稍后重试。");
	} finally {
		submitting = false;
	}
}

function startReply(card: GlassCommentData) {
	editingId = null;
	replyToId = Number(card.id);
	replyDraft = "";
	replyError = "";
}

async function handleReplySubmit(event: SubmitEvent, parentId: number) {
	event.preventDefault();
	if (replyBusy || !authStore.user) return;
	const text = replyDraft.trim();
	if (!text) {
		replyError = "请输入回复内容。";
		return;
	}
	replyBusy = true;
	replyError = "";
	try {
		await createGuestbookEntry({ bodyMd: text, parentId });
		replyToId = null;
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
	const found = findEntryById(entries, Number(card.id));
	if (!found) return;
	replyToId = null;
	editingId = found.id;
	editDraft = found.bodyMd;
	editError = "";
}

async function handleSaveEdit(entryId: number) {
	if (editBusy) return;
	const text = editDraft.trim();
	if (!text) {
		editError = "留言内容不能为空。";
		return;
	}
	editBusy = true;
	editError = "";
	try {
		await updateGuestbookEntry(entryId, { bodyMd: text });
		editingId = null;
		editDraft = "";
		flashSuccess("留言已更新");
		await fetchPage(1, false);
	} catch (err) {
		editError = formatError(err, "更新留言失败，请稍后重试。");
	} finally {
		editBusy = false;
	}
}

async function handleDelete(card: GlassCommentData) {
	const id = Number(card.id);
	if (busyId !== null) return;
	busyId = id;
	actionError = "";
	try {
		await deleteGuestbookEntry(id);
		if (replyToId === id) replyToId = null;
		if (editingId === id) editingId = null;
		await fetchPage(1, false);
	} catch (err) {
		actionError = formatError(err, "删除留言失败，请稍后重试。");
	} finally {
		busyId = null;
	}
}

async function handleModerate(card: GlassCommentData, action: "hide" | "unhide" | "delete") {
	const id = Number(card.id);
	if (busyId !== null) return;
	busyId = id;
	actionError = "";
	try {
		await moderateComment(id, action);
		await fetchPage(1, false);
	} catch (err) {
		actionError = formatError(err, "审核操作失败，请稍后重试。");
	} finally {
		busyId = null;
	}
}
</script>

<section class={`lg-guestbook ${className}`.trim()} aria-label="湖畔留言板">
	<!-- 顶部栏置于外层玻璃之外，避免 AuthStatusMenu 气泡继承嵌套上下文 -->
	<header class="lg-guestbook__head">
		<div>
			<p class="lg-guestbook__eyebrow">GUESTBOOK</p>
			<h2 class="lg-guestbook__title">萤火留言板</h2>
			<p class="lg-guestbook__subtitle">
				湖面之上的轻盈便签空间，欢迎留下足迹与问候（共 {totalWithReplies} 条）。
			</p>
		</div>

		<div class="lg-guestbook__toolbar">
			<div class="lg-guestbook__sort" role="group" aria-label="留言排序">
				<button
					type="button"
					class="lg-control lg-guestbook__sort-btn"
					data-active={sort === "newest" ? "true" : undefined}
					onclick={() => (sort = "newest")}
				>
					最新
				</button>
				<button
					type="button"
					class="lg-control lg-guestbook__sort-btn"
					data-active={sort === "oldest" ? "true" : undefined}
					onclick={() => (sort = "oldest")}
				>
					最早
				</button>
			</div>

			{#if isAdmin}
				<button
					type="button"
					class="lg-control lg-guestbook__sort-btn"
					data-active={includeHidden ? "true" : undefined}
					onclick={() => (includeHidden = !includeHidden)}
				>
					{includeHidden ? "已含隐藏" : "显示隐藏"}
				</button>
			{/if}

			<AuthStatusMenu redirectTo="/guestbook/" compact zone="forest" />
		</div>
	</header>

	<GlassSurface
		variant="floating-chrome"
		zone="forest"
		elevation={2}
		radius="var(--lg-radius-panel)"
		class="lg-guestbook__header-card"
	>
		<div class="lg-guestbook__composer">
			{#if authStore.user}
				<form class="lg-guestbook__form" onsubmit={handleCreateEntry}>
					<GlassTextarea
						bind:value={draft}
						label="写一张湖畔便签"
						placeholder="留下一点微光或想说的话…"
						rows={3}
						maxlength={GUESTBOOK_MAX_LENGTH}
						showCount={true}
						error={submitError || undefined}
					/>
					<div class="lg-guestbook__form-foot">
						<span class="lg-guestbook__hint">将以 @{authStore.user.username} 身份悬浮展示</span>
						<div class="lg-guestbook__actions">
							{#if submitSuccess}
								<span class="lg-guestbook__ok" role="status">{submitSuccess}</span>
							{/if}
							<GlassButton type="submit" variant="tinted" size="sm" zone="forest" loading={submitting}>
								贴上便签
							</GlassButton>
						</div>
					</div>
				</form>
			{:else}
				<div class="lg-guestbook__login-row">
					<span class="lg-guestbook__login-hint">
						连接 GitHub 后即可在湖畔留下你的玻璃便签，所有人均可浏览。
					</span>
					<ContinueWithGithubButton redirectTo="/guestbook/" size="sm" variant="clear" />
				</div>
			{/if}
		</div>
	</GlassSurface>

	{#if actionError}
		<div class="lg-guestbook__banner lg-guestbook__banner--err" role="alert">
			<span>{actionError}</span>
		</div>
	{/if}

	{#if loading}
		<div class="lg-guestbook__state" aria-busy="true">正在读取湖畔便签…</div>
	{:else if loadError}
		<div class="lg-guestbook__banner lg-guestbook__banner--err" role="alert">
			<span>{loadError}</span>
			<GlassButton variant="clear" size="sm" zone="forest" onclick={() => void fetchPage(1, false)}>
				重试
			</GlassButton>
		</div>
	{:else if entries.length === 0}
		<div class="lg-guestbook__state">湖面还很安静，写下第一张便签吧。</div>
	{:else}
		{#snippet renderCard(node: CommentItem, depth: number)}
			{@const isOwner = authStore.user?.id === node.author.id}
			{@const canEdit = isOwner && node.status !== "deleted"}
			{@const canDelete = (isOwner || isAdmin) && node.status !== "deleted"}
			<GlassCommentCard
				comment={toCardData(node, depth)}
				zone="forest"
				canReply={Boolean(authStore.user) && node.status === "visible"}
				{canEdit}
				{canDelete}
				canModerate={isAdmin}
				onReply={startReply}
				onEdit={startEdit}
				onDelete={handleDelete}
				onModerate={handleModerate}
				class="lg-guestbook__card"
			>
				{#if editingId === node.id}
					<div class="lg-guestbook__inline">
						<GlassTextarea
							bind:value={editDraft}
							label="编辑便签"
							rows={3}
							maxlength={GUESTBOOK_MAX_LENGTH}
							showCount={true}
							error={editError || undefined}
						/>
						<div class="lg-guestbook__actions">
							<GlassButton
								variant="ghost-on-glass"
								size="sm"
								zone="forest"
								onclick={() => (editingId = null)}
							>
								取消
							</GlassButton>
							<GlassButton
								variant="tinted"
								size="sm"
								zone="forest"
								loading={editBusy}
								onclick={() => void handleSaveEdit(node.id)}
							>
								保存
							</GlassButton>
						</div>
					</div>
				{:else}
					<div class="lg-guestbook__prose">{@html node.bodyHtml}</div>
				{/if}

				{#snippet replies()}
					{#if replyToId === node.id}
						<form class="lg-guestbook__inline" onsubmit={(e) => handleReplySubmit(e, node.id)}>
							<GlassTextarea
								bind:value={replyDraft}
								label={`回复 @${node.author.username}`}
								placeholder="写下你的回应…"
								rows={2}
								maxlength={GUESTBOOK_MAX_LENGTH}
								showCount={true}
								error={replyError || undefined}
							/>
							<div class="lg-guestbook__actions">
								<GlassButton
									variant="ghost-on-glass"
									size="sm"
									zone="forest"
									onclick={() => (replyToId = null)}
								>
									取消
								</GlassButton>
								<GlassButton
									type="submit"
									variant="tinted"
									size="sm"
									zone="forest"
									loading={replyBusy}
								>
									发送回复
								</GlassButton>
							</div>
						</form>
					{/if}

					{#each node.replies as reply (reply.id)}
						{@render renderCard(reply, Math.min(1, depth + 1))}
					{/each}
				{/snippet}
			</GlassCommentCard>
		{/snippet}

		<!-- 独立悬浮玻璃便签网格：每张卡直接位于背景之上，保持独立态（embedded={false}）且疏朗留白 -->
		<div class="lg-guestbook__grid">
			{#each entries as entry (entry.id)}
				{@render renderCard(entry, 0)}
			{/each}
		</div>

		{#if hasMore}
			<div class="lg-guestbook__more">
				<GlassButton
					variant="clear"
					size="sm"
					zone="forest"
					loading={loadingMore}
					onclick={() => void fetchPage(page + 1, true)}
				>
					加载更多便签（已展示 {entries.length} / {total}）
				</GlassButton>
			</div>
		{/if}
	{/if}
</section>

<style>
	.lg-guestbook {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}

	:global(.lg-guestbook__header-card) {
		padding: 18px 20px;
	}

	.lg-guestbook__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 14px;
	}

	.lg-guestbook__eyebrow {
		margin: 0 0 4px;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		color: var(--lg-firefly-gold);
		font-weight: 600;
	}

	.lg-guestbook__title {
		margin: 0;
		font-family: var(--lg-font-display);
		font-size: var(--lg-text-h1);
		font-weight: 500;
		line-height: 1.15;
		color: var(--lg-ink-primary);
	}

	.lg-guestbook__subtitle {
		margin: 6px 0 0;
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-secondary);
	}

	.lg-guestbook__toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.lg-guestbook__sort {
		display: inline-flex;
		padding: 3px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-fill-recessed);
		border: 1px solid var(--lg-separator);
	}

	.lg-guestbook__sort-btn {
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

	.lg-guestbook__sort-btn[data-active="true"] {
		background: var(--lg-accent-soft);
		color: var(--lg-ink-primary);
	}

	.lg-guestbook__composer {
		min-width: 0;
	}

	.lg-guestbook__form,
	.lg-guestbook__inline {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.lg-guestbook__form-foot,
	.lg-guestbook__login-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
	}

	.lg-guestbook__actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.lg-guestbook__hint,
	.lg-guestbook__login-hint {
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-secondary);
	}

	.lg-guestbook__ok {
		font-size: var(--lg-text-micro);
		color: var(--lg-status-ok);
	}

	.lg-guestbook__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: 22px;
		align-items: start;
	}

	.lg-guestbook__prose {
		overflow-wrap: anywhere;
	}

	.lg-guestbook__prose :global(p) {
		margin: 0 0 8px;
	}

	.lg-guestbook__prose :global(p:last-child) {
		margin-bottom: 0;
	}

	.lg-guestbook__prose :global(a) {
		color: var(--lg-moonlight);
		text-decoration: underline;
	}

	.lg-guestbook__prose :global(pre) {
		padding: 10px 12px;
		border-radius: var(--lg-radius-control);
		background: var(--lg-fill-code);
		overflow-x: auto;
	}

	.lg-guestbook__state,
	.lg-guestbook__banner {
		padding: 18px 20px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator-strong);
		background: rgba(11, 22, 38, 0.74);
		color: var(--lg-ink-primary);
		font-size: var(--lg-text-ui);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		box-shadow: var(--lg-elev-2);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.lg-guestbook__banner--err {
		border-color: rgba(255, 180, 171, 0.48);
		background: rgba(36, 15, 22, 0.88);
		color: #ffd0ca;
	}

	.lg-guestbook__more {
		display: flex;
		justify-content: center;
	}
</style>
