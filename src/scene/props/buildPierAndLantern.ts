import * as THREE from "three";
import {
	createLanternGlowTexture,
	createOverhangingBranchTexture,
	createRadialShadowTexture,
	createWoodMicroReliefTexture,
} from "../assets.ts";

export interface PierRig {
	group: THREE.Group;
	deckTopY: number;
	applyPbrTextures: (
		albedo: THREE.Texture,
		normalMap: THREE.Texture,
		roughnessMap: THREE.Texture,
	) => void;
	dispose: () => void;
}

export interface LanternRig {
	group: THREE.Group;
	hitProxy: THREE.Mesh;
	pointLight: THREE.PointLight;
	flameCore: THREE.Mesh;
	haloSprite: THREE.Sprite;
	worldPosition: THREE.Vector3;
	update: (time: number, intensity: number, hoverBoost: number) => void;
	dispose: () => void;
}

export interface FoliageRig {
	group: THREE.Group;
	update: (
		time: number,
		windStrength: number,
		duskBlend: number,
		lanternIntensity: number,
		reducedMotion: boolean,
	) => void;
	dispose: () => void;
}

/**
 * 构建 3D 日式木质湖畔长桥：9 块倒角雪松木板、纵梁、铸铁角带、6 根圆木桩与湿润水线套环。
 */
