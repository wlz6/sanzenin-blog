import { DEFAULT_SPRING } from "../../workspace/spring-camera.ts";

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

const SPRING_OMEGA = (2 * Math.PI) / DEFAULT_SPRING.response;
const REDUCED_DURATION_SECONDS = 0.18;

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
		const heroOpacity = 1 - p;
		const workspaceOpacity = p;
		return {
			progress: p,
			cameraProgress: p,
			opticalBlur: p * 0.35,
			opticalDim: p * 0.16,
			heroOpacity,
			heroScale: 1,
			heroTranslateY: 0,
			workspaceOpacity,
			workspaceScale: 1,
			workspaceTranslateY: 0,
			workspaceInteractive: workspaceOpacity >= 0.5,
			peekOpacity: workspaceOpacity * 0.78,
			dockProgress: workspaceOpacity,
			navOpacity: workspaceOpacity,
			routeCommitted: direction === "to-workspace" ? p >= 0.5 : p <= 0.5,
		};
	}

	const camT = p;
	const opticalBlur = camT * 0.38;
	const opticalDim = camT * 0.16;

	// 入口与工作区短暂重叠，返回时沿同一条路径显现。
	const heroExitT = easeOutQuintic(windowProgress(p, 0.06, 0.70));
	const heroOpacity = 1 - heroExitT;
	const heroScale = 1 - heroExitT * 0.04;
	const heroTranslateY = -heroExitT * 8;
	const wsEnterT = easeOutQuintic(windowProgress(p, 0.20, 0.97));
	const workspaceOpacity = wsEnterT;
	const workspaceScale = 0.98 + wsEnterT * 0.02;
	const workspaceTranslateY = (1 - wsEnterT) * 10;
	const workspaceInteractive = p >= 0.4;

	// 相邻列露角（380ms..740ms -> 0.49..0.95）
	const peekOpacity = easeOutQuintic(windowProgress(p, 0.49, 0.95)) * 0.78;

	// Dock 与顶栏汇合（400ms..780ms -> 0.51..1.00）
	const dockProgress = easeOutQuintic(windowProgress(p, 0.31, 0.96));
	const navOpacity = easeOutQuintic(windowProgress(p, 0.30, 0.88));

	const routeCommitted = direction === "to-workspace" ? p >= 0.36 : p <= 0.64;

	return {
		progress: p,
		cameraProgress: camT,
		opticalBlur,
		opticalDim,
		heroOpacity,
		heroScale,
		heroTranslateY,
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
	private velocity = 0;
	private currentDirection: TransitionDirection;
	private reducedMotion = false;
	private rafId: number | null = null;
	private cancelTransition: (() => void) | null = null;
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
		this.velocity = 0;
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
		const cancel = this.cancelTransition;
		this.cancelTransition = null;
		cancel?.();
	}

	transitionTo(
		target: WorkspaceStage,
		callbacks: TransitionCallbacks = {},
	): Promise<LaunchTimelineFrame> {
		this.cancel();

		const endProgress = target === "workspace" ? 1 : 0;
		const direction: TransitionDirection = target === "workspace" ? "to-workspace" : "to-launch";
		this.currentDirection = direction;

		if (typeof requestAnimationFrame !== "function" || (this.currentProgress === endProgress && this.velocity === 0)) {
			const settled = this.snap(target, callbacks.onFrame);
			callbacks.onRouteCommit?.(target);
			callbacks.onComplete?.(target, settled);
			return Promise.resolve(settled);
		}

		let routeCommitted = false;
		const commitRouteOnce = () => {
			if (routeCommitted) return;
			routeCommitted = true;
			callbacks.onRouteCommit?.(target);
		};

		return new Promise<LaunchTimelineFrame>((resolve) => {
			let lastTime = performance.now();
			const cancel = () => {
				resolve(this.getFrame());
				callbacks.onCancel?.();
			};
			this.cancelTransition = cancel;

			const step = (now: number) => {
				const dt = Math.max(0, (now - lastTime) / 1000);
				lastTime = now;
				const offset = this.currentProgress - endProgress;

				if (this.reducedMotion) {
					this.currentProgress = endProgress + Math.sign(offset) *
						Math.max(0, Math.abs(offset) - dt / REDUCED_DURATION_SECONDS);
					this.velocity = 0;
				} else {
					// 临界阻尼的解析解。反向时沿用上一帧的位置和速度。
					const decay = Math.exp(-SPRING_OMEGA * dt);
					const slope = this.velocity + SPRING_OMEGA * offset;
					this.currentProgress = endProgress + (offset + slope * dt) * decay;
					this.velocity = (this.velocity - SPRING_OMEGA * slope * dt) * decay;
				}

				const settled = Math.abs(this.currentProgress - endProgress) < 0.003 &&
					Math.abs(this.velocity) < 0.05;
				if (settled) {
					this.currentProgress = endProgress;
					this.velocity = 0;
				}
				const frame = this.getFrame();
				this.syncScene(frame);
				callbacks.onFrame?.(frame);
				if (this.cancelTransition !== cancel) return;
				// 反向后先减速，速度转向目标时才更新路由。
				if (frame.routeCommitted && this.velocity * (endProgress === 1 ? 1 : -1) >= 0) {
					commitRouteOnce();
				}
				if (this.cancelTransition !== cancel) return;

				if (settled) {
					this.rafId = null;
					this.cancelTransition = null;
					this.sceneTarget?.setInteractionMode?.(target);
					callbacks.onComplete?.(target, frame);
					resolve(frame);
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
