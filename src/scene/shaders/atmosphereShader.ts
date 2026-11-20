import * as THREE from "three";

/**
 * 对角体积月光与晚霞光束 Shader。
 */
export function createLightShaftsMaterial(): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uIntensity: { value: 0.44 },
			uDuskBlend: { value: 0.0 },
			uMoonColor: { value: new THREE.Vector3(0.72, 0.88, 1.0) },
			uDuskColor: { value: new THREE.Vector3(1.0, 0.72, 0.42) },
		},
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uDuskBlend;
      uniform vec3 uMoonColor;
      uniform vec3 uDuskColor;

      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.53);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 source = mix(vec2(0.28, 0.96), vec2(0.42, 0.62), uDuskBlend * 0.75);
        vec2 delta = vUv - source;
        float dist = length(delta * vec2(1.4, 1.0));
        float angle = atan(delta.y, delta.x);

        float ray1 = noise(vec2(angle * 7.5 + uTime * 0.03, dist * 1.4 - uTime * 0.02));
        float ray2 = noise(vec2(angle * 15.0 - uTime * 0.04, dist * 2.2 + 3.1));
        float shafts = pow(clamp(ray1 * 0.65 + ray2 * 0.35, 0.0, 1.0), 2.4);

        float downMask = smoothstep(0.15, -0.35, delta.y);
        float coneMask = exp(-pow((vUv.x - mix(0.38, 0.48, 1.0 - vUv.y)) / 0.36, 2.0));
        float edgeFade = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x))
                       * smoothstep(0.02, 0.24, vUv.y) * (1.0 - smoothstep(0.86, 1.0, vUv.y));
        float radialFalloff = exp(-dist * 1.65);

        float alpha = shafts * downMask * coneMask * edgeFade * radialFalloff * uIntensity * 0.22;
        if (alpha < 0.002) discard;

        vec3 col = mix(uMoonColor, uDuskColor, uDuskBlend);
        gl_FragColor = vec4(col, alpha);
      }
    `,
	});
}

export function createVolumetricMistMaterial(): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uOpacity: { value: 0.36 },
			uMistColor: { value: new THREE.Vector3(0.55, 0.72, 0.84) },
			uLanternPos: { value: new THREE.Vector3(3.08, 0.82, 1.5) },
			uLanternIntensity: { value: 2.2 },
			uSeed: { value: 0.0 },
		},
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uMistColor;
      uniform vec3 uLanternPos;
      uniform float uLanternIntensity;
      uniform float uSeed;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 41.23);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.52;
        for (int i = 0; i < 4; i++) {
          v += a * vnoise(p);
          p = p * 2.06 + vec2(7.3, 11.1);
          a *= 0.48;
        }
        return v;
      }

      void main() {
        vec2 p = vec2(vUv.x * 3.4 + uSeed * 4.7 - uTime * 0.032, vUv.y * 1.9 + uTime * 0.012);
        float wisp = fbm(p);
        float detail = fbm(p * 1.85 + vec2(uTime * 0.025, -uTime * 0.014));
        float cloud = smoothstep(0.28, 0.76, wisp * 0.68 + detail * 0.32);

        float horizMask = smoothstep(0.0, 0.24, vUv.x) * (1.0 - smoothstep(0.76, 1.0, vUv.x));
        float vertMask = smoothstep(0.0, 0.28, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        float alpha = cloud * horizMask * vertMask * uOpacity * 0.56;
        if (alpha < 0.003) discard;

        float lDist = length(vWorldPos - uLanternPos);
        float lanternScatter = exp(-lDist * 0.28) * uLanternIntensity * 0.28;
        vec3 col = uMistColor + vec3(0.98, 0.76, 0.42) * lanternScatter;

        gl_FragColor = vec4(col, alpha);
      }
    `,
	});
}

export interface VolumetricMistRig {
	group: THREE.Group;
	update: (
		time: number,
		opacity: number,
		tint: THREE.Color,
		lanternIntensity: number,
		reducedMotion: boolean,
	) => void;
	dispose: () => void;
}

export function createVolumetricLakeMist(lanternPos: THREE.Vector3): VolumetricMistRig {
	const group = new THREE.Group();
	const planeGeo = new THREE.PlaneGeometry(24, 5.2);

	const layers: {
		mesh: THREE.Mesh;
		mat: THREE.ShaderMaterial;
		baseX: number;
		speed: number;
		weight: number;
	}[] = [];

	const specs = [
		{ x: -6.2, y: 1.35, z: -18.5, sx: 1.55, sy: 1.15, speed: 0.24, weight: 0.85, seed: 1.1 },
		{ x: 5.4, y: 1.48, z: -20.5, sx: 1.65, sy: 1.25, speed: -0.18, weight: 0.78, seed: 2.7 },
		{ x: -1.8, y: 0.82, z: -11.5, sx: 1.35, sy: 0.88, speed: 0.28, weight: 0.66, seed: 4.3 },
		{ x: 6.0, y: 0.92, z: -13.0, sx: 1.25, sy: 0.92, speed: -0.22, weight: 0.58, seed: 6.1 },
		{ x: -3.2, y: 0.52, z: -4.8, sx: 1.05, sy: 0.62, speed: 0.19, weight: 0.42, seed: 8.5 },
		{ x: 2.8, y: 0.58, z: -1.6, sx: 0.85, sy: 0.52, speed: -0.16, weight: 0.34, seed: 10.2 },
	];

	for (const s of specs) {
		const mat = createVolumetricMistMaterial();
		mat.uniforms.uSeed.value = s.seed;
		(mat.uniforms.uLanternPos.value as THREE.Vector3).copy(lanternPos);
		const mesh = new THREE.Mesh(planeGeo, mat);
		mesh.position.set(s.x, s.y, s.z);
		mesh.scale.set(s.sx, s.sy, 1);
		mesh.renderOrder = 2;
		group.add(mesh);
		layers.push({ mesh, mat, baseX: s.x, speed: s.speed, weight: s.weight });
	}

	return {
		group,
		update: (time, opacity, tint, lanternIntensity, reducedMotion) => {
			const m = reducedMotion ? 0.15 : 1.0;
			for (const l of layers) {
				l.mat.uniforms.uTime.value = time * m;
				l.mat.uniforms.uOpacity.value = opacity * l.weight;
				(l.mat.uniforms.uMistColor.value as THREE.Vector3).set(tint.r, tint.g, tint.b);
				l.mat.uniforms.uLanternIntensity.value = lanternIntensity;
				l.mesh.position.x =
					l.baseX + Math.sin(time * 0.11 * Math.abs(l.speed) + l.weight * 6.0) * 2.1 * m;
			}
		},
		dispose: () => {
			planeGeo.dispose();
			for (const l of layers) {
				l.mat.dispose();
			}
		},
	};
}

