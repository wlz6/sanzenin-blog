<script module lang="ts">
import type { BlogIndexData } from "../../lib/api/social-client.ts";

export type SpaceId = "blog" | "projects" | "gallery" | "about" | "guestbook";

export interface WorkspaceSiteMeta {
	siteTitle: string;
	profileName: string;
	profileBio: string;
	githubUrl: string;
}

export interface InitialBlogFilter {
	category?: string;
	tag?: string;
	query?: string;
	page?: number;
}

let cachedBlogIndex: BlogIndexData | null = null;
let pendingBlogIndex: Promise<BlogIndexData> | null = null;
const savedColumnScroll = new Map<string, number>();
</script>

<script lang="ts">
import { onMount, tick, untrack } from "svelte";
import {
	GlassButton,
	GlassDialog,
	GlassInput,
	GlassNavigation,
	GlassPanel,
	GlassPopover,
	type GlassNavItem,
} from "../glass/index.ts";
import LaunchScreen from "../launch/LaunchScreen.svelte";
import { AuthStatusMenu, GuestbookSpace } from "../social/index.ts";
import {
	AboutSpace,
	BlogSpace,
	GallerySpace,
	ProjectsSpace,
} from "../spaces/index.ts";
import { fetchBlogIndex } from "../../lib/api/social-client.ts";
import {
	TransitionCoordinator,
	evaluateLaunchTimeline,
	type LaunchTimelineFrame,
	type WorkspaceStage,
} from "../../lib/liquid-glass/index.ts";
import {
	sceneBridge,
	type SceneQuality,
	type TimeOfDay,
} from "../../scene/scene-bridge.ts";
import {
	arbitrateWheel,
	collectScrollablesFromPath,
	isEditableEventTarget,
} from "../../workspace/input-arbiter.ts";
import {
	MOMENTUM_SPRING,
	SpringCamera2D,
	projectMomentum,
	rubberband,
} from "../../workspace/spring-camera.ts";

interface SpaceDefinition {
	id: SpaceId;
	label: string;
	labelZh: string;
	caption: string;
	subtitle: string;
	href: string;
	icon: string;
}

const SPACES: readonly SpaceDefinition[] = [
	{
		id: "blog",
		label: "Blog",
		labelZh: "文章",
		caption: "01 / BLOG ARCHIVE",
		subtitle: "技术笔记、阅读摘录与日常观察",
		href: "/blog/",
		icon: "✦",
	},
	{
		id: "projects",
		label: "Projects",
		labelZh: "项目",
		caption: "02 / OPEN SOURCE",
		subtitle: "公开代码仓库与系统实验",
		href: "/projects/",
		icon: "⌘",
	},
	{
		id: "gallery",
		label: "Gallery",
		labelZh: "画廊",
		caption: "03 / VISUAL ARCHIVE",
		subtitle: "湖畔光影与图文摘选",
		href: "/gallery/",
		icon: "◈",
	},
	{
		id: "about",
		label: "About",
		labelZh: "关于",
		caption: "04 / PROFILE",
		subtitle: "关于作者与这座湖畔博客",
		href: "/about/",
		icon: "☾",
	},
	{
		id: "guestbook",
		label: "Guestbook",
		labelZh: "留言板",
		caption: "05 / FLOATING NOTES",
		subtitle: "湖面之上的轻量留言空间",
		href: "/guestbook/",
		icon: "✎",
	},
];

const TIME_OPTIONS: readonly { id: TimeOfDay; label: string }[] = [
	{ id: "blue_hour", label: "蓝调时刻" },
	{ id: "moonlit", label: "银月湖夜" },
	{ id: "midnight", label: "极静深夜" },
	{ id: "dusk", label: "暮色余晖" },
];

const QUALITY_OPTIONS: readonly { id: SceneQuality; label: string }[] = [
	{ id: "high", label: "高画质" },
	{ id: "balanced", label: "均衡" },
	{ id: "static", label: "静态省电" },
];

let {
	siteMeta,
	initialStage = "launch",
	initialSpace = "blog",
	initialBlogFilter = {},
}: {
	siteMeta: WorkspaceSiteMeta;
	initialStage?: WorkspaceStage;
	initialSpace?: SpaceId;
	initialBlogFilter?: InitialBlogFilter;
} = $props();

