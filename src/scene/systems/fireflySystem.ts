import * as THREE from "three";
import { createFallenLeafTexture } from "../assets.ts";
import {
	clamp,
	computeFireflyCursorForce,
	type EasterEggSample,
	type GirlAnimSample,
	lerp,
} from "../simulationLogic.ts";

export interface FireflyUpdateContext {
	time: number;
	dt: number;
	density: number;
	brightness: number;
	qualityScale: number;
	cursorWorldX: number;
	cursorWorldY: number;
	cursorActive: boolean;
	cursorIdleSec: number;
	girlPalmWorld: THREE.Vector3;
	girlBasePos: THREE.Vector3;
	girlSample: GirlAnimSample;
	easterEgg: EasterEggSample;
	reducedMotion: boolean;
}

export interface FireflyLightFeedback {
	worldPos: THREE.Vector3;
	intensity: number;
}

export interface FireflySystemRig {
	group: THREE.Group;
	setPixelRatio: (pixelRatio: number) => void;
	update: (ctx: FireflyUpdateContext) => FireflyLightFeedback;
	dispose: () => void;
}

interface FireflyAgent {
	homeX: number;
	homeY: number;
	homeZ: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	baseSize: number;
	phase: number;
	blinkSpeed: number;
	wanderSpeed: number;
	hueShift: number;
	layer: 0 | 1 | 2;
	threshold: number;
	qualityGate: number;
	nearGirlBias: boolean;
	gatherIndex: number;
	ribbonT: number;
	inRibbon: boolean;
}

function seededRand(seed: number): number {
	const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
	return s - Math.floor(s);
}

/**
 * 多景深 3D 源氏萤粒子生态：支持动态更新 uPixelRatio 与按画质档位平滑缩放活跃粒子数。
 */
