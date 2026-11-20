export type WorkspaceStage = "launch" | "workspace";
export type TransitionDirection = "to-workspace" | "to-launch";

export interface SceneTransitionTarget {
	setCameraTransition: (progress: number) => void;
	setOpticalBlur: (blur: number, dim: number) => void;
	setInteractionMode?: (mode: "launch" | "workspace" | "reading") => void;
}

export interface LaunchTimelineFrame {
	progress: number;
	cameraProgress: number;
	opticalBlur: number;
	opticalDim: number;
	heroOpacity: number;
	heroScale: number;
	heroTranslateY: number;
	heroBlur: number;
	workspaceOpacity: number;
	workspaceScale: number;
	workspaceTranslateY: number;
	workspaceInteractive: boolean;
	peekOpacity: number;
	dockProgress: number;
	navOpacity: number;
	routeCommitted: boolean;
}

export interface TransitionCallbacks {
	onFrame?: (frame: LaunchTimelineFrame) => void;
	onRouteCommit?: (target: WorkspaceStage) => void;
	onComplete?: (target: WorkspaceStage, frame: LaunchTimelineFrame) => void;
	onCancel?: () => void;
}

const FORWARD_DURATION_MS = 780;
const REVERSE_DURATION_MS = 460;
const REDUCED_DURATION_MS = 200;

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function windowProgress(t: number, start: number, end: number): number {
	if (end <= start) return t >= end ? 1 : 0;
	return clamp01((t - start) / (end - start));
}

/**
 * 强 ease-out 曲线近似（匹配 --lg-ease-out: cubic-bezier(0.23, 1, 0.32, 1)）。
 */
export function easeOutQuintic(t: number): number {
	const x = clamp01(t);
	return 1 - Math.pow(1 - x, 4.2);
}

/**
 * 相机推进缓动曲线（匹配 --lg-ease-camera: cubic-bezier(0.22, 1, 0.36, 1)）。
 */
export function easeOutCamera(t: number): number {
	const x = clamp01(t);
	return 1 - Math.pow(1 - x, 3.6);
}

/**
 * 根据归一化进度 progress ∈ [0, 1]（0=Launch，1=Workspace）计算全部视觉与场景参数。
 * 在 prefers-reduced-motion 下折叠为无缩放、无位移动画的静态交叉淡入淡出。
 */
export function evaluateLaunchTimeline(
	rawProgress: number,
	direction: TransitionDirection = "to-workspace",
	reducedMotion = false,
): LaunchTimelineFrame {
	const p = clamp01(rawProgress);

	if (reducedMotion) {
		const heroOpacity = 1 - windowProgress(p, 0, 0.5);
		const workspaceOpacity = windowProgress(p, 0.45, 1);
		const targetCamera = p >= 0.5 ? 1 : 0;
		return {
			progress: p,
			cameraProgress: targetCamera,
			opticalBlur: targetCamera * 0.35,
			opticalDim: targetCamera * 0.16,
			heroOpacity,
			heroScale: 1,
			heroTranslateY: 0,
			heroBlur: 0,
			workspaceOpacity,
			workspaceScale: 1,
			workspaceTranslateY: 0,
			workspaceInteractive: workspaceOpacity >= 0.3,
			peekOpacity: workspaceOpacity * 0.78,
			dockProgress: workspaceOpacity,
			navOpacity: workspaceOpacity,
			routeCommitted: direction === "to-workspace" ? p >= 0.5 : p <= 0.5,
		};
	}

	// 相机推进与景深柔焦（40ms..680ms / 780ms -> 0.05..0.87）
	const camT = easeOutCamera(windowProgress(p, 0.05, 0.87));
	const opticalBlur = camT * 0.38;
	const opticalDim = camT * 0.16;

	// Launch 3 元素同步退场（60ms..320ms -> 0.08..0.41，零反向 stagger）
	const heroExitT = easeOutQuintic(windowProgress(p, 0.08, 0.41));
	const heroOpacity = 1 - heroExitT;
	const heroScale = 1 - heroExitT * 0.04;
	const heroTranslateY = -heroExitT * 8;
	const heroBlur = heroExitT * 4;

	// 主工作区列显影入场（320ms..760ms -> 0.41..0.97）
	const wsEnterT = easeOutQuintic(windowProgress(p, 0.41, 0.97));
	const workspaceOpacity = wsEnterT;
	const workspaceScale = 0.95 + wsEnterT * 0.05;
	const workspaceTranslateY = (1 - wsEnterT) * 18;
	const workspaceInteractive = workspaceOpacity >= 0.3;

	// 相邻列露角（380ms..740ms -> 0.49..0.95）
	const peekOpacity = easeOutQuintic(windowProgress(p, 0.49, 0.95)) * 0.78;

	// Dock 与顶栏汇合（400ms..780ms -> 0.51..1.00）
	const dockProgress = easeOutQuintic(windowProgress(p, 0.51, 1));
	const navOpacity = easeOutQuintic(windowProgress(p, 0.54, 0.88));

	const routeCommitted = direction === "to-workspace" ? p >= 0.36 : p <= 0.64;

	return {
		progress: p,
		cameraProgress: camT,
		opticalBlur,
		opticalDim,
		heroOpacity,
		heroScale,
		heroTranslateY,
		heroBlur,
		workspaceOpacity,
		workspaceScale,
		workspaceTranslateY,
		workspaceInteractive,
		peekOpacity,
		dockProgress,
		navOpacity,
		routeCommitted,
	};
}

