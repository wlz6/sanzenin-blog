import * as THREE from "three";

export interface SceneAssetUrls {
	lakePanorama: string;
	girlSitting: string;
	woodPlanks: string;
	forestShores: string;
	fallbackPoster: string;
}

export const SCENE_ASSETS: SceneAssetUrls = {
	lakePanorama: "/scenes/firefly-lake/lake-panorama.webp",
	girlSitting: "/scenes/firefly-lake/girl-sitting.webp",
	woodPlanks: "/scenes/firefly-lake/wood-planks.webp",
	forestShores: "/scenes/firefly-lake/forest-shores.webp",
	fallbackPoster: "/scenes/firefly-lake/firefly-lake-fallback.webp",
};

export function resolveSceneAssets(basePath = "/"): SceneAssetUrls {
	const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
	return {
		lakePanorama: `${prefix}${SCENE_ASSETS.lakePanorama}`,
		girlSitting: `${prefix}${SCENE_ASSETS.girlSitting}`,
		woodPlanks: `${prefix}${SCENE_ASSETS.woodPlanks}`,
		forestShores: `${prefix}${SCENE_ASSETS.forestShores}`,
		fallbackPoster: `${prefix}${SCENE_ASSETS.fallbackPoster}`,
	};
}

export function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.referrerPolicy = "no-referrer";
		img.onload = () => resolve(img);
		img.onerror = (err) => reject(err);
		img.src = url;
	});
}

/**
 * 加载少女透明贴图：对预烘焙透明通道 WebP 零拷贝直接上传 GPU；
 * 若输入为品红底色图像，则执行四边泛洪抠图、双通道距离羽化与月光去溢色。
 */
