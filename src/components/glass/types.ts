import type { Snippet } from "svelte";

export type GlassVariant =
	| "floating-chrome"
	| "overlay"
	| "launch-lens"
	| "dock-pill"
	| "reading-surface"
	| "note-card";

export type GlassZone = "moonlight" | "forest" | "reading";

export type GlassElevation = 0 | 1 | 2 | 3 | 4;

export type GlassFilterKind = "lens" | "pill" | "chrome" | "panel" | "none";

export type GlassButtonVariant =
	| "regular"
	| "clear"
	| "launch-lens"
	| "tinted"
	| "ghost-on-glass";

export type GlassButtonSize = "sm" | "md" | "lg" | "xl";
export type GlassButtonShape = "pill" | "rounded" | "circle";

export type DockRecedeState = "expanded" | "receded" | "hidden-edge";

export interface GlassDockItem {
	id: string;
	label: string;
	shortLabel?: string;
	href?: string;
	icon?: string;
	badge?: string | number;
	ariaLabel?: string;
}

export interface GlassNavItem {
	id: string;
	label: string;
	href?: string;
	ariaLabel?: string;
}

export interface GlassBreadcrumbItem {
	label: string;
	href?: string;
	onClick?: () => void;
}

export interface GlassDropdownItem {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	shortcut?: string;
	danger?: boolean;
	disabled?: boolean;
	dividerBefore?: boolean;
}

export interface GlassTocItem {
	id: string;
	text: string;
	depth: number;
}

export type GlassPlacement =
	| "bottom-start"
	| "bottom-center"
	| "bottom-end"
	| "top-start"
	| "top-center"
	| "top-end";

export type GlassCommentStatus = "visible" | "hidden" | "deleted";

export interface GlassCommentData {
	id: string;
	authorName: string;
	authorLogin: string;
	authorAvatar?: string;
	authorUrl?: string;
	isAdmin?: boolean;
	createdAt: string;
	updatedAt?: string;
	bodyHtml?: string;
	status?: GlassCommentStatus;
	depth?: number;
}

export type OptionalSnippet = Snippet | undefined;