export function buildWoodenPier(
	woodTexture: THREE.Texture | null,
	maxAnisotropy: number,
): PierRig {
	const group = new THREE.Group();
	const geometries: THREE.BufferGeometry[] = [];
	const materials: THREE.Material[] = [];
	const textures: THREE.Texture[] = [];

	const fallbackBump = createWoodMicroReliefTexture(1024);
	fallbackBump.repeat.set(2, 1);
	textures.push(fallbackBump);

	if (woodTexture) {
		woodTexture.colorSpace = THREE.SRGBColorSpace;
		woodTexture.wrapS = THREE.RepeatWrapping;
		woodTexture.wrapT = THREE.RepeatWrapping;
		woodTexture.anisotropy = maxAnisotropy;
		woodTexture.repeat.set(1.6, 1.0);
	}

	const plankTintVariants = [0xa8bacb, 0x96aab9, 0x8ea2b2];
	const plankRoughVariants = [0.74, 0.8, 0.7];
	const plankMats: THREE.MeshStandardMaterial[] = plankTintVariants.map((tint, idx) => {
		const m = new THREE.MeshStandardMaterial({
			color: woodTexture ? tint : 0x263846,
			map: woodTexture || null,
			bumpMap: fallbackBump,
			bumpScale: 0.04,
			roughness: plankRoughVariants[idx],
			metalness: 0.04,
			envMapIntensity: 0.55,
		});
		materials.push(m);
		return m;
	});

	const timberMat = new THREE.MeshStandardMaterial({
		color: 0x182530,
		bumpMap: fallbackBump,
		bumpScale: 0.055,
		roughness: 0.88,
		metalness: 0.04,
		envMapIntensity: 0.4,
	});
	materials.push(timberMat);

	const wetPilingMat = new THREE.MeshStandardMaterial({
		color: 0x0b1a22,
		roughness: 0.24,
		metalness: 0.08,
		envMapIntensity: 0.85,
	});
	materials.push(wetPilingMat);

	const ironMat = new THREE.MeshStandardMaterial({
		color: 0x2f3a44,
		roughness: 0.34,
		metalness: 0.84,
		envMapIntensity: 0.9,
	});
	materials.push(ironMat);

	const deckTopY = 0.82;
	const deckThickness = 0.105;
	const pierLength = 5.4;
	const pierDepth = 1.52;

	const plankCount = 9;
	const plankWidth = pierLength / plankCount - 0.026;
	const plankShape = new THREE.Shape();
	const hw = plankWidth / 2;
	const hh = deckThickness / 2;
	const ch = 0.012;
	plankShape.moveTo(-hw + ch, -hh);
	plankShape.lineTo(hw - ch, -hh);
	plankShape.lineTo(hw, -hh + ch);
	plankShape.lineTo(hw, hh - ch);
	plankShape.lineTo(hw - ch, hh);
	plankShape.lineTo(-hw + ch, hh);
	plankShape.lineTo(-hw, hh - ch);
	plankShape.lineTo(-hw, -hh + ch);
	plankShape.closePath();

	const plankGeo = new THREE.ExtrudeGeometry(plankShape, {
		depth: pierDepth,
		bevelEnabled: true,
		bevelThickness: 0.008,
		bevelSize: 0.006,
		bevelSegments: 2,
	});
	plankGeo.center();
	plankGeo.computeVertexNormals();
	geometries.push(plankGeo);

	for (let i = 0; i < plankCount; i++) {
		const px = -pierLength / 2 + plankWidth / 2 + i * (plankWidth + 0.026);
		const plank = new THREE.Mesh(plankGeo, plankMats[i % plankMats.length]);
		const jitterY = Math.sin(i * 2.3) * 0.0055;
		const jitterRotZ = Math.cos(i * 1.7) * 0.0045;
		plank.position.set(px, deckTopY - deckThickness / 2 + jitterY, 0);
		plank.rotation.z = jitterRotZ;
		plank.receiveShadow = true;
		plank.castShadow = true;
		group.add(plank);
	}

	const stringerGeo = new THREE.BoxGeometry(pierLength + 0.08, 0.135, 0.145);
	geometries.push(stringerGeo);
	for (const zOff of [-pierDepth * 0.42, 0, pierDepth * 0.42]) {
		const beam = new THREE.Mesh(stringerGeo, timberMat);
		beam.position.set(0.04, deckTopY - deckThickness - 0.06, zOff);
		beam.castShadow = true;
		beam.receiveShadow = true;
		group.add(beam);
	}

	const fasciaGeo = new THREE.BoxGeometry(0.1, 0.165, pierDepth + 0.02);
	const strapGeo = new THREE.BoxGeometry(0.125, 0.042, 0.16);
	geometries.push(fasciaGeo, strapGeo);
	const fascia = new THREE.Mesh(fasciaGeo, timberMat);
	fascia.position.set(-pierLength / 2 + 0.02, deckTopY - 0.095, 0);
	fascia.receiveShadow = true;
	group.add(fascia);

	for (const zSign of [-1, 1]) {
		const strap = new THREE.Mesh(strapGeo, ironMat);
		strap.position.set(-pierLength / 2 + 0.02, deckTopY - 0.11, zSign * (pierDepth * 0.44));
		group.add(strap);
	}

	const pilingGeo = new THREE.CylinderGeometry(0.105, 0.126, 1.85, 24);
	const capGeo = new THREE.CylinderGeometry(0.118, 0.112, 0.06, 24);
	const collarGeo = new THREE.CylinderGeometry(0.124, 0.134, 0.28, 24);
	geometries.push(pilingGeo, capGeo, collarGeo);

	const pilingCoords: [number, number, number][] = [
		[-pierLength * 0.42, -pierDepth * 0.42, 0.0],
		[-pierLength * 0.42, pierDepth * 0.42, 0.0],
		[-pierLength * 0.04, -pierDepth * 0.42, 0.0],
		[-pierLength * 0.04, pierDepth * 0.42, 0.0],
		[pierLength * 0.16, -pierDepth * 0.44, 0.3],
		[pierLength * 0.36, pierDepth * 0.42, 0.0],
	];

	for (const [px, pz, riseAboveDeck] of pilingCoords) {
		const post = new THREE.Mesh(pilingGeo, timberMat);
		post.position.set(px, deckTopY + riseAboveDeck - 0.94, pz);
		post.castShadow = true;
		post.receiveShadow = true;
		group.add(post);

		if (riseAboveDeck > 0.1) {
			const cap = new THREE.Mesh(capGeo, plankMats[0]);
			cap.position.set(px, deckTopY + riseAboveDeck, pz);
			group.add(cap);
		}

		const collar = new THREE.Mesh(collarGeo, wetPilingMat);
		collar.position.set(px, 0.08, pz);
		group.add(collar);
	}

	const ropeGeo = new THREE.TorusGeometry(0.132, 0.023, 12, 28);
	const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.028, 10);
	geometries.push(ropeGeo, boltGeo);

	const ropeMat = new THREE.MeshStandardMaterial({
		color: 0x4b5759,
		roughness: 0.94,
		metalness: 0.0,
	});
	materials.push(ropeMat);

	for (let r = 0; r < 3; r++) {
		const loop = new THREE.Mesh(ropeGeo, ropeMat);
		loop.rotation.x = Math.PI / 2 + (r - 1) * 0.06;
		loop.position.set(pierLength * 0.16, deckTopY + 0.12 + r * 0.043, -pierDepth * 0.44);
		group.add(loop);
	}

	for (let b = 0; b < 5; b++) {
		const bx = -pierLength * 0.38 + b * 1.02;
		for (const bz of [-pierDepth * 0.38, pierDepth * 0.38]) {
			const bolt = new THREE.Mesh(boltGeo, ironMat);
			bolt.position.set(bx, deckTopY + 0.012, bz);
			group.add(bolt);
		}
	}

	const shadowTex = createRadialShadowTexture(256);
	textures.push(shadowTex);
	const girlShadowMat = new THREE.MeshBasicMaterial({
		map: shadowTex,
		transparent: true,
		opacity: 0.68,
		depthWrite: false,
	});
	materials.push(girlShadowMat);
	const girlShadowGeo = new THREE.CircleGeometry(0.68, 28);
	geometries.push(girlShadowGeo);
	const girlShadow = new THREE.Mesh(girlShadowGeo, girlShadowMat);
	girlShadow.rotation.x = -Math.PI / 2;
	girlShadow.position.set(-2.36, deckTopY + 0.018, 0.32);
	group.add(girlShadow);

	group.position.set(4.32, 0, 1.25);
	group.rotation.y = 0.0;

	return {
		group,
		deckTopY,
		applyPbrTextures: (albedo, normalMap, roughnessMap) => {
			plankMats.forEach((mat, idx) => {
				mat.map = albedo;
				mat.bumpMap = null;
				mat.normalMap = normalMap;
				mat.normalScale.set(0.85, 0.85);
				mat.roughnessMap = roughnessMap;
				mat.roughness = 0.92 - idx * 0.04;
				mat.color.setHex(plankTintVariants[idx]);
				mat.needsUpdate = true;
			});
			timberMat.normalMap = normalMap;
			timberMat.normalScale.set(0.65, 0.65);
			timberMat.needsUpdate = true;
		},
		dispose: () => {
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			textures.forEach((t) => t.dispose());
		},
	};
}