let stage = $state<WorkspaceStage>(initialStage);
let activeSpace = $state<SpaceId>(initialSpace);
let blogFilter = $state<InitialBlogFilter>(initialBlogFilter);
let frame = $state<LaunchTimelineFrame>(
	evaluateLaunchTimeline(
		initialStage === "workspace" ? 1 : 0,
		initialStage === "workspace" ? "to-workspace" : "to-launch",
		false,
	),
);
let targetStage: WorkspaceStage = initialStage;
let reducedMotion = $state(false);
let grabbing = $state(false);
let viewportWidth = $state(typeof window !== "undefined" ? window.innerWidth : 1280);
let viewportHeight = $state(typeof window !== "undefined" ? window.innerHeight : 800);
let currentPath = $state(
	initialStage === "launch"
		? "/"
		: (SPACES.find((s) => s.id === initialSpace)?.href ?? "/blog/"),
);

// 静态博客索引数据
let blogData = $state<BlogIndexData | null>(cachedBlogIndex);
let dataError = $state<string | null>(null);
let dataLoading = $state(!cachedBlogIndex);

// 搜索启动器与场景控制气泡
let searchOpen = $state(false);
let searchQuery = $state("");
let scenePopoverOpen = $state(false);
let scenePhase = $state<TimeOfDay>(sceneBridge.getState().timeOfDay);
const scenePhaseIndex = $derived(TIME_OPTIONS.findIndex((option) => option.id === scenePhase));
let sceneQuality = $state<SceneQuality>(sceneBridge.getState().quality);
let audioEnabled = $state<boolean>(sceneBridge.getState().audioEnabled);

let stageViewportEl = $state<HTMLDivElement>();
let trackEl = $state<HTMLDivElement>();
let camera: SpringCamera2D | undefined;
let coordinator: TransitionCoordinator | undefined;
let wheelSnapTimer: number | undefined;
let suppressClick = false;
let drag: {
	id: number;
	touch: boolean;
	x: number;
	y: number;
	camX: number;
	samples: { x: number; time: number }[];
} | null = null;

const isMobileViewport = $derived(viewportWidth <= 680);
const columnGap = $derived(isMobileViewport ? 14 : 32);
const columnWidth = $derived(
	isMobileViewport
		? Math.max(280, viewportWidth - 20)
		: viewportWidth <= 1024
			? Math.min(760, viewportWidth - 64)
			: Math.min(900, Math.max(640, viewportWidth - 180)),
);

const columnPositions = $derived(
	SPACES.map((_, index) => index * (columnWidth + columnGap)),
);
const activeSpaceIndex = $derived(
	Math.max(0, SPACES.findIndex((item) => item.id === activeSpace)),
);
const workspaceVisible = $derived(stage === "workspace" || frame.workspaceOpacity > 0.01);
const launchVisible = $derived(stage === "launch" || frame.heroOpacity > 0.01);

const navItems = $derived<GlassNavItem[]>(
	SPACES.map((space) => ({
		id: space.id,
		label: space.label,
		href: space.href,
		ariaLabel: `${space.label} · ${space.labelZh}`,
	})),
);

