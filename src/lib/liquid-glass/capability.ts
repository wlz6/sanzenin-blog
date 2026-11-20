export type RefractMode = "svg" | "css";
export type PerfTier = "full" | "lite";

export interface CapabilityEnvironment {
	userAgent: string;
	hasUserAgentDataChromium?: boolean;
	supportsSvgBackdropFilter: boolean;
	coarsePointer: boolean;
	fineHoverPointer: boolean;
	reducedTransparency: boolean;
	reducedMotion: boolean;
	hardwareConcurrency: number;
	deviceMemory?: number;
}

export interface LiquidGlassCapability {
	refractMode: RefractMode;
	perfTier: PerfTier;
	pointerLightEnabled: boolean;
}

/**
 * 纯函数能力判定：仅在桌面精细指针、非省电且确认 Chromium 支持 SVG backdrop-filter 时启用 svg 折射；
 * Safari(WebKit)、Firefox(Gecko)、移动端与低核设备统一安全落入 css 双环 Fresnel 回退。
 */
export function detectLiquidGlassCapability(
	env: CapabilityEnvironment,
): LiquidGlassCapability {
	const ua = env.userAgent;
	const isFirefox = /Firefox\/|Gecko\//i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
	const isWebKitSafari = /Safari\//i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(ua);
	const isChromium =
		Boolean(env.hasUserAgentDataChromium) ||
		(/Chrome\/|Chromium\/|Edg\//i.test(ua) && !isFirefox && !isWebKitSafari);

	const lowSpec =
		env.coarsePointer ||
		env.hardwareConcurrency <= 4 ||
		(typeof env.deviceMemory === "number" && env.deviceMemory <= 4);

	const perfTier: PerfTier = lowSpec ? "lite" : "full";

	const refractMode: RefractMode =
		isChromium &&
		env.supportsSvgBackdropFilter &&
		perfTier === "full" &&
		!env.reducedTransparency
			? "svg"
			: "css";

	const pointerLightEnabled =
		env.fineHoverPointer &&
		!env.coarsePointer &&
		!env.reducedMotion &&
		perfTier === "full";

	return {
		refractMode,
		perfTier,
		pointerLightEnabled,
	};
}

function readBrowserEnvironment(): CapabilityEnvironment {
	const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
	const navExt = navigator as Navigator & {
		userAgentData?: { brands?: Array<{ brand: string }> };
		deviceMemory?: number;
	};
	const hasUserAgentDataChromium = Boolean(
		navExt.userAgentData?.brands?.some((entry) => /Chrom|Edge|Opera/i.test(entry.brand)),
	);
	const supportsSvgBackdropFilter =
		typeof CSS !== "undefined" &&
		typeof CSS.supports === "function" &&
		CSS.supports("backdrop-filter", "url(#lg-refract-pill)");

	const mq = (query: string) =>
		typeof window !== "undefined" && typeof window.matchMedia === "function"
			? window.matchMedia(query).matches
			: false;

	const reducedMotionClass =
		typeof document !== "undefined" &&
		document.documentElement.classList.contains("motion-reduced");
	const solidGlassAttr =
		typeof document !== "undefined" &&
		document.documentElement.dataset.ewGlass === "solid";

	return {
		userAgent: ua,
		hasUserAgentDataChromium,
		supportsSvgBackdropFilter,
		coarsePointer: mq("(pointer: coarse)"),
		fineHoverPointer: mq("(hover: hover) and (pointer: fine)"),
		reducedTransparency: mq("(prefers-reduced-transparency: reduce)") || solidGlassAttr,
		reducedMotion: mq("(prefers-reduced-motion: reduce)") || reducedMotionClass,
		hardwareConcurrency:
			typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
				? navigator.hardwareConcurrency
				: 8,
		deviceMemory: navExt.deviceMemory,
	};
}

/**
 * 客户端初始化能力探针并同步 html[data-lg-refract] 与 html[data-lg-perf]。
 */
export function initLiquidGlassCapability(
	root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
	onChange?: (capability: LiquidGlassCapability) => void,
): () => void {
	if (!root || typeof window === "undefined") {
		return () => {};
	}

	const apply = (): LiquidGlassCapability => {
		const capability = detectLiquidGlassCapability(readBrowserEnvironment());
		root.dataset.lgRefract = capability.refractMode;
		root.dataset.lgPerf = capability.perfTier;
		onChange?.(capability);
		return capability;
	};

	apply();

	const queries = [
		"(pointer: coarse)",
		"(hover: hover) and (pointer: fine)",
		"(prefers-reduced-transparency: reduce)",
		"(prefers-reduced-motion: reduce)",
	];
	const mediaLists =
		typeof window.matchMedia === "function"
			? queries.map((query) => window.matchMedia(query))
			: [];
	const handleChange = () => {
		apply();
	};
	for (const list of mediaLists) {
		list.addEventListener("change", handleChange);
	}

	const observer = new MutationObserver(handleChange);
	observer.observe(root, {
		attributes: true,
		attributeFilter: ["class", "data-ew-glass"],
	});

	return () => {
		for (const list of mediaLists) {
			list.removeEventListener("change", handleChange);
		}
		observer.disconnect();
	};
}