/**
 * 构建 10 组件和风铜玻璃提灯（含 HDR 自发光火苗、光晕 Sprite、PointLight 与点击代理盒）。
 */
export function buildLakesideLantern(
	worldPos: THREE.Vector3,
	isSoftwareGl: boolean,
): LanternRig {
	const group = new THREE.Group();
	const geometries: THREE.BufferGeometry[] = [];
	const materials: THREE.Material[] = [];
	const textures: THREE.Texture[] = [];

	const bronzeMat = new THREE.MeshStandardMaterial({
		color: 0x2a323a,
		roughness: 0.4,
		metalness: 0.8,
		envMapIntensity: 1.1,
	});
	const brassMat = new THREE.MeshStandardMaterial({
		color: 0x8f7448,
		roughness: 0.25,
		metalness: 0.88,
		envMapIntensity: 1.2,
	});
	const glassMat = new THREE.MeshPhysicalMaterial({
		color: 0xfff0c4,
		emissive: 0xf7c552,
		emissiveIntensity: 1.35,
		roughness: 0.2,
		metalness: 0.0,
		transmission: isSoftwareGl ? 0 : 0.55,
		transparent: true,
		opacity: isSoftwareGl ? 0.68 : 0.86,
		depthWrite: false,
	});
	const flameMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(2.4, 1.95, 1.05),
		toneMapped: false,
	});
	materials.push(bronzeMat, brassMat, glassMat, flameMat);

	const baseProfile = [
		new THREE.Vector2(0.0, 0.0),
		new THREE.Vector2(0.145, 0.0),
		new THREE.Vector2(0.145, 0.028),
		new THREE.Vector2(0.125, 0.045),
		new THREE.Vector2(0.11, 0.08),
		new THREE.Vector2(0.12, 0.095),
		new THREE.Vector2(0.0, 0.095),
	];
	const baseGeo = new THREE.LatheGeometry(baseProfile, 8);
	geometries.push(baseGeo);
	const baseMesh = new THREE.Mesh(baseGeo, bronzeMat);
	baseMesh.castShadow = true;
	group.add(baseMesh);

	const cupGeo = new THREE.CylinderGeometry(0.042, 0.052, 0.045, 12);
	geometries.push(cupGeo);
	const cupMesh = new THREE.Mesh(cupGeo, brassMat);
	cupMesh.position.y = 0.115;
	group.add(cupMesh);

	const flameGeo = new THREE.SphereGeometry(0.036, 14, 12);
	geometries.push(flameGeo);
	const flameCore = new THREE.Mesh(flameGeo, flameMat);
	flameCore.scale.set(0.85, 1.45, 0.85);
	flameCore.position.y = 0.185;
	group.add(flameCore);

	const glassGeo = new THREE.CylinderGeometry(0.088, 0.096, 0.23, 16, 1, true);
	geometries.push(glassGeo);
	const glassMesh = new THREE.Mesh(glassGeo, glassMat);
	glassMesh.position.y = 0.21;
	glassMesh.renderOrder = 3;
	group.add(glassMesh);

	const strutGeo = new THREE.CylinderGeometry(0.0085, 0.0095, 0.245, 8);
	geometries.push(strutGeo);
	for (let i = 0; i < 4; i++) {
		const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
		const strut = new THREE.Mesh(strutGeo, bronzeMat);
		strut.position.set(Math.cos(a) * 0.105, 0.215, Math.sin(a) * 0.105);
		group.add(strut);
	}

	const roofProfile = [
		new THREE.Vector2(0.155, 0.325),
		new THREE.Vector2(0.135, 0.345),
		new THREE.Vector2(0.095, 0.39),
		new THREE.Vector2(0.068, 0.43),
		new THREE.Vector2(0.075, 0.445),
		new THREE.Vector2(0.038, 0.48),
		new THREE.Vector2(0.0, 0.49),
	];
	const roofGeo = new THREE.LatheGeometry(roofProfile, 8);
	geometries.push(roofGeo);
	const roofMesh = new THREE.Mesh(roofGeo, bronzeMat);
	roofMesh.castShadow = true;
	group.add(roofMesh);

	const finialGeo = new THREE.TorusGeometry(0.022, 0.0055, 8, 16);
	geometries.push(finialGeo);
	const finial = new THREE.Mesh(finialGeo, brassMat);
	finial.position.y = 0.505;
	group.add(finial);

	const handleCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-0.11, 0.335, 0),
		new THREE.Vector3(-0.14, 0.46, 0),
		new THREE.Vector3(0, 0.56, 0),
		new THREE.Vector3(0.14, 0.46, 0),
		new THREE.Vector3(0.11, 0.335, 0),
	]);
	const handleGeo = new THREE.TubeGeometry(handleCurve, 24, 0.0065, 8, false);
	geometries.push(handleGeo);
	const handle = new THREE.Mesh(handleGeo, brassMat);
	group.add(handle);

	const shadowTex = createRadialShadowTexture(256);
	textures.push(shadowTex);
	const shadowMat = new THREE.MeshBasicMaterial({
		map: shadowTex,
		transparent: true,
		opacity: 0.65,
		depthWrite: false,
	});
	materials.push(shadowMat);
	const shadowGeo = new THREE.CircleGeometry(0.24, 24);
	geometries.push(shadowGeo);
	const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
	shadowDisc.rotation.x = -Math.PI / 2;
	shadowDisc.position.y = 0.018;
	group.add(shadowDisc);

	const haloTex = createLanternGlowTexture(512);
	textures.push(haloTex);
	const haloMat = new THREE.SpriteMaterial({
		map: haloTex,
		color: 0xf4c668,
		transparent: true,
		opacity: 0.24,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	materials.push(haloMat);
	const haloSprite = new THREE.Sprite(haloMat);
	haloSprite.position.y = 0.21;
	haloSprite.scale.set(1.38, 1.38, 1);
	haloSprite.renderOrder = 4;
	group.add(haloSprite);

	const pointLight = new THREE.PointLight(0xffb84d, 3.6, 10.5, 1.65);
	pointLight.position.set(0, 0.32, 0.16);
	group.add(pointLight);

	const hitGeo = new THREE.BoxGeometry(0.56, 0.78, 0.56);
	const hitMat = new THREE.MeshBasicMaterial({ visible: false });
	geometries.push(hitGeo);
	materials.push(hitMat);
	const hitProxy = new THREE.Mesh(hitGeo, hitMat);
	hitProxy.position.set(0, 0.32, 0);
	hitProxy.userData = { interactable: "lantern" };
	group.add(hitProxy);

	group.position.copy(worldPos);
	group.scale.setScalar(1.12);

	return {
		group,
		hitProxy,
		pointLight,
		flameCore,
		haloSprite,
		worldPosition: worldPos.clone(),
		update: (time, intensity, hoverBoost) => {
			const flicker = 1.0 + Math.sin(time * 5.3) * 0.042 + Math.sin(time * 9.7 + 1.3) * 0.022;
			const total = (intensity + hoverBoost * 0.45) * flicker;
			pointLight.intensity = total * 1.55;
			glassMat.emissiveIntensity = 0.85 + total * 0.42;
			const coreBoost = 1.6 + total * 0.42;
			flameMat.color.setRGB(coreBoost * 1.15, coreBoost * 0.92, coreBoost * 0.48);
			const haloScale = 1.12 + total * 0.22;
			haloSprite.scale.set(haloScale, haloScale, 1);
			haloMat.opacity = Math.min(0.46, 0.14 + total * 0.075);
			flameCore.scale.set(
				0.82 + Math.sin(time * 7.1) * 0.05,
				1.38 + Math.sin(time * 5.9 + 0.5) * 0.12 + total * 0.07,
				0.82,
			);
		},
		dispose: () => {
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			textures.forEach((t) => t.dispose());
		},
	};
}

/**
 * 构建前景植物框景：76 株 InstancedMesh 弯曲芦苇、14 株微摆夜花与左上垂枝。
 */
export function buildForegroundFoliage(): FoliageRig {
	const group = new THREE.Group();
	const geometries: THREE.BufferGeometry[] = [];
	const materials: THREE.Material[] = [];
	const textures: THREE.Texture[] = [];

	const createBladeGeometry = (width: number, height: number, curve: number) => {
		const geo = new THREE.PlaneGeometry(width, height, 2, 10);
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const y = Math.max(0, pos.getY(i) + height / 2);
			const t = Math.max(0, Math.min(1, y / height));
			const taper = Math.sin((1.0 - Math.pow(t, 1.35)) * Math.PI * 0.5) * (1.0 - t * 0.12);
			const x = pos.getX(i) * taper;
			const arch = Math.pow(t, 2.15) * curve;
			const cupZ = -Math.abs(pos.getX(i)) * 0.18;
			pos.setXYZ(i, x + arch * 0.58, y, arch + cupZ);
		}
		geo.computeVertexNormals();
		geo.computeBoundingSphere();
		return geo;
	};

	const bladeGeo = createBladeGeometry(0.115, 1.42, 0.42);
	geometries.push(bladeGeo);

	const grassUniforms = {
		uTime: { value: 0 },
		uWind: { value: 1.0 },
		uDuskBlend: { value: 0.0 },
		uLanternPos: { value: new THREE.Vector3(3.08, 0.82, 1.5) },
		uLanternIntensity: { value: 2.2 },
	};
	const grassMat = new THREE.ShaderMaterial({
		uniforms: grassUniforms,
		side: THREE.DoubleSide,
		vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWind;

      varying float vHeight;
      varying float vEdge;
      varying vec3 vInstanceCol;
      varying vec3 vWorldPos;

      void main() {
        vHeight = clamp(position.y / 1.45, 0.0, 1.0);
        vEdge = abs(uv.x * 2.0 - 1.0);
        #ifdef USE_INSTANCING_COLOR
          vInstanceCol = instanceColor;
        #else
          vInstanceCol = vec3(0.02, 0.08, 0.10);
        #endif

        vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec3 pos = position;

        float phase = worldBase.x * 0.72 + worldBase.z * 0.55;
        float gust = 0.7 + 0.3 * sin(uTime * 0.45 + worldBase.x * 0.25);
        float sway = (sin(uTime * 1.05 + phase) * 0.15 + sin(uTime * 2.05 + phase * 1.6) * 0.045) * gust * uWind;
        pos.x += sway * vHeight * vHeight;
        pos.z += sway * 0.32 * vHeight * vHeight;

        vec4 wp = modelMatrix * instanceMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uDuskBlend;
      uniform vec3 uLanternPos;
      uniform float uLanternIntensity;

      varying float vHeight;
      varying float vEdge;
      varying vec3 vInstanceCol;
      varying vec3 vWorldPos;

      void main() {
        vec3 baseCol = vInstanceCol * mix(0.28, 0.95, smoothstep(0.12, 0.95, vHeight));
        vec3 rimTint = mix(vec3(0.18, 0.34, 0.46), vec3(0.55, 0.30, 0.18), uDuskBlend);
        float rimMask = smoothstep(0.45, 0.95, vEdge) * smoothstep(0.25, 0.95, vHeight);
        vec3 col = baseCol + rimTint * rimMask * 0.32;

        float lDist = length(vWorldPos - uLanternPos);
        float sss = exp(-lDist * 0.32) * smoothstep(0.2, 0.9, vHeight) * uLanternIntensity;
        col += vec3(0.45, 0.28, 0.08) * sss * 0.26;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
	});
	materials.push(grassMat);

	const bladeCount = 76;
	const blades = new THREE.InstancedMesh(bladeGeo, grassMat, bladeCount);
	blades.frustumCulled = false;

	const dummy = new THREE.Object3D();
	const color = new THREE.Color();
	const palette = [0x092026, 0x0e2c32, 0x13383d, 0x081c22, 0x174246];

	for (let i = 0; i < bladeCount; i++) {
		const isLeftCluster = i < 58;
		const seed = Math.sin(i * 12.9898) * 43758.5453;
		const rnd1 = seed - Math.floor(seed);
		const seed2 = Math.sin(i * 78.233 + 1.5) * 43758.5453;
		const rnd2 = seed2 - Math.floor(seed2);
		const seed3 = Math.sin(i * 39.425 + 4.1) * 43758.5453;
		const rnd3 = seed3 - Math.floor(seed3);

		let x: number;
		let z: number;
		let scaleY: number;

		if (isLeftCluster) {
			x = -5.8 + rnd1 * 4.25;
			z = 5.45 + rnd2 * 2.05;
			const edgeBoost = 1.0 - Math.max(0, (x + 2.8) / 2.2);
			scaleY = 0.58 + rnd3 * 0.64 + edgeBoost * 0.32;
		} else {
			x = 3.85 + rnd1 * 2.65;
			z = 5.75 + rnd2 * 1.85;
			scaleY = 0.44 + rnd3 * 0.46;
		}

		dummy.position.set(x, -0.34, z);
		dummy.rotation.set(
			(rnd2 - 0.5) * 0.24,
			(rnd1 - 0.5) * 1.6,
			(rnd3 - 0.5) * 0.36 + (isLeftCluster ? -0.18 : 0.16),
		);
		dummy.scale.set(0.76 + rnd1 * 0.42, scaleY, 1.0);
		dummy.updateMatrix();
		blades.setMatrixAt(i, dummy.matrix);

		color.setHex(palette[i % palette.length]);
		color.offsetHSL(0, (rnd2 - 0.5) * 0.04, (rnd3 - 0.5) * 0.025);
		blades.setColorAt(i, color);
	}
	blades.instanceMatrix.needsUpdate = true;
	if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
	group.add(blades);

	const flowerCount = 14;
	const stemGeo = new THREE.CylinderGeometry(0.0055, 0.0085, 0.78, 6);
	const blossomGeo = new THREE.SphereGeometry(0.024, 8, 6);
	geometries.push(stemGeo, blossomGeo);

	const stemMat = new THREE.MeshStandardMaterial({ color: 0x0d282d, roughness: 0.9 });
	const blossomMat = new THREE.MeshBasicMaterial({
		color: 0x5c89a6,
		transparent: true,
		opacity: 0.76,
	});
	materials.push(stemMat, blossomMat);

	const flowersGroup = new THREE.Group();
	const flowerEntries: { pivot: THREE.Group; phase: number }[] = [];

	for (let i = 0; i < flowerCount; i++) {
		const isLeft = i < 11;
		const t = (i % 11) / 11;
		const fx = isLeft ? -4.9 + t * 2.85 : 4.2 + (i - 11) * 0.58;
		const fz = 5.8 + Math.sin(i * 2.1) * 0.8;
		const h = 0.5 + (i % 4) * 0.13;

		const pivot = new THREE.Group();
		pivot.position.set(fx, -0.26, fz);

		const stem = new THREE.Mesh(stemGeo, stemMat);
		stem.scale.y = h;
		stem.position.y = h * 0.39;
		pivot.add(stem);

		for (let k = 0; k < 3; k++) {
			const petal = new THREE.Mesh(blossomGeo, blossomMat);
			const a = (k / 3) * Math.PI * 2;
			petal.scale.set(1.0, 0.72, 1.0);
			petal.position.set(
				Math.cos(a) * 0.022,
				h * 0.78 + (k === 0 ? 0.018 : 0),
				Math.sin(a) * 0.022,
			);
			pivot.add(petal);
		}

		flowersGroup.add(pivot);
		flowerEntries.push({ pivot, phase: i * 1.13 });
	}
	group.add(flowersGroup);

	const branchTex = createOverhangingBranchTexture(1024);
	textures.push(branchTex);
	const branchGeo = new THREE.PlaneGeometry(4.4, 3.8, 8, 8);
	geometries.push(branchGeo);
	const branchMat = new THREE.MeshBasicMaterial({
		map: branchTex,
		transparent: true,
		opacity: 0.84,
		depthWrite: false,
	});
	materials.push(branchMat);
	const branchMesh = new THREE.Mesh(branchGeo, branchMat);
	branchMesh.position.set(-4.35, 3.35, 5.2);
	branchMesh.renderOrder = 6;
	group.add(branchMesh);

	return {
		group,
		update: (time, windStrength, duskBlend, lanternIntensity, reducedMotion) => {
			const m = reducedMotion ? 0.15 : windStrength;
			grassUniforms.uTime.value = time;
			grassUniforms.uWind.value = m;
			grassUniforms.uDuskBlend.value = duskBlend;
			grassUniforms.uLanternIntensity.value = lanternIntensity;

			for (const f of flowerEntries) {
				f.pivot.rotation.z = Math.sin(time * 1.15 + f.phase) * 0.085 * m;
				f.pivot.rotation.x = Math.cos(time * 0.85 + f.phase) * 0.045 * m;
			}

			branchMesh.rotation.z = Math.sin(time * 0.62) * 0.024 * m;
			branchMesh.position.x = -4.35 + Math.sin(time * 0.46) * 0.04 * m;
		},
		dispose: () => {
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			textures.forEach((t) => t.dispose());
		},
	};
}