export function createChromaKeyedTexture(
	image: HTMLImageElement,
	maxAnisotropy = 4,
): THREE.Texture {
	const width = image.naturalWidth || image.width;
	const height = image.naturalHeight || image.height;

	// 检测四角透明通道：已预烘焙 RGBA 贴图跳过主线程 BFS 泛洪
	const probeCanvas = document.createElement("canvas");
	probeCanvas.width = 4;
	probeCanvas.height = 4;
	const probeCtx = probeCanvas.getContext("2d", { willReadFrequently: true });
	if (probeCtx) {
		probeCtx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
		probeCtx.drawImage(image, width - 1, 0, 1, 1, 1, 0, 1, 1);
		probeCtx.drawImage(image, 0, height - 1, 1, 1, 2, 0, 1, 1);
		probeCtx.drawImage(image, width - 1, height - 1, 1, 1, 3, 0, 1, 1);
		const probe = probeCtx.getImageData(0, 0, 4, 1).data;
		if (probe[3] < 10 && probe[7] < 10 && probe[11] < 10 && probe[15] < 10) {
			const directTex = new THREE.Texture(image);
			directTex.colorSpace = THREE.SRGBColorSpace;
			directTex.anisotropy = maxAnisotropy;
			directTex.generateMipmaps = false;
			directTex.minFilter = THREE.LinearFilter;
			directTex.magFilter = THREE.LinearFilter;
			directTex.needsUpdate = true;
			return directTex;
		}
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) {
		const fallback = new THREE.Texture(image);
		fallback.colorSpace = THREE.SRGBColorSpace;
		fallback.needsUpdate = true;
		return fallback;
	}

	ctx.drawImage(image, 0, 0, width, height);
	const imgData = ctx.getImageData(0, 0, width, height);
	const data = imgData.data;

	const sampleIndices = [
		0,
		(width - 1) * 4,
		(height - 1) * width * 4,
		((height - 1) * width + (width - 1)) * 4,
	];
	let keyR = 0;
	let keyG = 0;
	let keyB = 0;
	for (const idx of sampleIndices) {
		keyR += data[idx];
		keyG += data[idx + 1];
		keyB += data[idx + 2];
	}
	keyR /= 4;
	keyG /= 4;
	keyB /= 4;

	const totalPixels = width * height;
	const isBg = new Uint8Array(totalPixels);
	const queue = new Int32Array(totalPixels);
	let qHead = 0;
	let qTail = 0;

	const isMagentaCandidate = (pIdx: number): boolean => {
		const i = pIdx * 4;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const dr = r - keyR;
		const dg = g - keyG;
		const db = b - keyB;
		const distSq = dr * dr + dg * dg + db * db;
		const magentaExcess = Math.min(r, b) - g;
		return distSq < 15500 || (magentaExcess > 48 && r > 140 && b > 140);
	};

	const enqueueIfBg = (x: number, y: number) => {
		const p = y * width + x;
		if (!isBg[p] && isMagentaCandidate(p)) {
			isBg[p] = 1;
			queue[qTail++] = p;
		}
	};

	for (let x = 0; x < width; x++) {
		enqueueIfBg(x, 0);
		enqueueIfBg(x, height - 1);
	}
	for (let y = 0; y < height; y++) {
		enqueueIfBg(0, y);
		enqueueIfBg(width - 1, y);
	}

	while (qHead < qTail) {
		const p = queue[qHead++];
		const x = p % width;
		const y = (p - x) / width;
		if (x > 0) enqueueIfBg(x - 1, y);
		if (x < width - 1) enqueueIfBg(x + 1, y);
		if (y > 0) enqueueIfBg(x, y - 1);
		if (y < height - 1) enqueueIfBg(x, y + 1);
	}

	for (let p = 0; p < totalPixels; p++) {
		if (isBg[p]) continue;
		const i = p * 4;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const magentaExcess = Math.min(r, b) - g;
		if (magentaExcess > 75 && r > 175 && b > 175 && g < 110) {
			isBg[p] = 1;
		}
	}

	const alphaBuf = new Float32Array(totalPixels);
	for (let p = 0; p < totalPixels; p++) {
		if (isBg[p]) {
			alphaBuf[p] = 0;
			continue;
		}
		const i = p * 4;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const x = p % width;
		const y = (p - x) / width;

		let bgNeighbors = 0;
		if (x > 0 && isBg[p - 1]) bgNeighbors++;
		if (x < width - 1 && isBg[p + 1]) bgNeighbors++;
		if (y > 0 && isBg[p - width]) bgNeighbors++;
		if (y < height - 1 && isBg[p + width]) bgNeighbors++;

		const magentaExcess = Math.min(r, b) - g;
		if (magentaExcess > 6 || bgNeighbors > 0) {
			const feather = Math.max(0, Math.min(1, 1 - (magentaExcess - 8) / 52));
			const edgeSoft = bgNeighbors > 0 ? Math.min(feather, 0.84 - bgNeighbors * 0.16) : feather;
			alphaBuf[p] = Math.max(0, Math.min(1, edgeSoft));
		} else {
			alphaBuf[p] = 1;
		}
	}

	for (let p = 0; p < totalPixels; p++) {
		const i = p * 4;
		const a = alphaBuf[p];
		if (a <= 0.001) {
			const x = p % width;
			const y = (p - x) / width;
			let sr = 0;
			let sg = 0;
			let sb = 0;
			let cnt = 0;
			for (let oy = -1; oy <= 1; oy++) {
				for (let ox = -1; ox <= 1; ox++) {
					const nx = x + ox;
					const ny = y + oy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const np = ny * width + nx;
						if (alphaBuf[np] > 0.5) {
							sr += data[np * 4];
							sg += data[np * 4 + 1];
							sb += data[np * 4 + 2];
							cnt++;
						}
					}
				}
			}
			if (cnt > 0) {
				data[i] = Math.round(sr / cnt);
				data[i + 1] = Math.round(sg / cnt);
				data[i + 2] = Math.round(sb / cnt);
			} else {
				data[i] = 152;
				data[i + 1] = 188;
				data[i + 2] = 216;
			}
			data[i + 3] = 0;
			continue;
		}

		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const magentaExcess = Math.min(r, b) - g;

		if (magentaExcess > 4) {
			const lum = 0.299 * r + 0.587 * g + 0.114 * b;
			const despillFactor = Math.min(1, magentaExcess / 46);
			const moonR = Math.min(255, lum * 0.86 + 14);
			const moonG = Math.min(255, lum * 0.96 + 20);
			const moonB = Math.min(255, lum * 1.07 + 28);
			data[i] = Math.round(r + (moonR - r) * despillFactor);
			data[i + 1] = Math.round(g + (moonG - g) * despillFactor);
			data[i + 2] = Math.round(b + (moonB - b) * despillFactor);
		}
		data[i + 3] = Math.round(a * 255);
	}

	ctx.putImageData(imgData, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = maxAnisotropy;
	texture.generateMipmaps = false;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.needsUpdate = true;
	return texture;
}