/**
 * 可打断、可逆的 Launch <-> Workspace 双向转场协调器。
 * 任何时刻反向触发都直接从当前实时 progress 接管，保证无跳变与零并发动画叠加。
 */
export class TransitionCoordinator {
	private currentProgress: number;
	private currentDirection: TransitionDirection;
	private reducedMotion = false;
	private rafId: number | null = null;
	private activeAbort: AbortController | null = null;
	private activeOnCancel: (() => void) | null = null;
	private sceneTarget: SceneTransitionTarget | null = null;

	constructor(initialStage: WorkspaceStage = "launch") {
		this.currentProgress = initialStage === "workspace" ? 1 : 0;
		this.currentDirection = initialStage === "workspace" ? "to-workspace" : "to-launch";
	}

	attachScene(target: SceneTransitionTarget | null): void {
		this.sceneTarget = target;
		const frame = this.getFrame();
		this.syncScene(frame);
	}

	setReducedMotion(reduced: boolean): void {
		this.reducedMotion = reduced;
	}

	getProgress(): number {
		return this.currentProgress;
	}

	getStage(): WorkspaceStage {
		return this.currentProgress >= 0.5 ? "workspace" : "launch";
	}

	getFrame(): LaunchTimelineFrame {
		return evaluateLaunchTimeline(
			this.currentProgress,
			this.currentDirection,
			this.reducedMotion,
		);
	}

	snap(target: WorkspaceStage, onFrame?: (frame: LaunchTimelineFrame) => void): LaunchTimelineFrame {
		this.cancel();
		this.currentDirection = target === "workspace" ? "to-workspace" : "to-launch";
		this.currentProgress = target === "workspace" ? 1 : 0;
		const frame = this.getFrame();
		this.syncScene(frame);
		this.sceneTarget?.setInteractionMode?.(target);
		onFrame?.(frame);
		return frame;
	}

