import type { GalleryItem } from "../../data/gallery.ts";
import type { ProjectRecord } from "../../data/projects.ts";
import type {
	ApiErrorBody,
	AuthMeResponse,
	CommentAuthor,
	CommentItem,
	CommentSort,
	CommentStatus,
	CommentTargetType,
	CommentsPage,
	HealthResponse,
	ModerationAction,
	SocialUser,
	UserRole,
} from "../../../functions/lib/types.ts";

export type {
	ApiErrorBody,
	AuthMeResponse,
	CommentAuthor,
	CommentItem,
	CommentSort,
	CommentStatus,
	CommentTargetType,
	CommentsPage,
	GalleryItem,
	HealthResponse,
	ModerationAction,
	ProjectRecord,
	SocialUser,
	UserRole,
};

export interface BlogPostNavLink {
	slug: string;
	title: string;
	url: string;
}

export interface BlogPostIndexItem {
	slug: string;
	title: string;
	published: string;
	updated: string | null;
	description: string;
	excerpt: string;
	category: string;
	tags: string[];
	readingMinutes: number;
	words: number;
	image: string | null;
	url: string;
	prev: BlogPostNavLink | null;
	next: BlogPostNavLink | null;
}

export interface BlogTaxonomyCount {
	name: string;
	count: number;
}

export interface BlogAboutData {
	title: string;
	markdown: string;
	html: string;
}

export interface BlogSiteMetadata {
	title: string;
	subtitle: string;
	author: string;
	avatarUrl: string;
	bio: string;
	githubUrl: string;
	siteUrl: string;
}

export interface BlogIndexData {
	generatedAt: string;
	site: BlogSiteMetadata;
	stats: {
		posts: number;
		categories: number;
		tags: number;
		projects: number;
		gallery: number;
	};
	posts: BlogPostIndexItem[];
	categories: BlogTaxonomyCount[];
	tags: BlogTaxonomyCount[];
	about: BlogAboutData;
	aboutHtml: string;
	projects: ProjectRecord[];
	gallery: GalleryItem[];
}

export interface ListCommentsOptions {
	sort?: CommentSort;
	page?: number;
	limit?: number;
	includeHidden?: boolean;
}

export interface CreateCommentPayload {
	bodyMd: string;
	parentId?: number | null;
}

export interface UpdateCommentPayload {
	bodyMd: string;
}

export interface ClientRequestOptions {
	baseUrl?: string;
	signal?: AbortSignal;
}

export class SocialApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly retryAfterSec?: number;

	constructor(status: number, code: string, message: string, retryAfterSec?: number) {
		super(message);
		this.name = "SocialApiError";
		this.status = status;
		this.code = code;
		this.retryAfterSec = retryAfterSec;
	}
}

function normalizeBaseUrl(baseUrl?: string): string {
	if (!baseUrl) return "";
	return baseUrl.replace(/\/+$/, "");
}

export function encodePostSlug(slug: string): string {
	return slug
		.replace(/^\/+|\/+$/g, "")
		.split("/")
		.map(encodeURIComponent)
		.join("/");
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) search.set(key, String(value));
	}
	const query = search.toString();
	return query ? `?${query}` : "";
}

async function requestApi<T>(
	path: string,
	init: RequestInit = {},
	options: ClientRequestOptions = {},
): Promise<T> {
	const url = `${normalizeBaseUrl(options.baseUrl)}${path}`;
	const headers = new Headers(init.headers);
	if (init.body !== undefined && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	headers.set("Accept", "application/json");

	const response = await fetch(url, {
		...init,
		headers,
		credentials: "same-origin",
		signal: options.signal,
	});

	const retryHeader = response.headers.get("retry-after");
	const retryAfterSec = retryHeader ? Number(retryHeader) : undefined;
	const text = await response.text();
	let data: unknown = null;
	if (text.length > 0) {
		try {
			data = JSON.parse(text) as unknown;
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new SocialApiError(
					response.status,
					"INVALID_JSON_RESPONSE",
					`接口返回非 JSON 响应（HTTP ${response.status}）。`,
					Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
				);
			}
			throw error;
		}
	}

	if (!response.ok) {
		const errBody = data as Partial<ApiErrorBody> | null;
		const code = errBody?.error?.code ?? `HTTP_${response.status}`;
		const message = errBody?.error?.message ?? `请求失败（HTTP ${response.status}）。`;
		throw new SocialApiError(
			response.status,
			code,
			message,
			Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
		);
	}

	return data as T;
}

export function getHealth(options?: ClientRequestOptions): Promise<HealthResponse> {
	return requestApi<HealthResponse>("/api/health", { method: "GET" }, options);
}