/**
 * 由木板 Albedo 实时经 3×3 Sobel 合成切线空间 NormalMap 与校准 RoughnessMap。
 */
export function createPbrMapsFromAlbedo(
	image: HTMLImageElement,
	strength = 2.6,
	maxAnisotropy = 8,
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
	const size = Math.min(1024, Math.max(256, image.naturalWidth || 512));
	const srcCanvas = document.createElement("canvas");
	srcCanvas.width = size;
	srcCanvas.height = size;
	const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
	srcCtx.drawImage(image, 0, 0, size, size);
	const src = srcCtx.getImageData(0, 0, size, size).data;

	const height = new Float32Array(size * size);
	for (let i = 0; i < size * size; i++) {
		const idx = i * 4;
		height[i] = (0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]) / 255;
	}

	const normCanvas = document.createElement("canvas");
	normCanvas.width = size;
	normCanvas.height = size;
	const normCtx = normCanvas.getContext("2d")!;
	const normImg = normCtx.createImageData(size, size);

	const roughCanvas = document.createElement("canvas");
	roughCanvas.width = size;
	roughCanvas.height = size;
	const roughCtx = roughCanvas.getContext("2d")!;
	const roughImg = roughCtx.createImageData(size, size);

	const sampleH = (x: number, y: number) => {
		const wx = ((x % size) + size) % size;
		const wy = ((y % size) + size) % size;
		return height[wy * size + wx];
	};

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const tl = sampleH(x - 1, y - 1);
			const t = sampleH(x, y - 1);
			const tr = sampleH(x + 1, y - 1);
			const l = sampleH(x - 1, y);
			const c = sampleH(x, y);
			const r = sampleH(x + 1, y);
			const bl = sampleH(x - 1, y + 1);
			const b = sampleH(x, y + 1);
			const br = sampleH(x + 1, y + 1);

			const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
			const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
			const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);

			const nx = -dx * invLen;
			const ny = -dy * invLen;
			const nz = invLen;

			const idx = (y * size + x) * 4;
			normImg.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
			normImg.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
			normImg.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
			normImg.data[idx + 3] = 255;

			const rough = Math.max(0.46, Math.min(0.95, 0.92 - c * 0.42));
			const rv = Math.round(rough * 255);
			roughImg.data[idx] = rv;
			roughImg.data[idx + 1] = rv;
			roughImg.data[idx + 2] = rv;
			roughImg.data[idx + 3] = 255;
		}
	}

	normCtx.putImageData(normImg, 0, 0);
	roughCtx.putImageData(roughImg, 0, 0);

	const normalMap = new THREE.CanvasTexture(normCanvas);
	normalMap.colorSpace = THREE.NoColorSpace;
	normalMap.wrapS = THREE.RepeatWrapping;
	normalMap.wrapT = THREE.RepeatWrapping;
	normalMap.repeat.set(1.6, 1.0);
	normalMap.anisotropy = maxAnisotropy;
	normalMap.needsUpdate = true;

	const roughnessMap = new THREE.CanvasTexture(roughCanvas);
	roughnessMap.colorSpace = THREE.NoColorSpace;
	roughnessMap.wrapS = THREE.RepeatWrapping;
	roughnessMap.wrapT = THREE.RepeatWrapping;
	roughnessMap.repeat.set(1.6, 1.0);
	roughnessMap.anisotropy = maxAnisotropy;
	roughnessMap.needsUpdate = true;

	return { normalMap, roughnessMap };
}

