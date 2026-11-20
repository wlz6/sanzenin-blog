export type RefractionPresetId = "lens" | "pill" | "chrome" | "panel";

export interface RefractionPreset {
	readonly id: RefractionPresetId;
	readonly imageElementId: string;
	readonly filterId: string;
	readonly cornerRadius: number;
	readonly bevelWidth: number;
	readonly power: number;
	readonly interiorMagnify: number;
}

export const REFRACTION_PRESETS: Record<RefractionPresetId, RefractionPreset> = {
	lens: {
		id: "lens",
		imageElementId: "lg-map-lens",
		filterId: "lg-refract-lens",
		cornerRadius: 0.44,
		bevelWidth: 0.18,
		power: 1.5,
		interiorMagnify: 0.04,
	},
	pill: {
		id: "pill",
		imageElementId: "lg-map-pill",
		filterId: "lg-refract-pill",
		cornerRadius: 0.46,
		bevelWidth: 0.14,
		power: 1.6,
		interiorMagnify: 0,
	},
	chrome: {
		id: "chrome",
		imageElementId: "lg-map-chrome",
		filterId: "lg-refract-chrome",
		cornerRadius: 0.24,
		bevelWidth: 0.12,
		power: 1.65,
		interiorMagnify: 0,
	},
	panel: {
		id: "panel",
		imageElementId: "lg-map-panel",
		filterId: "lg-refract-panel",
		cornerRadius: 0.14,
		bevelWidth: 0.09,
		power: 1.75,
		interiorMagnify: 0,
	},
};

const bakedMapCache = new Map<string, string>();

/**
 * 归一化圆角矩形有符号距离场（SDF），内部为负值，边界为 0，外部为正值。
 */
export function sdRoundedBox(
	px: number,
	py: number,
	halfW: number,
	halfH: number,
	radius: number,
): number {
	const r = Math.min(radius, halfW, halfH);
	const qx = Math.abs(px) - (halfW - r);
	const qy = Math.abs(py) - (halfH - r);
	const ox = Math.max(qx, 0);
	const oy = Math.max(qy, 0);
	return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * 计算单个采样点 (u, v) ∈ [-1, 1]^2 的凸透镜 Fresnel 折射位移通道 [R, G, B, A]。
 * 中心平坦区保持 (128, 128) 中性零畸变，外缘倒角按外法线编码 Snell 折射偏移。
 */
export function computeFresnelBevelSample(
	u: number,
	v: number,
	preset: Pick<RefractionPreset, "cornerRadius" | "bevelWidth" | "power" | "interiorMagnify">,
): [number, number, number, number] {
	const d = sdRoundedBox(u, v, 1, 1, preset.cornerRadius);
	if (d >= 0) {
		return [128, 128, 128, 255];
	}

	if (d < -preset.bevelWidth) {
		if (preset.interiorMagnify === 0) {
			return [128, 128, 128, 255];
		}
		const r = clampChannel(128 - u * preset.interiorMagnify * 127);
		const g = clampChannel(128 - v * preset.interiorMagnify * 127);
		return [r, g, 128, 255];
	}

	const eps = 0.0025;
	const gx =
		sdRoundedBox(u + eps, v, 1, 1, preset.cornerRadius) -
		sdRoundedBox(u - eps, v, 1, 1, preset.cornerRadius);
	const gy =
		sdRoundedBox(u, v + eps, 1, 1, preset.cornerRadius) -
		sdRoundedBox(u, v - eps, 1, 1, preset.cornerRadius);
	const len = Math.hypot(gx, gy);
	const nx = len > 1e-6 ? gx / len : 0;
	const ny = len > 1e-6 ? gy / len : 0;

	const t = (d + preset.bevelWidth) / preset.bevelWidth;
	const mag = Math.pow(Math.sin(t * (Math.PI / 2)), preset.power);

	const r = clampChannel(128 + nx * mag * 127);
	const g = clampChannel(128 + ny * mag * 127);
	return [r, g, 128, 255];
}

function clampChannel(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * 通过离屏 Canvas 烘焙单张 256×256 Fresnel 折射位移图（PNG DataURL）并缓存。
 */
export function bakeDisplacementMapDataUrl(
	presetId: RefractionPresetId,
	size = 256,
): string | null {
	if (typeof document === "undefined") return null;
	const cacheKey = `${presetId}:${size}`;
	const cached = bakedMapCache.get(cacheKey);
	if (cached) return cached;

	const preset = REFRACTION_PRESETS[presetId];
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const imageData = ctx.createImageData(size, size);
	const data = imageData.data;
	const invHalf = 2 / (size - 1);

	for (let y = 0; y < size; y++) {
		const v = y * invHalf - 1;
		for (let x = 0; x < size; x++) {
			const u = x * invHalf - 1;
			const [r, g, b, a] = computeFresnelBevelSample(u, v, preset);
			const offset = (y * size + x) * 4;
			data[offset] = r;
			data[offset + 1] = g;
			data[offset + 2] = b;
			data[offset + 3] = a;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	const url = canvas.toDataURL("image/png");
	bakedMapCache.set(cacheKey, url);
	return url;
}

/**
 * 将预烘焙的 Fresnel 位移图注入全局共享 SVG <feImage> 节点。
 */
export function populateDisplacementMaps(
	root: Document | Element | null = typeof document !== "undefined" ? document : null,
	size = 256,
): boolean {
	if (!root) return false;
	let populated = 0;
	for (const preset of Object.values(REFRACTION_PRESETS)) {
		const el = root.querySelector(`#${preset.imageElementId}`);
		if (!el) continue;
		const url = bakeDisplacementMapDataUrl(preset.id, size);
		if (!url) continue;
		el.setAttribute("href", url);
		populated++;
	}
	return populated > 0;
}
