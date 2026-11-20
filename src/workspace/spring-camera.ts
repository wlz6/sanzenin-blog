export interface SpringConfig {
	/** 响应时间（秒），越小越跟手 */
	response: number;
	/** 阻尼比：1.0 为临界阻尼无回弹，0.82 适用于惯性甩动 */
	dampingRatio: number;
}

export const DEFAULT_SPRING: SpringConfig = {
	response: 0.34,
	dampingRatio: 1.0,
};

export const MOMENTUM_SPRING: SpringConfig = {
	response: 0.38,
	dampingRatio: 0.86,
};

/**
 * Apple WWDC 惯性落点预测：基于释放瞬间速度预测滑动终点，用于对齐最近列。
 */
export function projectMomentum(
	velocityPxPerSec: number,
	decelerationRate = 0.9965,
): number {
	return (velocityPxPerSec / 1000) * (decelerationRate / (1 - decelerationRate));
}

/**
 * 边界橡皮筋阻力：超界拖曳时渐进衰减，不产生生硬撞墙感。
 */
export function rubberband(
	overshoot: number,
	dimension: number,
	constant = 0.55,
): number {
	if (dimension <= 0) return 0;
	return (
		(overshoot * dimension * constant) /
		(dimension + constant * Math.abs(overshoot))
	);
}

interface AxisState {
	value: number;
	target: number;
	velocity: number;
	config: SpringConfig;
}

/**
 * 独立 X/Y 双轴弹簧相机：
 * - 基于真实 dt 步进，在 60Hz/120Hz 刷新率下拥有一致收敛时长；
 * - 支持任意时刻手势打断，直接从当前屏幕实时位置与速度重新锚定目标；
 * - 收敛后自动停止 rAF，不在静止时持续写 DOM transform。
 */
export class SpringCamera2D {
	private x: AxisState = {
		value: 0,
		target: 0,
		velocity: 0,
		config: DEFAULT_SPRING,
	};
	private y: AxisState = {
		value: 0,
		target: 0,
		velocity: 0,
		config: DEFAULT_SPRING,
	};
	private scale: AxisState = {
		value: 1,
		target: 1,
		velocity: 0,
		config: DEFAULT_SPRING,
	};

	private rafId: number | null = null;
	private lastTime = 0;
	private reducedMotion = false;
	private onFrame: (x: number, y: number, scale: number, settled: boolean) => void;

	constructor(
		onFrame: (x: number, y: number, scale: number, settled: boolean) => void,
	) {
		this.onFrame = onFrame;
	}

	setReducedMotion(reduced: boolean): void {
		this.reducedMotion = reduced;
		if (reduced) {
			this.snapTo(this.x.target, this.y.target, this.scale.target);
		}
	}

	getPosition(): { x: number; y: number; scale: number } {
		return {
			x: this.x.value,
			y: this.y.value,
			scale: this.scale.value,
		};
	}

	snapTo(x: number, y: number, scale = this.scale.target): void {
		this.cancel();
		this.x.value = x;
		this.x.target = x;
		this.x.velocity = 0;
		this.y.value = y;
		this.y.target = y;
		this.y.velocity = 0;
		this.scale.value = scale;
		this.scale.target = scale;
		this.scale.velocity = 0;
		this.onFrame(x, y, scale, true);
	}

	/**
	 * 1:1 直接拖曳跟随阶段：立刻更新实时位置，不做弹簧滞后。
	 */
	trackDirect(x: number, y: number, vx = 0, vy = 0): void {
		this.cancel();
		this.x.value = x;
		this.x.target = x;
		this.x.velocity = vx;
		this.y.value = y;
		this.y.target = y;
		this.y.velocity = vy;
		this.onFrame(x, y, this.scale.value, true);
	}

	animateTo(
		targetX: number,
		targetY: number,
		options?: {
			scale?: number;
			vx?: number;
			vy?: number;
			config?: SpringConfig;
		},
	): void {
		const nextScale = options?.scale ?? this.scale.target;
		if (this.reducedMotion) {
			this.snapTo(targetX, targetY, nextScale);
			return;
		}
		const cfg = options?.config ?? DEFAULT_SPRING;
		this.x.target = targetX;
		this.x.config = cfg;
		if (typeof options?.vx === "number") this.x.velocity = options.vx;

		this.y.target = targetY;
		this.y.config = cfg;
		if (typeof options?.vy === "number") this.y.velocity = options.vy;

		this.scale.target = nextScale;
		this.scale.config = DEFAULT_SPRING;

		this.ensureLoop();
	}

	cancel(): void {
		if (this.rafId !== null && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.lastTime = 0;
	}

	private ensureLoop(): void {
		if (this.rafId !== null || typeof requestAnimationFrame !== "function") {
			return;
		}
		this.lastTime = performance.now();
		this.rafId = requestAnimationFrame(this.step);
	}

	private stepAxis(axis: AxisState, dt: number, epsilonPos: number, epsilonVel: number): boolean {
		const omega = (2 * Math.PI) / Math.max(0.08, axis.config.response);
		const damping = 2 * axis.config.dampingRatio * omega;
		const stiffness = omega * omega;

		// 使用子步半隐式欧拉保证高刚度与低帧率下稳定收敛
		const substeps = dt > 0.016 ? 2 : 1;
		const subDt = dt / substeps;
		for (let i = 0; i < substeps; i++) {
			const displacement = axis.value - axis.target;
			const accel = -stiffness * displacement - damping * axis.velocity;
			axis.velocity += accel * subDt;
			axis.value += axis.velocity * subDt;
		}

		const done =
			Math.abs(axis.value - axis.target) < epsilonPos &&
			Math.abs(axis.velocity) < epsilonVel;
		if (done) {
			axis.value = axis.target;
			axis.velocity = 0;
		}
		return done;
	}

	private step = (now: number): void => {
		const rawDt = (now - this.lastTime) / 1000;
		this.lastTime = now;
		const dt = Math.min(0.05, Math.max(0.001, rawDt));

		const xDone = this.stepAxis(this.x, dt, 0.25, 1.5);
		const yDone = this.stepAxis(this.y, dt, 0.25, 1.5);
		const sDone = this.stepAxis(this.scale, dt, 0.001, 0.01);
		const settled = xDone && yDone && sDone;

		this.onFrame(this.x.value, this.y.value, this.scale.value, settled);

		if (settled) {
			this.rafId = null;
			this.lastTime = 0;
			return;
		}
		this.rafId = requestAnimationFrame(this.step);
	};
}