export function createWoodMicroReliefTexture(size = 1024): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, size, size);

	const plankCount = 6;
	const plankH = size / plankCount;
	for (let p = 0; p < plankCount; p++) {
		const y0 = p * plankH;
		ctx.fillStyle = "#242424";
		ctx.fillRect(0, y0, size, 3);

		for (let i = 0; i < 42; i++) {
			const gy = y0 + 4 + ((i * 7.3 + p * 11) % (plankH - 6));
			const shade = 105 + Math.floor(Math.sin(i * 1.9 + p) * 28);
			ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, gy);
			for (let x = 0; x <= size; x += 32) {
				const wave = Math.sin(x * 0.04 + i + p) * 1.6;
				ctx.lineTo(x, gy + wave);
			}
			ctx.stroke();
		}
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.needsUpdate = true;
	return tex;
}

export function createRadialShadowTexture(size = 128): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	const half = size / 2;
	const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
	grad.addColorStop(0, "rgba(4, 9, 18, 0.72)");
	grad.addColorStop(0.55, "rgba(4, 9, 18, 0.34)");
	grad.addColorStop(1, "rgba(4, 9, 18, 0.0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);

	const tex = new THREE.CanvasTexture(canvas);
	tex.needsUpdate = true;
	return tex;
}

export function createLanternGlowTexture(size = 512): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	const half = size / 2;
	const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
	grad.addColorStop(0, "rgba(255, 240, 196, 0.92)");
	grad.addColorStop(0.22, "rgba(246, 215, 122, 0.45)");
	grad.addColorStop(0.52, "rgba(232, 174, 82, 0.14)");
	grad.addColorStop(1, "rgba(220, 150, 60, 0.0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

export function createFallenLeafTexture(size = 256): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, size, size);

	ctx.save();
	ctx.translate(size / 2, size / 2);
	ctx.rotate(-0.35);

	const grad = ctx.createLinearGradient(-20, -10, 22, 12);
	grad.addColorStop(0, "#2a5f63");
	grad.addColorStop(0.6, "#1e484e");
	grad.addColorStop(1, "#3b7375");

	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.moveTo(-22, 0);
	ctx.quadraticCurveTo(0, -14, 24, 0);
	ctx.quadraticCurveTo(0, 13, -22, 0);
	ctx.closePath();
	ctx.fill();

	ctx.strokeStyle = "rgba(185, 216, 232, 0.35)";
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(-20, 0);
	ctx.lineTo(20, 0);
	ctx.stroke();
	ctx.restore();

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

export function createOverhangingBranchTexture(size = 1024): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, size, size);

	ctx.strokeStyle = "#0c1f27";
	ctx.lineCap = "round";

	const drawStem = (
		x0: number,
		y0: number,
		cx: number,
		cy: number,
		x1: number,
		y1: number,
		w: number,
	) => {
		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.quadraticCurveTo(cx, cy, x1, y1);
		ctx.stroke();

		const steps = 16;
		for (let i = 2; i <= steps; i++) {
			const t = i / steps;
			const omt = 1 - t;
			const bx = omt * omt * x0 + 2 * omt * t * cx + t * t * x1;
			const by = omt * omt * y0 + 2 * omt * t * cy + t * t * y1;

			for (const side of [-1, 1]) {
				const angle = 0.4 + side * (0.62 + Math.sin(i * 1.7) * 0.25);
				const len = (24 + (1 - t) * 18) * (0.75 + Math.abs(Math.sin(i * 2.3 + side)) * 0.45);
				const wid = len * 0.24;

				ctx.save();
				ctx.translate(bx, by);
				ctx.rotate(angle);
				const lg = ctx.createLinearGradient(0, 0, len, 0);
				lg.addColorStop(0, "#0d262d");
				lg.addColorStop(0.7, "#163c42");
				lg.addColorStop(1, "#265860");
				ctx.fillStyle = lg;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
				ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
			}
		}
	};

	drawStem(0, 12, 165, 58, 345, 165, 7);
	drawStem(0, 58, 125, 130, 260, 275, 5);
	drawStem(40, 0, 210, 42, 420, 92, 5.5);
	drawStem(0, 135, 85, 225, 165, 360, 4);

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}