export interface AtmosphereMotesRig {
	points: THREE.Points;
	setPixelRatio: (pixelRatio: number) => void;
	update: (time: number, lanternIntensity: number, duskBlend: number, reducedMotion: boolean) => void;
	dispose: () => void;
}

export function createAtmosphereMotesSystem(
	lanternPos: THREE.Vector3,
	count = 90,
): AtmosphereMotesRig {
	const positions = new Float32Array(count * 3);
	const seeds = new Float32Array(count * 3);

	const rand = (s: number) => {
		const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
		return x - Math.floor(x);
	};

	for (let i = 0; i < count; i++) {
		const nearLantern = i < count * 0.42;
		if (nearLantern) {
			positions[i * 3] = lanternPos.x + (rand(i * 1.7) - 0.58) * 3.8;
			positions[i * 3 + 1] = lanternPos.y + 0.15 + rand(i * 2.9) * 2.4;
			positions[i * 3 + 2] = lanternPos.z + (rand(i * 4.1) - 0.45) * 2.6;
		} else {
			positions[i * 3] = (rand(i * 3.3) - 0.5) * 14.0;
			positions[i * 3 + 1] = 0.4 + rand(i * 5.1) * 4.4;
			positions[i * 3 + 2] = -6.0 + rand(i * 7.7) * 11.5;
		}
		seeds[i * 3] = rand(i * 9.1) * Math.PI * 2;
		seeds[i * 3 + 1] = 0.55 + rand(i * 11.3) * 1.1;
		seeds[i * 3 + 2] = nearLantern ? 1.0 : 0.0;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));

	const initialPr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.0) : 1.0;

	const mat = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uPixelRatio: { value: initialPr },
			uLanternPos: { value: lanternPos.clone() },
			uLanternIntensity: { value: 2.2 },
			uDuskBlend: { value: 0.0 },
		},
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec3 uLanternPos;

      varying float vAlpha;
      varying float vWarmth;

      void main() {
        vec3 p = position;
        float t = uTime * 0.28 * aSeed.y + aSeed.x;
        p.x += sin(t * 1.1) * 0.28 + cos(t * 0.5) * 0.14;
        p.y += sin(t * 0.7 + aSeed.x) * 0.18;
        p.z += cos(t * 0.9) * 0.22;

        float lDist = length(p - uLanternPos);
        vWarmth = clamp(exp(-lDist * 0.52) + aSeed.z * 0.35, 0.0, 1.0);
        float twinkle = 0.38 + 0.62 * pow(sin(uTime * 0.85 * aSeed.y + aSeed.x * 3.0) * 0.5 + 0.5, 2.0);
        vAlpha = twinkle * (0.14 + vWarmth * 0.26);

        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        float dist = max(1.5, -mvPos.z);
        gl_PointSize = clamp((aSeed.y * 28.0 * uPixelRatio) / dist, 1.5, 9.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uLanternIntensity;
      uniform float uDuskBlend;
      varying float vAlpha;
      varying float vWarmth;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
        if (d > 1.0) discard;
        float soft = pow(1.0 - d, 2.2);
        vec3 coolCol = mix(vec3(0.72, 0.86, 0.96), vec3(1.0, 0.82, 0.62), uDuskBlend * 0.75);
        vec3 warmCol = vec3(1.0, 0.88, 0.58);
        vec3 col = mix(coolCol, warmCol, vWarmth);
        float boost = mix(1.0, clamp(uLanternIntensity * 0.45, 0.6, 1.6), vWarmth);
        gl_FragColor = vec4(col, soft * vAlpha * boost);
      }
    `,
	});

	const points = new THREE.Points(geo, mat);
	points.frustumCulled = false;
	points.renderOrder = 7;

	return {
		points,
		setPixelRatio: (pixelRatio) => {
			mat.uniforms.uPixelRatio.value = Math.max(1, Math.min(pixelRatio, 2.5));
		},
		update: (time, lanternIntensity, duskBlend, reducedMotion) => {
			mat.uniforms.uTime.value = time * (reducedMotion ? 0.2 : 1.0);
			mat.uniforms.uLanternIntensity.value = lanternIntensity;
			mat.uniforms.uDuskBlend.value = duskBlend;
		},
		dispose: () => {
			geo.dispose();
			mat.dispose();
		},
	};
}