	cancel(): void {
		if (this.rafId !== null && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		if (this.activeAbort) {
			this.activeAbort.abort();
			this.activeAbort = null;
		}
		if (this.activeOnCancel) {
			const cb = this.activeOnCancel;
			this.activeOnCancel = null;
			cb();
		}
	}

	transitionTo(
		target: WorkspaceStage,
		callbacks: TransitionCallbacks = {},
	): Promise<LaunchTimelineFrame> {
		this.cancel();

		const endProgress = target === "workspace" ? 1 : 0;
		const startProgress = this.currentProgress;
		const direction: TransitionDirection = target === "workspace" ? "to-workspace" : "to-launch";
		this.currentDirection = direction;

		const delta = Math.abs(endProgress - startProgress);
		if (delta < 1e-4) {
			const settled = this.snap(target, callbacks.onFrame);
			callbacks.onRouteCommit?.(target);
			callbacks.onComplete?.(target, settled);
			return Promise.resolve(settled);
		}

		const fullDuration = this.reducedMotion
			? REDUCED_DURATION_MS
			: direction === "to-workspace"
				? FORWARD_DURATION_MS
				: REVERSE_DURATION_MS;
		// 中途打断反向时按剩余距离等比缩放时长，避免近距缓慢拖尾
		const duration = Math.max(120, fullDuration * delta);

		const abort = new AbortController();
		this.activeAbort = abort;
		this.activeOnCancel = callbacks.onCancel ?? null;

		let routeCommitted = false;
		const commitRouteOnce = () => {
			if (routeCommitted) return;
			routeCommitted = true;
			callbacks.onRouteCommit?.(target);
		};

		if (typeof requestAnimationFrame !== "function") {
			const settled = this.snap(target, callbacks.onFrame);
			commitRouteOnce();
			callbacks.onComplete?.(target, settled);
			return Promise.resolve(settled);
		}

		return new Promise<LaunchTimelineFrame>((resolve) => {
			const startTime = performance.now();

			const step = (now: number) => {
				if (abort.signal.aborted) {
					resolve(this.getFrame());
					return;
				}
				const elapsed = now - startTime;
				const linearT = clamp01(elapsed / duration);
				this.currentProgress = startProgress + (endProgress - startProgress) * linearT;
				const frame = evaluateLaunchTimeline(
					this.currentProgress,
					direction,
					this.reducedMotion,
				);

				this.syncScene(frame);
				callbacks.onFrame?.(frame);
				if (frame.routeCommitted) {
					commitRouteOnce();
				}

				if (linearT >= 1) {
					this.rafId = null;
					this.activeAbort = null;
					this.activeOnCancel = null;
					this.currentProgress = endProgress;
					const finalFrame = evaluateLaunchTimeline(
						endProgress,
						direction,
						this.reducedMotion,
					);
					this.syncScene(finalFrame);
					this.sceneTarget?.setInteractionMode?.(target);
					callbacks.onFrame?.(finalFrame);
					commitRouteOnce();
					callbacks.onComplete?.(target, finalFrame);
					resolve(finalFrame);
					return;
				}

				this.rafId = requestAnimationFrame(step);
			};

			this.rafId = requestAnimationFrame(step);
		});
	}

	dispose(): void {
		this.cancel();
		this.sceneTarget = null;
	}

	private syncScene(frame: LaunchTimelineFrame): void {
		if (!this.sceneTarget) return;
		this.sceneTarget.setCameraTransition(frame.cameraProgress);
		this.sceneTarget.setOpticalBlur(frame.opticalBlur, frame.opticalDim);
	}
}

export type DockRecedeMode = "expanded" | "receded" | "hidden-edge";

export interface DockRecedeSnapshot {
	state: DockRecedeMode;
	lastScrollTop: number;
	accumulatedDelta: number;
}

/**
 * 自动退隐 Dock 状态机（带 28px 反向滚动滞后阈值，防止触控板微小回弹抖动）。
 */
export function stepDockRecede(
	prev: DockRecedeSnapshot,
	nextScrollTop: number,
	options: {
		readingMode?: boolean;
		atBottom?: boolean;
		hysteresisPx?: number;
		recedeThresholdPx?: number;
		hideThresholdPx?: number;
	} = {},
): DockRecedeSnapshot {
	const scrollTop = Math.max(0, nextScrollTop);
	const hysteresis = options.hysteresisPx ?? 28;
	const recedeThreshold = options.recedeThresholdPx ?? 80;
	const hideThreshold = options.hideThresholdPx ?? 240;

	if (scrollTop <= 16 || options.atBottom) {
		return { state: "expanded", lastScrollTop: scrollTop, accumulatedDelta: 0 };
	}

	const delta = scrollTop - prev.lastScrollTop;
	const sameDirection =
		prev.accumulatedDelta === 0 || Math.sign(delta) === Math.sign(prev.accumulatedDelta);
	const accumulated = sameDirection ? prev.accumulatedDelta + delta : delta;

	let state: DockRecedeMode = prev.state;
	if (accumulated >= hysteresis) {
		if (options.readingMode && scrollTop >= hideThreshold) {
			state = "hidden-edge";
		} else if (scrollTop >= recedeThreshold) {
			state = "receded";
		}
		return { state, lastScrollTop: scrollTop, accumulatedDelta: 0 };
	}

	if (accumulated <= -hysteresis) {
		return { state: "expanded", lastScrollTop: scrollTop, accumulatedDelta: 0 };
	}

	return { state, lastScrollTop: scrollTop, accumulatedDelta: accumulated };
}