const searchResults = $derived.by(() => {
	const posts = blogData?.posts ?? [];
	const q = searchQuery.trim().toLowerCase();
	if (!q) return posts.slice(0, 8);
	return posts
		.filter((post) => {
			const hay = `${post.title} ${post.description} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
			return hay.includes(q);
		})
		.slice(0, 12);
});

function cameraXForIndex(index: number): number {
	const safeIndex = Math.max(0, Math.min(SPACES.length - 1, index));
	const colLeft = columnPositions[safeIndex] ?? 0;
	return colLeft + columnWidth / 2 - viewportWidth / 2;
}

function getHorizontalBounds(): { minX: number; maxX: number } {
	return {
		minX: cameraXForIndex(0),
		maxX: cameraXForIndex(SPACES.length - 1),
	};
}

function nearestIndexForCameraX(camX: number): number {
	let bestIndex = 0;
	let bestDist = Infinity;
	for (let i = 0; i < SPACES.length; i++) {
		const dist = Math.abs(cameraXForIndex(i) - camX);
		if (dist < bestDist) {
			bestDist = dist;
			bestIndex = i;
		}
	}
	return bestIndex;
}

function resolveRouteFromLocation(pathname: string, search: string): {
	stage: WorkspaceStage;
	space: SpaceId;
	filter: InitialBlogFilter;
} | null {
	const clean = pathname.replace(/\/+$/, "") || "/";
	const params = new URLSearchParams(search);
	const filter: InitialBlogFilter = {
		category: params.get("category") ?? undefined,
		tag: params.get("tag") ?? undefined,
		query: params.get("q") ?? undefined,
	};

	if (clean === "/") {
		return { stage: "launch", space: "blog", filter };
	}
	if (clean === "/blog" || clean === "/archive" || clean === "/categories" || clean === "/tags") {
		return { stage: "workspace", space: "blog", filter };
	}
	const pageMatch = /^\/(\d+)$/.exec(clean);
	if (pageMatch) {
		return {
			stage: "workspace",
			space: "blog",
			filter: { ...filter, page: Math.max(1, Number.parseInt(pageMatch[1], 10)) },
		};
	}
	if (clean === "/projects") return { stage: "workspace", space: "projects", filter };
	if (clean === "/gallery") return { stage: "workspace", space: "gallery", filter };
	if (clean === "/about") return { stage: "workspace", space: "about", filter };
	if (clean === "/guestbook") return { stage: "workspace", space: "guestbook", filter };
	return null;
}

function syncSwupLocation(targetUrl: string) {
	const win = window as Window & {
		swup?: { location?: URL };
	};
	if (win.swup) {
		win.swup.location = new URL(targetUrl, window.location.origin);
	}
}

function updateDocumentTitle(targetStage: WorkspaceStage, spaceId: SpaceId) {
	if (typeof document === "undefined") return;
	if (targetStage === "launch") {
		document.title = siteMeta.siteTitle;
		return;
	}
	const space = SPACES.find((item) => item.id === spaceId);
	document.title = space ? `${space.label} - ${siteMeta.siteTitle}` : siteMeta.siteTitle;
}

function commitWorkspaceHistory(
	targetStage: WorkspaceStage,
	spaceId: SpaceId,
	mode: "push" | "replace",
) {
	if (typeof window === "undefined") return;
	const targetUrl =
		targetStage === "launch"
			? "/"
			: (SPACES.find((s) => s.id === spaceId)?.href ?? "/blog/");
	currentPath = targetUrl;
	document.documentElement.dataset.etherealMode = "spatial";
	updateDocumentTitle(targetStage, spaceId);

	const statePayload = {
		url: targetUrl,
		source: "swup",
		lgWorkspace: true,
		stage: targetStage,
		space: spaceId,
		random: Math.random(),
	};
	if (window.location.pathname === targetUrl && mode === "push") {
		window.history.replaceState(statePayload, "", targetUrl);
	} else if (mode === "push") {
		window.history.pushState(statePayload, "", targetUrl);
	} else {
		window.history.replaceState(statePayload, "", targetUrl);
	}
	syncSwupLocation(targetUrl);
}

function ensureBlogData() {
	if (cachedBlogIndex) {
		blogData = cachedBlogIndex;
		dataLoading = false;
		return;
	}
	dataLoading = true;
	dataError = null;
	if (!pendingBlogIndex) {
		pendingBlogIndex = fetchBlogIndex("/data/blog-index.json");
	}
	pendingBlogIndex
		.then((data) => {
			cachedBlogIndex = data;
			blogData = data;
			dataLoading = false;
		})
		.catch((err: unknown) => {
			pendingBlogIndex = null;
			dataError = err instanceof Error ? err.message : "博客索引加载失败";
			dataLoading = false;
		});
}

function focusSpace(
	spaceId: SpaceId,
	options: { history?: "push" | "replace" | "none"; instant?: boolean; vx?: number } = {},
) {
	const index = SPACES.findIndex((s) => s.id === spaceId);
	if (index < 0) return;
	activeSpace = spaceId;

	const targetX = cameraXForIndex(index);
	if (camera) {
		if (options.instant || reducedMotion) {
			camera.snapTo(targetX, 0, 1);
		} else if (typeof options.vx === "number") {
			camera.animateTo(targetX, 0, { vx: options.vx, config: MOMENTUM_SPRING });
		} else {
			camera.animateTo(targetX, 0);
		}
	}

	if (options.history && options.history !== "none") {
		commitWorkspaceHistory("workspace", spaceId, options.history);
	}
}

function enterWorkspace(space: SpaceId, pushHistory: boolean) {
	if (!coordinator) return;
	targetStage = "workspace";
	ensureBlogData();
	focusSpace(space, { instant: true });

	void coordinator.transitionTo("workspace", {
		onFrame: (next) => {
			frame = next;
		},
		onRouteCommit: () => {
			stage = "workspace";
			if (pushHistory) commitWorkspaceHistory("workspace", space, "push");
			else updateDocumentTitle("workspace", space);
		},
	});
}

function handleLaunch() {
	if (targetStage !== "workspace") enterWorkspace("blog", true);
}

function returnToLaunch(pushHistory = true) {
	if (!coordinator) return;
	searchOpen = false;
	scenePopoverOpen = false;
	targetStage = "launch";
	void coordinator.transitionTo("launch", {
		onFrame: (next) => {
			frame = next;
		},
		onRouteCommit: () => {
			stage = "launch";
			if (pushHistory) {
				commitWorkspaceHistory("launch", activeSpace, "push");
			} else {
				currentPath = "/";
				updateDocumentTitle("launch", activeSpace);
			}
		},
	});
}

function handleSpaceLinkSelect(id: string, event?: MouseEvent) {
	if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) {
		return;
	}
	event?.preventDefault();
	const found = SPACES.find((s) => s.id === id);
	if (!found) return;
	if (targetStage === "launch") enterWorkspace(found.id, true);
	else focusSpace(found.id, { history: "push" });
}

function handleColumnScroll(spaceId: SpaceId, top: number) {
	savedColumnScroll.set(spaceId, top);
}

function handleWheel(event: WheelEvent) {
	if (stage !== "workspace" || !camera || searchOpen) return;
	const decision = arbitrateWheel({
		defaultPrevented: event.defaultPrevented,
		ctrlOrMeta: event.ctrlKey || event.metaKey,
		shiftKey: event.shiftKey,
		deltaX: event.deltaX,
		deltaY: event.deltaY,
		deltaMode: event.deltaMode,
		viewportHeight,
		modalOpen: searchOpen || scenePopoverOpen,
		overview: false,
		isHomeColumn: false,
		scrollables: collectScrollablesFromPath(event.composedPath()),
	});
	if (decision.action !== "pan-x") return;

	event.preventDefault();
	const { minX, maxX } = getHorizontalBounds();
	const current = camera.getPosition().x;
	const nextX = Math.max(minX, Math.min(maxX, current + decision.delta));
	camera.animateTo(nextX, 0);

	window.clearTimeout(wheelSnapTimer);
	wheelSnapTimer = window.setTimeout(() => {
		if (!camera) return;
		const snappedIdx = nearestIndexForCameraX(camera.getPosition().x);
		const targetSpace = SPACES[snappedIdx]?.id ?? "blog";
		focusSpace(targetSpace, { history: targetSpace === activeSpace ? "none" : "replace" });
	}, 180);
}

function beginPointer(event: PointerEvent) {
	if (
		stage !== "workspace" ||
		!event.isPrimary ||
		event.button !== 0 ||
		!camera ||
		searchOpen ||
		scenePopoverOpen
	) {
		return;
	}
	const target = event.target instanceof Element ? event.target : null;
	const touch = event.pointerType !== "mouse";
	const interactive = target?.closest("button, a, input, select, textarea, summary, [contenteditable]");
	suppressClick = false;
	if (touch ? interactive : target?.closest(".lg-panel, .lg-guestbook-col")) return;

	window.clearTimeout(wheelSnapTimer);
	drag = {
		id: event.pointerId,
		touch,
		x: event.clientX,
		y: event.clientY,
		camX: camera.getPosition().x,
		samples: [{ x: event.clientX, time: performance.now() }],
	};
}

function movePointer(event: PointerEvent) {
	if (!drag || drag.id !== event.pointerId || !camera || !stageViewportEl) return;
	const dx = event.clientX - drag.x;
	const dy = event.clientY - drag.y;
	if (!grabbing) {
		if (Math.hypot(dx, dy) < 10) return;
		if (drag.touch && Math.abs(dx) <= Math.abs(dy)) {
			drag = null;
			return;
		}
		grabbing = true;
		suppressClick = true;
		drag.camX = camera.getPosition().x + dx;
		stageViewportEl.setPointerCapture(event.pointerId);
	}

	drag.samples.push({ x: event.clientX, time: performance.now() });
	if (drag.samples.length > 6) drag.samples.shift();

	const { minX, maxX } = getHorizontalBounds();
	const rawX = drag.camX - dx;
	const clamped = Math.max(minX, Math.min(maxX, rawX));
	const resisted =
		clamped + Math.sign(rawX - clamped) * rubberband(Math.abs(rawX - clamped), viewportWidth, 0.55);
	camera.trackDirect(resisted, 0);
}

function finishPointer(event: PointerEvent) {
	if (!drag || drag.id !== event.pointerId) return;
	const { samples } = drag;
	drag = null;
	if (!grabbing || !camera) return;
	grabbing = false;

	const first = samples[0];
	const last = samples[samples.length - 1] ?? first;
	const elapsed = Math.max(16, last.time - first.time) / 1000;
	const vx =
		event.type === "pointerup" && performance.now() - last.time < 100
			? (first.x - last.x) / elapsed
			: 0;
	const currentX = camera.getPosition().x;
	const { minX, maxX } = getHorizontalBounds();
	const projectedX = Math.max(minX, Math.min(maxX, currentX + projectMomentum(vx, 0.9965)));
	const targetIdx = nearestIndexForCameraX(projectedX);
	const targetSpace = SPACES[targetIdx]?.id ?? activeSpace;
	focusSpace(targetSpace, {
		vx,
		history: targetSpace === activeSpace ? "none" : "replace",
	});
}

function preventDragClick(event: MouseEvent) {
	if (!suppressClick || event.detail === 0) return;
	suppressClick = false;
	event.preventDefault();
	event.stopPropagation();
}

function handleKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented || event.isComposing) return;
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
		if (stage !== "workspace") return;
		event.preventDefault();
		if (event.repeat) return;
		scenePopoverOpen = false;
		searchOpen = !searchOpen;
		return;
	}
	if (stage !== "workspace" || searchOpen || isEditableEventTarget(event)) return;
	if (event.altKey && !event.ctrlKey && !event.metaKey) {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			const prev = SPACES[Math.max(0, activeSpaceIndex - 1)];
			if (prev) focusSpace(prev.id, { history: "push" });
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			const next = SPACES[Math.min(SPACES.length - 1, activeSpaceIndex + 1)];
			if (next) focusSpace(next.id, { history: "push" });
		}
	}
}

function selectScenePhase(phase: TimeOfDay) {
	sceneBridge.setTimeOfDay(phase);
	if (typeof localStorage !== "undefined") {
		localStorage.setItem("firefly:scene-phase", phase);
	}
}

function toggleAmbientAudio() {
	void sceneBridge.setAudioEnabled(!audioEnabled);
}

function selectSceneQuality(quality: SceneQuality) {
	sceneBridge.setQuality(quality);
}

$effect(() => {
	const stageEl = stageViewportEl;
	const worldEl = trackEl;
	if (!stageEl || !worldEl) return;

	camera = new SpringCamera2D((x) => {
		worldEl.style.transform = `translate3d(${(-x).toFixed(2)}px, 0, 0)`;
	});
	untrack(() => {
		camera?.setReducedMotion(reducedMotion);
		camera?.snapTo(cameraXForIndex(activeSpaceIndex), 0, 1);
	});

	stageEl.addEventListener("wheel", handleWheel, { passive: false });
	stageEl.addEventListener("click", preventDragClick, true);

	return () => {
		window.clearTimeout(wheelSnapTimer);
		stageEl.removeEventListener("wheel", handleWheel);
		stageEl.removeEventListener("click", preventDragClick, true);
		camera?.cancel();
		camera = undefined;
	};
});

$effect(() => {
	camera?.setReducedMotion(reducedMotion);
	coordinator?.setReducedMotion(reducedMotion);
});

onMount(() => {
	viewportWidth = window.innerWidth;
	viewportHeight = window.innerHeight;

	const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
	const syncReduced = () => {
		reducedMotion =
			mq.matches || document.documentElement.classList.contains("motion-reduced");
	};
	syncReduced();
	mq.addEventListener("change", syncReduced);
	const motionObserver = new MutationObserver(syncReduced);
	motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

	coordinator = new TransitionCoordinator(initialStage);
	coordinator.setReducedMotion(reducedMotion);
	coordinator.attachScene(sceneBridge);
	frame = coordinator.snap(initialStage);

	if (initialStage === "workspace") {
		sceneBridge.setInteractionMode("workspace");
		sceneBridge.setCameraTransition(1);
		sceneBridge.setOpticalBlur(0.36, 0.14);
		ensureBlogData();
	} else {
		sceneBridge.setInteractionMode("launch");
		sceneBridge.setCameraTransition(0);
		sceneBridge.setOpticalBlur(0, 0);
	}

	// 标记当前历史条目为可由工作区接管的路径，支持前进/后退
	commitWorkspaceHistory(initialStage, initialSpace, "replace");

	const unsubScene = sceneBridge.subscribe((s) => {
		scenePhase = s.timeOfDay;
		sceneQuality = s.quality;
		audioEnabled = s.audioEnabled;
	});

	const onResize = () => {
		viewportWidth = window.innerWidth;
		viewportHeight = window.innerHeight;
		void tick().then(() => {
			camera?.snapTo(cameraXForIndex(activeSpaceIndex), 0, 1);
		});
	};

	const onPopState = () => {
		const resolved = resolveRouteFromLocation(window.location.pathname, window.location.search);
		if (!resolved) return;
		syncSwupLocation(window.location.pathname + window.location.search);
		blogFilter = resolved.filter;
		currentPath = window.location.pathname;

		if (resolved.stage === "launch") {
			void returnToLaunch(false);
			return;
		}

		ensureBlogData();
		if (stage === "launch" || targetStage === "launch") {
			enterWorkspace(resolved.space, false);
			return;
		}

		updateDocumentTitle("workspace", resolved.space);
		focusSpace(resolved.space, { history: "none" });
	};

	window.addEventListener("resize", onResize, { passive: true });
	window.addEventListener("popstate", onPopState);
	window.addEventListener("pointermove", movePointer, { passive: true });
	window.addEventListener("pointerup", finishPointer, { passive: true });
	window.addEventListener("pointercancel", finishPointer, { passive: true });
	document.addEventListener("keydown", handleKeydown);

	return () => {
		mq.removeEventListener("change", syncReduced);
		motionObserver.disconnect();
		unsubScene();
		coordinator?.dispose();
		window.removeEventListener("resize", onResize);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("pointermove", movePointer);
		window.removeEventListener("pointerup", finishPointer);
		window.removeEventListener("pointercancel", finishPointer);
		document.removeEventListener("keydown", handleKeydown);
	};
});

const workspaceSettled = $derived(
	reducedMotion ||
		(frame.workspaceOpacity >= 0.999 &&
			Math.abs(frame.workspaceTranslateY) < 0.05 &&
			Math.abs(frame.workspaceScale - 1) < 0.0005),
);
const workspaceTransform = $derived(
	workspaceSettled
		? "none"
		: `translate3d(0, ${frame.workspaceTranslateY.toFixed(2)}px, 0) scale(${frame.workspaceScale.toFixed(4)})`,
);
</script>

{#snippet timeChoices(onLaunchScreen: boolean)}
	<div
		class="lg-scene-chips"
		class:lg-launch-chips={onLaunchScreen}
		role="group"
		aria-label="时刻氛围"
	>
		{#if onLaunchScreen}
			<span
				class="lg-phase-indicator"
				aria-hidden="true"
				style:transform={`translateX(calc(${scenePhaseIndex * 100}% + ${scenePhaseIndex * 3}px))`}
			></span>
		{/if}
		{#each TIME_OPTIONS as option (option.id)}
			<button
				type="button"
				class="lg-control lg-scene-chip"
				aria-pressed={scenePhase === option.id}
				onclick={() => selectScenePhase(option.id)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{/snippet}

<div id="firefly-workspace-root" class="lg-workspace-root" data-stage={stage}>
	{#if launchVisible}
		<LaunchScreen
			profileName={siteMeta.profileName}
			githubUrl={siteMeta.githubUrl}
			{frame}
			active={frame.heroOpacity > 0.15 && !frame.workspaceInteractive}
			{reducedMotion}
			{timeChoices}
			onLaunch={handleLaunch}
		/>
	{/if}

	{#if workspaceVisible}
		<!-- 顶部轻量导航栏（仅 Launch 后呈现） -->
		<div
			class="lg-workspace-chrome"
			data-interactive={frame.workspaceInteractive ? "true" : "false"}
			inert={!frame.workspaceInteractive}
			style:opacity={frame.navOpacity.toFixed(4)}
		>
			<GlassNavigation
				brand={siteMeta.profileName}
				brandHref="/"
				items={navItems}
				activeId={activeSpace}
				zone="forest"
				onBrandClick={(e) => {
					if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
					e.preventDefault();
					void returnToLaunch(true);
				}}
				onSelect={(item, e) => handleSpaceLinkSelect(item.id, e)}
			>
				{#snippet trailing()}
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						ariaLabel="搜索文章 (Ctrl/Cmd + K)"
						title="搜索文章 (Ctrl/Cmd + K)"
						onclick={() => {
							searchOpen = true;
						}}
					>
						⌕ ⌘K
					</GlassButton>
					{@render sceneControls()}
					<AuthStatusMenu redirectTo={currentPath} compact zone="forest" />
				{/snippet}
			</GlassNavigation>
		</div>

		<!-- macOS / niri 启发横向空间轨道（列内独立纵向阅读滚动） -->
		<div
			bind:this={stageViewportEl}
			class="lg-stage-viewport"
			class:grabbing
			data-ew-stage="true"
			role="region"
			aria-label="博客横向空间工作区"
			aria-hidden={!frame.workspaceInteractive ? "true" : undefined}
			inert={!frame.workspaceInteractive}
			style:opacity={frame.workspaceOpacity.toFixed(4)}
			style:transform={workspaceTransform}
			style:pointer-events={frame.workspaceInteractive ? "auto" : "none"}
			onpointerdown={beginPointer}
		>
			<div bind:this={trackEl} class="lg-stage-track">
				{#each SPACES as space, idx (space.id)}
					{@const isFocused = space.id === activeSpace}
					<div
						class="lg-space-col"
						data-space-id={space.id}
						data-focused={isFocused ? "true" : "false"}
						style:left={`${columnPositions[idx]}px`}
						style:width={`${columnWidth}px`}
						style:opacity={isFocused ? "1" : frame.peekOpacity.toFixed(3)}
					>
						{#if space.id === "guestbook"}
							<!-- 留言板保持湖面透视留白，悬浮玻璃便签卡片直接浮于湖景之上 -->
							<section
								class="lg-guestbook-col"
								data-lg-scroll-body="true"
								aria-label="留言板空间"
								onpointerdown={() => {
									if (!isFocused) focusSpace("guestbook", { history: "push" });
								}}
								onscroll={(e) =>
									handleColumnScroll("guestbook", (e.currentTarget as HTMLElement).scrollTop)}
							>
								<GuestbookSpace />
							</section>
						{:else}
							<GlassPanel
								variant="floating-chrome"
								zone="forest"
								elevation={isFocused ? 3 : 1}
								focused={isFocused}
								title={space.label}
								caption={space.caption}
								subtitle={space.subtitle}
								scrollEdge="soft"
								initialScrollTop={savedColumnScroll.get(space.id) ?? 0}
								class="lg-space-panel"
								onFocus={() => {
									if (!isFocused) focusSpace(space.id, { history: "push" });
								}}
								onScroll={(top) => handleColumnScroll(space.id, top)}
							>
								{#if dataLoading}
									<div class="lg-space-status" role="status">正在加载湖畔档案…</div>
								{:else if dataError}
									<div class="lg-space-status lg-space-status--err" role="alert">
										<p>{dataError}</p>
										<GlassButton variant="regular" size="sm" onclick={ensureBlogData}>
											重新加载
										</GlassButton>
									</div>
								{:else if blogData}
									{#if space.id === "blog"}
										<BlogSpace
											posts={blogData.posts}
											categories={blogData.categories}
											tags={blogData.tags}
											initialCategory={blogFilter.category}
											initialTag={blogFilter.tag}
											initialQuery={blogFilter.query}
											initialPage={blogFilter.page}
										/>
									{:else if space.id === "projects"}
										<ProjectsSpace projects={blogData.projects} />
									{:else if space.id === "gallery"}
										<GallerySpace items={blogData.gallery} />
									{:else if space.id === "about"}
										<AboutSpace aboutHtml={blogData.aboutHtml} site={blogData.site} />
									{/if}
								{/if}
							</GlassPanel>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Cmd/Ctrl+K 全站 96 篇文章快捷检索对话框 -->
		<GlassDialog
			bind:open={searchOpen}
			title="快速检索文章"
			description="检索全部文章标题、分类与标签，回车或点击直达阅读"
			size="md"
			instant={true}
		>
			<div class="lg-search-box">
				<GlassInput
					bind:value={searchQuery}
					type="search"
					placeholder="输入关键词、标签或分类…"
					ariaLabel="搜索文章"
					enterkeyhint="search"
				/>

				<div class="lg-search-results" role="list">
					{#if searchResults.length === 0}
						<p class="lg-search-empty">未找到匹配的文章。</p>
					{:else}
						{#each searchResults as post (post.slug)}
							<a
								href={post.url}
								class="lg-control lg-search-item"
								role="listitem"
								onclick={() => {
									searchOpen = false;
								}}
							>
								<span class="lg-search-item__title">{post.title}</span>
								<span class="lg-search-item__meta">
									{post.category || "未分类"} · {post.published} · {post.readingMinutes} 分钟
								</span>
							</a>
						{/each}
					{/if}
				</div>
			</div>
		</GlassDialog>
	{/if}
</div>

{#snippet sceneControls()}
	<GlassPopover bind:open={scenePopoverOpen} placement="bottom-end" title="湖畔氛围与场景" ariaLabel="场景控制面板">
		{#snippet trigger({ toggle, open })}
			<GlassButton
				variant="ghost-on-glass"
				shape="circle"
				size="sm"
				pressed={open}
				ariaLabel="湖畔场景控制"
				title="湖畔时刻、声景与画质"
				onclick={toggle}
			>
				☾
			</GlassButton>
		{/snippet}
		{#snippet children({ close })}
			<div class="lg-scene-controls">
				<div class="lg-scene-group">
					<span class="lg-scene-label lg-type-micro">时刻氛围</span>
					{@render timeChoices(false)}
				</div>
				<div class="lg-scene-group">
					<span class="lg-scene-label lg-type-micro">渲染画质</span>
					<div class="lg-scene-chips">
						{#each QUALITY_OPTIONS as option (option.id)}
							<button
								type="button"
								class="lg-control lg-scene-chip"
								aria-pressed={sceneQuality === option.id}
								onclick={() => selectSceneQuality(option.id)}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>
				<div class="lg-scene-footer-actions">
					<GlassButton variant="ghost-on-glass" size="sm" pressed={audioEnabled} onclick={toggleAmbientAudio}>
						{audioEnabled ? "声景：开启" : "声景：静音"}
					</GlassButton>
					<GlassButton
						variant="ghost-on-glass"
						size="sm"
						onclick={() => {
							close();
							returnToLaunch();
						}}
					>
						返回湖畔首屏
					</GlassButton>
				</div>
			</div>
		{/snippet}
	</GlassPopover>
{/snippet}

<style>
	.lg-workspace-root {
		position: fixed;
		inset: 0;
		height: 100dvh;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
	}

	.lg-workspace-chrome {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 42;
	}

	.lg-workspace-chrome[data-interactive="true"] :global(.lg-nav) {
		pointer-events: auto;
	}

	.lg-stage-viewport {
		position: fixed;
		inset: 0;
		height: 100dvh;
		z-index: 22;
		overflow: hidden;
		touch-action: pan-y;
	}

	.lg-stage-viewport.grabbing {
		cursor: grabbing;
		user-select: none;
	}

	.lg-stage-track {
		position: absolute;
		top: calc(74px + var(--lg-safe-top));
		bottom: calc(16px + var(--lg-safe-bottom));
		left: 0;
		right: 0;
		transform-origin: 0 0;
		will-change: transform;
	}

	.lg-space-col {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		transition: opacity 220ms var(--lg-ease-out);
	}

	:global(.lg-space-panel) {
		height: 100%;
	}

	.lg-guestbook-col {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 6px 6px 36px;
		scrollbar-width: thin;
		scrollbar-color: rgba(185, 216, 232, 0.30) transparent;
	}

	.lg-space-status {
		padding: 36px 16px;
		text-align: center;
		color: var(--lg-ink-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.lg-space-status--err {
		color: var(--lg-status-err);
	}

	.lg-scene-controls {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: min(15.5rem, calc(100vw - 56px - var(--lg-safe-left) - var(--lg-safe-right)));
	}

	.lg-scene-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.lg-scene-label {
		color: var(--lg-ink-tertiary);
	}

	.lg-scene-chips {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.lg-launch-chips {
		position: relative;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 3px;
		padding: 4px;
	}

	.lg-phase-indicator {
		position: absolute;
		inset-block: 4px;
		left: 4px;
		width: calc((100% - 17px) / 4);
		border: 1px solid var(--lg-firefly-glow);
		border-radius: var(--lg-radius-pill);
		background: var(--lg-firefly-soft);
		pointer-events: none;
		transition: transform var(--lg-dur-popover) var(--lg-ease-drawer);
	}

	.lg-launch-chips .lg-scene-chip {
		position: relative;
		min-height: 44px;
		padding-inline: clamp(4px, 2vw, 14px);
		border-radius: var(--lg-radius-pill);
		border-color: transparent;
		background: transparent;
	}

	.lg-scene-chip {
		min-height: 36px;
		padding: 6px 10px;
		border-radius: var(--lg-radius-control);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		color: var(--lg-ink-secondary);
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.lg-scene-chip[aria-pressed="true"] {
		background: var(--lg-firefly-soft);
		border-color: rgba(246, 215, 122, 0.54);
		color: var(--lg-firefly-gold);
		font-weight: 600;
	}

	.lg-launch-chips .lg-scene-chip[aria-pressed="true"] {
		background: transparent;
		border-color: transparent;
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-phase-indicator {
			transition: none;
		}
	}

	:global(html.motion-reduced) .lg-phase-indicator {
		transition: none;
	}

	.lg-scene-footer-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--lg-separator);
	}

	.lg-search-box {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.lg-search-results {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 52dvh;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.lg-search-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 11px 14px;
		border-radius: var(--lg-radius-control);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		text-decoration: none;
		color: var(--lg-ink-primary);
	}

	.lg-search-item__title {
		font-size: 0.9375rem;
		font-weight: 500;
		line-height: 1.35;
	}

	.lg-search-item__meta {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-search-empty {
		margin: 12px 0;
		text-align: center;
		color: var(--lg-ink-tertiary);
		font-size: var(--lg-text-ui);
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-scene-chip:hover,
		.lg-search-item:hover {
			background: var(--lg-fill-note-hover);
			color: var(--lg-ink-primary);
		}

		.lg-launch-chips .lg-scene-chip[aria-pressed="false"]:hover {
			background: var(--lg-fill-note-hover);
		}
	}

	@media (max-width: 680px) {
		.lg-stage-track {
			top: calc(116px + var(--lg-safe-top));
		}
	}
</style>
