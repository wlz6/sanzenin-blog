export interface PointerLightOptions {
	enabled?: boolean;
	groupId?: string;
	neighborRadius?: number;
}

interface TrackedSurface {
	host: HTMLElement;
	specular: HTMLElement;
	groupId: string | null;
	neighborRadius: number;
	enabled: boolean;
	pressed: boolean;
}

const trackedSurfaces = new Set<TrackedSurface>();
let listenerAttached = false;
let rafPending = false;
let lastPointerX = -9999;
let lastPointerY = -9999;
let pointerInside = false;

function canRunPointerLight(): boolean {
	if (typeof window === "undefined" || typeof document === "undefined") return false;
	if (document.documentElement.classList.contains("motion-reduced")) return false;
	if (document.documentElement.dataset.lgPerf === "lite") return false;
	if (typeof window.matchMedia !== "function") return false;
	return (
		window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

function flushPointerLightFrame(): void {
	rafPending = false;
	if (!canRunPointerLight()) {
		clearAllSpecular();
		return;
	}

	let activeGroupId: string | null = null;
	for (const entry of trackedSurfaces) {
		if (!entry.enabled || !entry.host.isConnected) continue;
		const rect = entry.host.getBoundingClientRect();
		const inside =
			pointerInside &&
			lastPointerX >= rect.left &&
			lastPointerX <= rect.right &&
			lastPointerY >= rect.top &&
			lastPointerY <= rect.bottom;
		if (inside && entry.groupId) {
			activeGroupId = entry.groupId;
			break;
		}
	}

	for (const entry of trackedSurfaces) {
		if (!entry.enabled || !entry.host.isConnected) {
			clearEntry(entry);
			continue;
		}
		const rect = entry.host.getBoundingClientRect();
		const localX = lastPointerX - rect.left;
		const localY = lastPointerY - rect.top;
		const inside =
			pointerInside &&
			localX >= 0 &&
			localX <= rect.width &&
			localY >= 0 &&
			localY <= rect.height;

		if (entry.pressed) {
			entry.specular.style.setProperty("--lg-px", `${localX.toFixed(1)}px`);
			entry.specular.style.setProperty("--lg-py", `${localY.toFixed(1)}px`);
			entry.specular.style.setProperty("--lg-spec-opacity", "1");
			entry.specular.dataset.lgLit = "press";
			continue;
		}

		if (inside) {
			entry.specular.style.setProperty("--lg-px", `${localX.toFixed(1)}px`);
			entry.specular.style.setProperty("--lg-py", `${localY.toFixed(1)}px`);
			entry.specular.style.setProperty("--lg-spec-opacity", "0.9");
			entry.specular.dataset.lgLit = "hover";
			continue;
		}

		// 同组邻近液态玻璃反射高光（距离 < neighborRadius）
		if (pointerInside && activeGroupId && entry.groupId === activeGroupId) {
			const dx = Math.max(rect.left - lastPointerX, 0, lastPointerX - rect.right);
			const dy = Math.max(rect.top - lastPointerY, 0, lastPointerY - rect.bottom);
			const distance = Math.hypot(dx, dy);
			if (distance <= entry.neighborRadius) {
				const falloff = 1 - distance / entry.neighborRadius;
				entry.specular.style.setProperty("--lg-px", `${localX.toFixed(1)}px`);
				entry.specular.style.setProperty("--lg-py", `${localY.toFixed(1)}px`);
				entry.specular.style.setProperty("--lg-spec-opacity", (falloff * 0.45).toFixed(3));
				entry.specular.dataset.lgLit = "neighbor";
				continue;
			}
		}

		clearEntry(entry);
	}
}

function clearEntry(entry: TrackedSurface): void {
	if (entry.specular.dataset.lgLit) {
		delete entry.specular.dataset.lgLit;
	}
}

function clearAllSpecular(): void {
	for (const entry of trackedSurfaces) {
		entry.pressed = false;
		clearEntry(entry);
	}
}

function scheduleFlush(): void {
	if (rafPending || typeof requestAnimationFrame !== "function") return;
	rafPending = true;
	requestAnimationFrame(flushPointerLightFrame);
}

function onWindowPointerMove(event: PointerEvent): void {
	if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
	pointerInside = true;
	lastPointerX = event.clientX;
	lastPointerY = event.clientY;
	scheduleFlush();
}

function onWindowPointerLeave(): void {
	pointerInside = false;
	scheduleFlush();
}

function ensureGlobalListeners(): void {
	if (listenerAttached || typeof window === "undefined") return;
	listenerAttached = true;
	window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
	window.addEventListener("pointerleave", onWindowPointerLeave, { passive: true });
	window.addEventListener("blur", onWindowPointerLeave, { passive: true });
}

function teardownGlobalListenersIfIdle(): void {
	if (!listenerAttached || trackedSurfaces.size > 0 || typeof window === "undefined") return;
	listenerAttached = false;
	window.removeEventListener("pointermove", onWindowPointerMove);
	window.removeEventListener("pointerleave", onWindowPointerLeave);
	window.removeEventListener("blur", onWindowPointerLeave);
}

/**
 * Svelte 5 action：将指针追光与按下内发光坐标仅写入叶子节点 `.lg-specular`，
 * 避免父容器 CSS 变量继承引发全子树样式重算。
 */
export function pointerLight(node: HTMLElement, initialOptions: PointerLightOptions = {}) {
	const findSpecular = (): HTMLElement | null => {
		for (const child of node.children) {
			if (child instanceof HTMLElement && child.classList.contains("lg-specular")) {
				return child;
			}
		}
		return null;
	};

	const specular = findSpecular();
	if (!specular) {
		return {
			update() {},
			destroy() {},
		};
	}

	const entry: TrackedSurface = {
		host: node,
		specular,
		groupId: initialOptions.groupId ?? node.closest<HTMLElement>("[data-lg-group]")?.dataset.lgGroup ?? null,
		neighborRadius: initialOptions.neighborRadius ?? 140,
		enabled: initialOptions.enabled ?? true,
		pressed: false,
	};

	const onPointerDown = (event: PointerEvent) => {
		if (!entry.enabled || !canRunPointerLight()) return;
		const rect = node.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;
		entry.pressed = true;
		entry.specular.style.setProperty("--lg-px", `${localX.toFixed(1)}px`);
		entry.specular.style.setProperty("--lg-py", `${localY.toFixed(1)}px`);
		entry.specular.style.setProperty("--lg-spec-opacity", "1");
		entry.specular.dataset.lgLit = "press";
	};

	const releasePress = () => {
		if (!entry.pressed) return;
		entry.pressed = false;
		scheduleFlush();
	};

	trackedSurfaces.add(entry);
	ensureGlobalListeners();
	node.addEventListener("pointerdown", onPointerDown, { passive: true });
	window.addEventListener("pointerup", releasePress, { passive: true });
	window.addEventListener("pointercancel", releasePress, { passive: true });

	return {
		update(next: PointerLightOptions = {}) {
			entry.enabled = next.enabled ?? true;
			entry.neighborRadius = next.neighborRadius ?? 140;
			entry.groupId =
				next.groupId ?? node.closest<HTMLElement>("[data-lg-group]")?.dataset.lgGroup ?? null;
			if (!entry.enabled) {
				entry.pressed = false;
				clearEntry(entry);
			}
		},
		destroy() {
			node.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointerup", releasePress);
			window.removeEventListener("pointercancel", releasePress);
			trackedSurfaces.delete(entry);
			clearEntry(entry);
			teardownGlobalListenersIfIdle();
		},
	};
}
