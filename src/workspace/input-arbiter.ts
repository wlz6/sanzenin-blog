export interface ScrollableCapability {
	canScrollX: boolean;
	canScrollY: boolean;
	scrollLeft: number;
	scrollTop: number;
	maxScrollLeft: number;
	maxScrollTop: number;
}

export type WheelArbitrationResult =
	| { action: "ignore" }
	| { action: "native" }
	| { action: "pan-x"; delta: number }
	| { action: "pan-y"; delta: number };

export interface WheelProbeInput {
	defaultPrevented: boolean;
	ctrlOrMeta: boolean;
	shiftKey: boolean;
	deltaX: number;
	deltaY: number;
	deltaMode: number;
	viewportHeight: number;
	modalOpen: boolean;
	overview: boolean;
	isHomeColumn: boolean;
	scrollables: ScrollableCapability[];
}

export function normalizeWheelDelta(
	delta: number,
	deltaMode: number,
	viewportHeight: number,
): number {
	if (deltaMode === 1) return delta * 16;
	if (deltaMode === 2) return delta * Math.max(320, viewportHeight * 0.85);
	return delta;
}

function hasRemainingScroll(
	cap: ScrollableCapability,
	axis: "x" | "y",
	delta: number,
): boolean {
	if (axis === "x") {
		if (!cap.canScrollX || cap.maxScrollLeft <= 1) return false;
		if (delta > 0) return cap.scrollLeft < cap.maxScrollLeft - 1;
		if (delta < 0) return cap.scrollLeft > 1;
		return false;
	}
	if (!cap.canScrollY || cap.maxScrollTop <= 1) return false;
	if (delta > 0) return cap.scrollTop < cap.maxScrollTop - 1;
	if (delta < 0) return cap.scrollTop > 1;
	return false;
}

/**
 * 滚轮/触控板所有权仲裁（纯函数）：
 * 1. 模态框打开、事件已消费、Ctrl/Meta 缩放均交还原生行为；
 * 2. 先检查事件路径上最内层真实可滚动容器，有余量时绝不抢占内容滚动；
 * 3. 在窗口正文内部触底后仍保留边界，不突兀跳离当前阅读列；
 * 4. 明确 Shift+滚轮或主导横向触控板手势驱动工作空间 X 轴，空白处纵向滚轮驱动 Y 轴（首页向下进入 Articles）。
 */
export function arbitrateWheel(input: WheelProbeInput): WheelArbitrationResult {
	if (input.modalOpen || input.defaultPrevented || input.ctrlOrMeta) {
		return { action: "ignore" };
	}

	const dx = normalizeWheelDelta(input.deltaX, input.deltaMode, input.viewportHeight);
	const dy = normalizeWheelDelta(input.deltaY, input.deltaMode, input.viewportHeight);

	if (input.shiftKey && Math.abs(dy) > 0.5) {
		const xCap = input.scrollables.find((c) => hasRemainingScroll(c, "x", dy));
		if (xCap) return { action: "native" };
		return { action: "pan-x", delta: dy };
	}

	const absX = Math.abs(dx);
	const absY = Math.abs(dy);

	// 仅在横向分量明显占优时触发横向切列，避免斜向触控板误切列
	if (absX > 2 && absX > absY * 1.2) {
		const xCap = input.scrollables.find((c) => hasRemainingScroll(c, "x", dx));
		if (xCap) return { action: "native" };
		return { action: "pan-x", delta: dx };
	}

	if (absY > 0.5) {
		// 位于窗口内部可滚动区域时，即使到达上下边界也由窗口内部承接，避免阅读到底后突然跳走
		if (input.scrollables.length > 0 && !input.overview) {
			return { action: "native" };
		}
		if (input.isHomeColumn && !input.overview && dy > 10) {
			return { action: "pan-x", delta: dy };
		}
		return { action: "pan-y", delta: dy };
	}

	return { action: "ignore" };
}

/**
 * 沿着事件 composedPath 收集真实可滚动容器（覆盖代码块、KaTeX 公式、表格、窗口正文及 Shadow DOM）。
 */
export function collectScrollablesFromPath(path: EventTarget[]): ScrollableCapability[] {
	const result: ScrollableCapability[] = [];
	if (typeof window === "undefined") return result;

	for (const node of path) {
		if (!(node instanceof HTMLElement)) continue;
		if (node === document.body || node === document.documentElement) break;
		if (node.dataset.ewStage === "true") break;

		const style = getComputedStyle(node);
		const ox = style.overflowX;
		const oy = style.overflowY;
		const isScrollX = ox === "auto" || ox === "scroll";
		const isScrollY = oy === "auto" || oy === "scroll";
		const isWindowContent =
			node.classList.contains("ew-window__body") ||
			node.classList.contains("lg-panel__body") ||
			node.dataset.lgScrollBody === "true";

		const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
		const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);

		if (
			isWindowContent ||
			(isScrollX && maxScrollLeft > 1) ||
			(isScrollY && maxScrollTop > 1)
		) {
			result.push({
				canScrollX: isScrollX && maxScrollLeft > 1,
				canScrollY: (isScrollY && maxScrollTop > 1) || isWindowContent,
				scrollLeft: node.scrollLeft,
				scrollTop: node.scrollTop,
				maxScrollLeft,
				maxScrollTop,
			});
		}
	}
	return result;
}

export function isEditableEventTarget(event: KeyboardEvent): boolean {
	if (event.isComposing) return true;
	const path = typeof event.composedPath === "function" ? event.composedPath() : [];
	for (const node of path) {
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
			return true;
		}
		if (node.isContentEditable) {
			return true;
		}
	}
	const active = document.activeElement;
	if (active instanceof HTMLElement) {
		const tag = active.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) {
			return true;
		}
	}
	return false;
}