export function createFireflySystem(maxCount = 175): FireflySystemRig {
	const group = new THREE.Group();
	const totalCount = maxCount + 1;
	const agents: FireflyAgent[] = [];

	agents.push({
		homeX: 0.4,
		homeY: 1.8,
		homeZ: 1.5,
		x: 0.4,
		y: 1.8,
		z: 1.5,
		vx: 0,
		vy: 0,
		vz: 0,
		baseSize: 1.48,
		phase: 0,
		blinkSpeed: 1.6,
		wanderSpeed: 0.4,
		hueShift: 0.35,
		layer: 1,
		threshold: 0,
		qualityGate: 0,
		nearGirlBias: true,
		gatherIndex: -1,
		ribbonT: 0.5,
		inRibbon: false,
	});

	let gatherCounter = 0;
	for (let i = 1; i < totalCount; i++) {
		const r1 = seededRand(i * 1.13);
		const r2 = seededRand(i * 2.71 + 9.4);
		const r3 = seededRand(i * 4.37 + 17.2);
		const r4 = seededRand(i * 7.19 + 31.8);
		const r5 = seededRand(i * 9.83 + 53.1);

		let layer: 0 | 1 | 2 = 1;
		if (i < totalCount * 0.3) layer = 0;
		else if (i > totalCount * 0.85) layer = 2;

		let homeX: number;
		let homeY: number;
		let homeZ: number;
		let baseSize: number;
		let nearGirlBias = false;

		if (layer === 0) {
			homeX = lerp(-13.8, 11.8, r1);
			homeY = lerp(0.55, 3.85, r2);
			homeZ = lerp(-15.5, -5.5, r3);
			baseSize = lerp(0.54, 0.92, r4);
		} else if (layer === 1) {
			nearGirlBias = r5 < 0.24;
			if (nearGirlBias) {
				homeX = lerp(0.15, 3.35, r1);
				homeY = lerp(0.75, 2.75, r2);
				homeZ = lerp(0.65, 3.05, r3);
			} else {
				homeX = lerp(-8.8, 6.2, r1);
				homeY = lerp(0.35, 3.65, r2);
				homeZ = lerp(-4.5, 3.3, r3);
			}
			baseSize = lerp(0.84, 1.36, r4);
		} else {
			const side = i % 2 === 0 ? -1 : 1;
			homeX = side < 0 ? lerp(-6.4, -1.2, r1) : lerp(3.8, 6.4, r1);
			homeY = lerp(0.55, 3.6, r2);
			homeZ = lerp(4.8, 7.6, r3);
			baseSize = lerp(1.35, 2.05, r4);
		}

		const gatherIndex = layer === 1 && gatherCounter < 18 ? gatherCounter++ : -1;
		const inRibbon = layer !== 2 && r4 < 0.72;

		agents.push({
			homeX,
			homeY,
			homeZ,
			x: homeX,
			y: homeY,
			z: homeZ,
			vx: 0,
			vy: 0,
			vz: 0,
			baseSize,
			phase: r1 * Math.PI * 20,
			blinkSpeed: lerp(0.72, 1.82, r2),
			wanderSpeed: lerp(0.2, 0.5, r3),
			hueShift: seededRand(i * 15.7 + 2.3),
			layer,
			threshold: r5,
			qualityGate: seededRand(i * 19.13 + 7.3),
			nearGirlBias,
			gatherIndex,
			ribbonT: seededRand(i * 13.37 + 4.7),
			inRibbon,
		});
	}

	const positions = new Float32Array(totalCount * 3);
	const sizes = new Float32Array(totalCount);
	const alphas = new Float32Array(totalCount);
	const bokehs = new Float32Array(totalCount);
	const hues = new Float32Array(totalCount);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
	geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
	geometry.setAttribute("aBokeh", new THREE.BufferAttribute(bokehs, 1));
	geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1));

	const initPr =
		typeof window !== "undefined" ? Math.min(Math.max(window.devicePixelRatio || 1, 1.25), 2.5) : 1;

	const material = new THREE.ShaderMaterial({
		uniforms: {
			uPixelRatio: { value: initPr },
			uBrightness: { value: 1.0 },
		},
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aBokeh;
      attribute float aHue;

      uniform float uPixelRatio;

      varying float vAlpha;
      varying float vBokeh;
      varying float vHue;

      void main() {
        vAlpha = aAlpha;
        vBokeh = aBokeh;
        vHue = aHue;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(1.5, -mvPosition.z);
        gl_PointSize = clamp((aSize * 185.0 * uPixelRatio) / dist, 2.0, 52.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uBrightness;
      varying float vAlpha;
      varying float vBokeh;
      varying float vHue;

      void main() {
        if (vAlpha <= 0.004) discard;
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c) * 2.0;
        if (d > 1.0) discard;

        float sharpCore = exp(-d * d * 18.0);
        float softHalo = pow(max(0.0, 1.0 - d), 2.75) * 0.46;

        float discBody = smoothstep(1.0, 0.25, d) * 0.22;
        float apertureRim = exp(-pow((d - 0.68) / 0.22, 2.0)) * 0.07;
        float centerSoft = exp(-d * d * 3.4) * 0.24;
        float bokehShape = discBody + apertureRim + centerSoft;

        float shape = mix(sharpCore * 1.45 + softHalo, bokehShape, vBokeh);

        vec3 warmAmber = vec3(1.12, 0.68, 0.16);
        vec3 paleChartreuse = vec3(0.92, 1.05, 0.30);
        vec3 haloCol = mix(warmAmber, paleChartreuse, vHue * 0.42);
        vec3 coreCol = vec3(1.65, 1.48, 0.88);

        vec3 col = mix(haloCol, coreCol, sharpCore * (1.0 - vBokeh * 0.8));
        float alpha = clamp(shape * vAlpha * uBrightness, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
	});

	const points = new THREE.Points(geometry, material);
	points.frustumCulled = false;
	points.renderOrder = 8;
	group.add(points);

	const posAttr = geometry.attributes.position as THREE.BufferAttribute;
	const sizeAttr = geometry.attributes.aSize as THREE.BufferAttribute;
	const alphaAttr = geometry.attributes.aAlpha as THREE.BufferAttribute;
	const bokehAttr = geometry.attributes.aBokeh as THREE.BufferAttribute;
	const hueAttr = geometry.attributes.aHue as THREE.BufferAttribute;

	const feedback: FireflyLightFeedback = {
		worldPos: new THREE.Vector3(1.6, 1.4, 2.0),
		intensity: 0,
	};

	return {
		group,
		setPixelRatio: (pixelRatio) => {
			material.uniforms.uPixelRatio.value = clamp(pixelRatio, 1.0, 2.5);
		},
		update: (ctx): FireflyLightFeedback => {
			const {
				time,
				dt,
				density,
				brightness,
				qualityScale,
				cursorWorldX,
				cursorWorldY,
				cursorActive,
				cursorIdleSec,
				girlPalmWorld,
				girlBasePos,
				girlSample,
				easterEgg,
				reducedMotion,
			} = ctx;

			material.uniforms.uBrightness.value = brightness;
			const safeDt = clamp(dt, 0.001, 0.08);
			const motionMul = reducedMotion ? 0.25 : 1.0;
			const clampedQuality = clamp(qualityScale, 0.25, 1.0);

			const hero = agents[0];
			hues[0] = hero.hueShift;
			if (girlSample.heroFireflyState === "hidden") {
				alphas[0] = 0;
				sizes[0] = 0.01;
				bokehs[0] = 0;
			} else {
				const p = girlSample.heroProgress;
				if (girlSample.heroFireflyState === "approaching") {
					const startX = girlPalmWorld.x - 1.65;
					const startY = girlPalmWorld.y + 0.85;
					const startZ = girlPalmWorld.z - 0.6;
					hero.x = lerp(startX, girlPalmWorld.x, p) + Math.sin(p * Math.PI) * 0.22;
					hero.y = lerp(startY, girlPalmWorld.y + 0.05, p) + Math.sin(p * Math.PI * 2) * 0.14;
					hero.z = lerp(startZ, girlPalmWorld.z + 0.08, p);
					alphas[0] = clamp(p * 1.4, 0.15, 1.0);
					sizes[0] = 1.48;
				} else if (girlSample.heroFireflyState === "resting") {
					hero.x = girlPalmWorld.x + Math.sin(time * 2.4) * 0.024;
					hero.y = girlPalmWorld.y + 0.06 + Math.sin(time * 3.1) * 0.028;
					hero.z = girlPalmWorld.z + 0.09;
					alphas[0] = 0.94 + Math.sin(time * 3.6) * 0.1;
					sizes[0] = 1.75 + Math.sin(time * 3.2) * 0.15;
				} else {
					const spiralAngle = p * Math.PI * 2.2;
					const spiralRadius = p * 0.72;
					hero.x = girlPalmWorld.x - p * 0.95 + Math.cos(spiralAngle) * spiralRadius;
					hero.y = girlPalmWorld.y + 0.08 + p * 3.45;
					hero.z = girlPalmWorld.z + 0.08 - p * 1.8 + Math.sin(spiralAngle) * spiralRadius * 0.5;
					alphas[0] = (1.0 - p * 0.85) * (0.85 + 0.15 * Math.sin(time * 4.0));
					sizes[0] = lerp(1.65, 1.05, p);
				}
				positions[0] = hero.x;
				positions[1] = hero.y;
				positions[2] = hero.z;
				bokehs[0] = 0.0;
			}

			const ribbonFactor = easterEgg.ribbonFormation;
			const girlAttract = girlSample.attractStrength;

			let bestScore = 0;
			let bestX = girlBasePos.x - 0.35;
			let bestY = girlBasePos.y + 0.25;
			let bestZ = girlBasePos.z + 0.15;

			for (let i = 1; i < totalCount; i++) {
				const f = agents[i];

				// 保留少女交互环绕群与光带骨干，其余粒子按画质档位平滑裁减
				if (f.gatherIndex < 0 && f.qualityGate > clampedQuality) {
					alphas[i] = 0;
					sizes[i] = 0.01;
					continue;
				}

				const effectiveDensity = Math.max(density, ribbonFactor * 0.95);
				const densityFade = clamp((effectiveDensity - f.threshold * 0.85) * 4.0, 0, 1);

				const t = time * f.wanderSpeed * motionMul + f.phase;
				let targetX =
					f.homeX +
					Math.sin(t * 1.05) * 0.82 +
					Math.cos(t * 0.51 + f.phase) * 0.54 +
					Math.sin(t * 0.29 - f.homeY) * 0.28;
				let targetY =
					f.homeY + Math.sin(t * 0.83 + 1.2) * 0.4 + Math.cos(t * 1.38 + f.homeX * 0.4) * 0.18;
				let targetZ = f.homeZ + Math.cos(t * 0.72 + 2.1) * 0.65;

				if (targetY < 0.24) targetY = 0.24;

				if (girlAttract > 0.01 && f.gatherIndex >= 0) {
					const orbitAngle = time * 0.72 + (f.gatherIndex / 18) * Math.PI * 2 + f.phase * 0.2;
					const orbitR = 0.48 + (f.gatherIndex % 4) * 0.28;
					const gx = girlPalmWorld.x + Math.cos(orbitAngle) * orbitR;
					const gy = girlPalmWorld.y + 0.12 + Math.sin(orbitAngle * 1.3) * 0.36;
					const gz = girlPalmWorld.z + Math.sin(orbitAngle) * orbitR * 0.55;
					targetX = lerp(targetX, gx, girlAttract * 0.88);
					targetY = lerp(targetY, gy, girlAttract * 0.88);
					targetZ = lerp(targetZ, gz, girlAttract * 0.88);
				} else if (girlSample.phase === "releasing" && f.gatherIndex >= 0) {
					const angle = (f.gatherIndex / 18) * Math.PI * 2;
					targetX += Math.cos(angle) * 1.8;
					targetY += 0.9 + Math.abs(Math.sin(angle)) * 1.1;
				}

				if (ribbonFactor > 0.01 && f.inRibbon) {
					const s = (f.ribbonT + time * 0.045) % 1.0;
					const rx = lerp(-7.8, 3.6, s);
					const arch = Math.sin(s * Math.PI);
					const ry =
						0.75 + arch * 2.15 + Math.sin(s * Math.PI * 4.0 + time * 1.4 + f.phase) * 0.26;
					const rz = lerp(-9.5, 0.8, s) + Math.cos(s * Math.PI * 2.0 + time * 0.9) * 0.75;
					targetX = lerp(targetX, rx, ribbonFactor * 0.94);
					targetY = lerp(targetY, ry, ribbonFactor * 0.94);
					targetZ = lerp(targetZ, rz, ribbonFactor * 0.94);
				}

				const springK = f.layer === 2 ? 1.35 : 2.05;
				f.vx += (targetX - f.x) * springK * safeDt;
				f.vy += (targetY - f.y) * springK * safeDt;
				f.vz += (targetZ - f.z) * springK * safeDt;

				if (f.layer >= 1 && ribbonFactor < 0.35) {
					const force = computeFireflyCursorForce(
						f.x,
						f.y,
						cursorWorldX,
						cursorWorldY,
						cursorActive,
						cursorIdleSec,
						f.layer === 2 ? 3.2 : 2.6,
					);
					f.vx += force.x * safeDt * 5.2;
					f.vy += force.y * safeDt * 5.2;
				}

				const drag = Math.exp(-2.8 * safeDt);
				f.vx *= drag;
				f.vy *= drag;
				f.vz *= drag;

				f.x += f.vx * safeDt;
				f.y += f.vy * safeDt;
				f.z += f.vz * safeDt;

				const pulseWave = Math.sin(time * f.blinkSpeed + f.phase);
				const biolum = 0.14 + 0.86 * Math.pow(Math.max(0, pulseWave * 0.5 + 0.5), 2.3);
				const ribbonBoost = f.inRibbon ? ribbonFactor * 0.45 : 0;
				const layerOpacity = f.layer === 2 ? 0.5 : f.layer === 0 ? 0.64 : 0.92;
				const finalAlpha = clamp(
					biolum * layerOpacity * densityFade + ribbonBoost * densityFade,
					0,
					1,
				);

				positions[i * 3] = f.x;
				positions[i * 3 + 1] = f.y;
				positions[i * 3 + 2] = f.z;
				sizes[i] = f.baseSize * (0.85 + 0.32 * biolum);
				alphas[i] = finalAlpha;
				bokehs[i] = f.layer === 2 ? 0.9 : f.layer === 0 ? 0.24 : 0.0;
				hues[i] = f.hueShift;

				if (f.layer === 1 && finalAlpha > 0.25) {
					const dx = f.x - girlBasePos.x;
					const dy = f.y - girlBasePos.y;
					const dz = f.z - girlBasePos.z;
					const distSq = dx * dx + dy * dy + dz * dz;
					if (distSq < 5.2) {
						const score = finalAlpha / (0.65 + distSq);
						if (score > bestScore) {
							bestScore = score;
							bestX = f.x;
							bestY = f.y;
							bestZ = f.z;
						}
					}
				}
			}

			posAttr.needsUpdate = true;
			sizeAttr.needsUpdate = true;
			alphaAttr.needsUpdate = true;
			bokehAttr.needsUpdate = true;
			hueAttr.needsUpdate = true;

			if (girlSample.heroFireflyState !== "hidden" && alphas[0] > 0.15) {
				feedback.worldPos.set(hero.x, hero.y, hero.z);
				feedback.intensity = clamp(alphas[0] * (0.65 + girlSample.palmGlow * 0.85), 0, 1.5);
			} else {
				feedback.worldPos.set(bestX, bestY, bestZ);
				feedback.intensity = clamp(bestScore * 0.72, 0, 0.75);
			}

			return feedback;
		},
		dispose: () => {
			geometry.dispose();
			material.dispose();
		},
	};
}

export interface LeafSystemRig {
	group: THREE.Group;
	update: (
		time: number,
		dt: number,
		reducedMotion: boolean,
		onTouchWater: (x: number, z: number) => void,
	) => void;
	dispose: () => void;
}

interface FallingLeaf {
	mesh: THREE.Mesh;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	phase: number;
	rotSpeed: number;
	cooldown: number;
}

export function createFallingLeavesSystem(count = 7): LeafSystemRig {
	const group = new THREE.Group();
	const tex = createFallenLeafTexture(256);
	const geo = new THREE.PlaneGeometry(0.24, 0.24);
	const mat = new THREE.MeshBasicMaterial({
		map: tex,
		transparent: true,
		opacity: 0.78,
		side: THREE.DoubleSide,
		depthWrite: false,
	});

	const leaves: FallingLeaf[] = [];
	for (let i = 0; i < count; i++) {
		const mesh = new THREE.Mesh(geo, mat);
		mesh.renderOrder = 7;
		group.add(mesh);
		const startX = -5.5 + seededRand(i * 3.1) * 9.5;
		const startY = 2.2 + seededRand(i * 5.7) * 4.5;
		const startZ = -3.8 + seededRand(i * 8.3) * 8.2;
		mesh.position.set(startX, startY, startZ);
		leaves.push({
			mesh,
			x: startX,
			y: startY,
			z: startZ,
			vx: 0.16 + seededRand(i * 2.1) * 0.24,
			vy: -(0.18 + seededRand(i * 4.9) * 0.16),
			phase: seededRand(i * 9.1) * Math.PI * 2,
			rotSpeed: 0.7 + seededRand(i * 6.3) * 0.9,
			cooldown: i * 1.4,
		});
	}

	return {
		group,
		update: (time, dt, reducedMotion, onTouchWater) => {
			const safeDt = clamp(dt, 0.001, 0.08);
			const m = reducedMotion ? 0.2 : 1.0;

			for (let i = 0; i < leaves.length; i++) {
				const lf = leaves[i];
				if (lf.cooldown > 0) {
					lf.cooldown -= safeDt;
					lf.mesh.visible = false;
					continue;
				}
				lf.mesh.visible = true;

				lf.x += (lf.vx + Math.sin(time * 0.9 + lf.phase) * 0.28) * safeDt * m;
				lf.y += lf.vy * safeDt * m;
				lf.z += Math.cos(time * 0.7 + lf.phase) * 0.08 * safeDt * m;

				lf.mesh.position.set(lf.x, lf.y, lf.z);
				lf.mesh.rotation.set(
					Math.sin(time * lf.rotSpeed + lf.phase) * 0.7,
					Math.cos(time * lf.rotSpeed * 0.8 + lf.phase) * 0.6,
					time * 0.45 + lf.phase,
				);

				if (lf.y <= 0.03) {
					if (lf.z < 4.5 && lf.z > -16 && Math.abs(lf.x) < 8.5) {
						onTouchWater(lf.x, lf.z);
					}
					const s = seededRand(time + i * 11.7);
					lf.x = -6.2 + s * 9.2;
					lf.y = 4.6 + seededRand(time * 1.3 + i) * 2.2;
					lf.z = -5.5 + seededRand(time * 0.7 + i * 3.1) * 9.5;
					lf.cooldown = 2.8 + seededRand(time + i * 5.3) * 5.5;
				}
			}
		},
		dispose: () => {
			geo.dispose();
			mat.dispose();
			tex.dispose();
		},
	};
}