export function getAuthMe(options?: ClientRequestOptions): Promise<AuthMeResponse> {
	return requestApi<AuthMeResponse>("/api/auth/me", { method: "GET" }, options);
}

export function getGithubLoginUrl(redirectTo?: string, baseUrl?: string): string {
	const safeRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
		? redirectTo
		: "/";
	const query = buildQuery({ redirect: safeRedirect });
	return `${normalizeBaseUrl(baseUrl)}/api/auth/github${query}`;
}

export function logout(options?: ClientRequestOptions): Promise<{ ok: true }> {
	return requestApi<{ ok: true }>("/api/auth/logout", { method: "POST" }, options);
}

export function getPostComments(
	slug: string,
	params: ListCommentsOptions = {},
	options?: ClientRequestOptions,
): Promise<CommentsPage> {
	const query = buildQuery({
		sort: params.sort,
		page: params.page,
		limit: params.limit,
		includeHidden: params.includeHidden ? "true" : undefined,
	});
	return requestApi<CommentsPage>(
		`/api/posts/${encodePostSlug(slug)}/comments${query}`,
		{ method: "GET" },
		options,
	);
}

export async function createPostComment(
	slug: string,
	payload: CreateCommentPayload,
	options?: ClientRequestOptions,
): Promise<CommentItem> {
	const data = await requestApi<{ comment: CommentItem }>(
		`/api/posts/${encodePostSlug(slug)}/comments`,
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		options,
	);
	return data.comment;
}

export async function updateComment(
	id: number,
	payload: UpdateCommentPayload,
	options?: ClientRequestOptions,
): Promise<CommentItem> {
	const data = await requestApi<{ comment: CommentItem }>(
		`/api/comments/${id}`,
		{
			method: "PATCH",
			body: JSON.stringify(payload),
		},
		options,
	);
	return data.comment;
}

export function deleteComment(
	id: number,
	options?: ClientRequestOptions,
): Promise<{ ok: true; id: number }> {
	return requestApi<{ ok: true; id: number }>(
		`/api/comments/${id}`,
		{ method: "DELETE" },
		options,
	);
}

export async function moderateComment(
	id: number,
	action: ModerationAction,
	options?: ClientRequestOptions,
): Promise<CommentItem> {
	const data = await requestApi<{ ok: true; comment: CommentItem }>(
		`/api/admin/comments/${id}/moderate`,
		{
			method: "PATCH",
			body: JSON.stringify({ action }),
		},
		options,
	);
	return data.comment;
}

export function getGuestbookEntries(
	params: ListCommentsOptions = {},
	options?: ClientRequestOptions,
): Promise<CommentsPage> {
	const query = buildQuery({
		sort: params.sort,
		page: params.page,
		limit: params.limit,
		includeHidden: params.includeHidden ? "true" : undefined,
	});
	return requestApi<CommentsPage>(`/api/guestbook${query}`, { method: "GET" }, options);
}

export async function createGuestbookEntry(
	payload: CreateCommentPayload,
	options?: ClientRequestOptions,
): Promise<CommentItem> {
	const data = await requestApi<{ comment: CommentItem }>(
		"/api/guestbook",
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		options,
	);
	return data.comment;
}

export async function updateGuestbookEntry(
	id: number,
	payload: UpdateCommentPayload,
	options?: ClientRequestOptions,
): Promise<CommentItem> {
	const data = await requestApi<{ comment: CommentItem }>(
		`/api/guestbook/${id}`,
		{
			method: "PATCH",
			body: JSON.stringify(payload),
		},
		options,
	);
	return data.comment;
}

export function deleteGuestbookEntry(
	id: number,
	options?: ClientRequestOptions,
): Promise<{ ok: true; id: number }> {
	return requestApi<{ ok: true; id: number }>(
		`/api/guestbook/${id}`,
		{ method: "DELETE" },
		options,
	);
}

let cachedBlogIndex: Promise<BlogIndexData> | null = null;

export function fetchBlogIndex(
	indexUrl = "/data/blog-index.json",
	options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<BlogIndexData> {
	if (!options.force && cachedBlogIndex && indexUrl === "/data/blog-index.json") {
		return cachedBlogIndex;
	}
	const request = fetch(indexUrl, {
		headers: { Accept: "application/json" },
		signal: options.signal,
	}).then(async (response) => {
		if (!response.ok) {
			throw new SocialApiError(
				response.status,
				"BLOG_INDEX_LOAD_FAILED",
				`无法加载站点数据索引（HTTP ${response.status}）。`,
			);
		}
		return (await response.json()) as BlogIndexData;
	});
	if (indexUrl === "/data/blog-index.json") {
		cachedBlogIndex = request;
	}
	return request;
}
