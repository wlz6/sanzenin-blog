import * as THREE from "three";

export interface BackdropUniforms {
	[uniform: string]: THREE.IUniform<unknown>;
	uMap: THREE.IUniform<THREE.Texture | null>;
	uTime: THREE.IUniform<number>;
	uDuskBlend: THREE.IUniform<number>;
	uSkyTint: THREE.IUniform<THREE.Vector3>;
	uHorizonGlow: THREE.IUniform<THREE.Vector3>;
	uHorizonStrength: THREE.IUniform<number>;
	uMoonGlow: THREE.IUniform<number>;
	uStarVisibility: THREE.IUniform<number>;
	uMeteorIntensity: THREE.IUniform<number>;
	uEasterEggTime: THREE.IUniform<number>;
	uMistOpacity: THREE.IUniform<number>;
}

/**
 * 线性 HDR 远景幕布 Shader：负责天顶延展、黄昏晚霞转变、HDR 新月光晕、星点闪烁与流星雨。
 */
export function createBackdropMaterial(texture: THREE.Texture | null): THREE.ShaderMaterial {
	const uniforms: BackdropUniforms = {
		uMap: { value: texture },
		uTime: { value: 0 },
		uDuskBlend: { value: 0.0 },
		uSkyTint: { value: new THREE.Vector3(0.94, 0.99, 1.06) },
		uHorizonGlow: { value: new THREE.Vector3(0.36, 0.54, 0.68) },
		uHorizonStrength: { value: 0.26 },
		uMoonGlow: { value: 0.88 },
		uStarVisibility: { value: 0.6 },
		uMeteorIntensity: { value: 0.0 },
		uEasterEggTime: { value: 0.0 },
		uMistOpacity: { value: 0.4 },
	};

	return new THREE.ShaderMaterial({
		uniforms,
		depthWrite: false,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uDuskBlend;
      uniform vec3 uSkyTint;
      uniform vec3 uHorizonGlow;
      uniform float uHorizonStrength;
      uniform float uMoonGlow;
      uniform float uStarVisibility;
      uniform float uMeteorIntensity;
      uniform float uEasterEggTime;
      uniform float uMistOpacity;

      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float meteorStreak(vec2 uv, vec2 startPos, vec2 dir, float progress, float lengthVal) {
        if (progress <= 0.02 || progress >= 0.98) return 0.0;
        vec2 head = startPos + dir * progress;
        vec2 rel = uv - head;
        vec2 normDir = normalize(dir);
        float along = dot(rel, -normDir);
        float perp = abs(rel.x * normDir.y - rel.y * normDir.x);

        float tailMask = smoothstep(0.0, 0.005, along) * (1.0 - smoothstep(0.005, lengthVal, along));
        float core = exp(-perp * 380.0) * tailMask * 1.85;
        float glow = exp(-perp * 95.0) * tailMask * 0.52;
        float headSpark = exp(-length(rel * vec2(1.77, 1.0)) * 130.0) * 1.65;
        float fadeEnv = sin(progress * 3.14159265);
        return (core + glow + headSpark) * fadeEnv;
      }

      void main() {
        float imgV = vUv.y / 0.78;
        vec2 sampleUv = vec2(vUv.x, clamp(imgV, 0.005, 0.992));

        float treeBand = smoothstep(0.24, 0.34, sampleUv.y) * (1.0 - smoothstep(0.56, 0.68, sampleUv.y));
        sampleUv.x += sin(sampleUv.y * 26.0 + uTime * 0.62) * 0.00048 * treeBand;

        vec3 baseCol = texture2D(uMap, sampleUv).rgb;

        if (imgV > 0.94) {
          float extT = smoothstep(0.94, 1.24, imgV);
          vec3 zenithNight = vec3(0.004, 0.011, 0.032);
          baseCol = mix(baseCol, zenithNight, extT);
        }

        float skyMask = smoothstep(0.36, 0.66, imgV);
        float lum = dot(baseCol, vec3(0.2126, 0.7152, 0.0722));
        float openSky = smoothstep(0.03, 0.14, lum) * skyMask;
        float horizonBand = exp(-pow((imgV - 0.43) / 0.18, 2.0));

        vec3 linTint = pow(max(uSkyTint, vec3(0.01)), vec3(1.9));
        vec3 nightCol = baseCol * mix(vec3(0.58, 0.68, 0.82) * linTint, linTint * 0.82, skyMask);

        if (uDuskBlend > 0.005) {
          vec3 duskZenith = vec3(0.018, 0.022, 0.078);
          vec3 duskMid = vec3(0.26, 0.082, 0.105);
          vec3 duskHorizon = vec3(1.08, 0.32, 0.062);
          vec3 duskSunCore = vec3(1.55, 0.62, 0.16);

          vec3 duskSkyGrad = mix(duskHorizon, duskMid, smoothstep(0.34, 0.64, imgV));
          duskSkyGrad = mix(duskSkyGrad, duskZenith, smoothstep(0.64, 1.04, imgV));

          float sunPocket = exp(-pow((vUv.x - 0.45) / 0.35, 2.0)) * exp(-pow((imgV - 0.40) / 0.15, 2.0));
          duskSkyGrad += duskSunCore * sunPocket * 0.58;

          vec3 duskForest = baseCol * vec3(0.46, 0.25, 0.22) + vec3(0.045, 0.016, 0.008) * horizonBand;
          vec3 duskCloudedSky = mix(
            duskSkyGrad * (0.44 + sqrt(max(lum, 0.0)) * 1.12),
            duskSkyGrad + vec3(0.24, 0.08, 0.015) * sqrt(max(lum, 0.0)),
            0.54
          );
          vec3 duskResult = mix(
            duskForest,
            duskCloudedSky,
            clamp(openSky * 1.15 + smoothstep(0.56, 0.82, imgV) * 0.72, 0.0, 1.0)
          );
          float moonMask = exp(-length((vec2(vUv.x, imgV) - vec2(0.298, 0.825)) * vec2(1.7778, 1.0)) * 15.0);
          duskResult = mix(duskResult, duskResult * vec3(0.62, 0.54, 0.56), moonMask * 0.65);
          nightCol = mix(nightCol, duskResult, uDuskBlend);
        }

        vec3 col = nightCol;

        vec3 linHorizon = pow(max(uHorizonGlow, vec3(0.0)), vec3(2.0));
        col += linHorizon * horizonBand * uHorizonStrength * (0.24 * (1.0 - uDuskBlend * 0.55));

        vec2 moonPos = vec2(0.298, 0.825);
        vec2 aspectCorr = vec2(1.7778, 1.0);
        float moonDist = length((vec2(vUv.x, imgV) - moonPos) * aspectCorr);
        float moonCorona = exp(-moonDist * 4.2) * 0.09 + exp(-moonDist * 14.0) * 0.20;
        float moonCoreBoost = exp(-moonDist * 28.0) * smoothstep(0.22, 0.62, lum) * 0.88;
        float moonBreath = 0.95 + 0.05 * sin(uTime * 0.55);
        col += vec3(0.56, 0.78, 1.05) * (moonCorona + moonCoreBoost) * uMoonGlow * moonBreath;

        vec2 starGrid = vec2(vUv.x * 136.0, imgV * 76.0);
        vec2 cell = floor(starGrid);
        vec2 f = fract(starGrid) - 0.5;
        float rnd = hash21(cell);
        if (rnd > 0.956 && imgV > 0.53) {
          vec2 starOffset = (vec2(hash21(cell + 1.3), hash21(cell + 7.9)) - 0.5) * 0.62;
          float d = length(f - starOffset);
          float twinkle = 0.52 + 0.48 * sin(uTime * (1.1 + rnd * 2.6) + rnd * 40.0);
          float star = exp(-d * 18.0) * smoothstep(0.53, 0.72, imgV) * twinkle;
          star *= smoothstep(0.055, 0.12, moonDist);
          vec3 starTint = mix(vec3(0.75, 0.88, 1.05), vec3(1.05, 0.94, 0.80), hash21(cell + 19.3) * 0.35);
          col += starTint * star * uStarVisibility * 0.85;
        }

        float shoreMist = exp(-pow((imgV - 0.295) / 0.08, 2.0));
        float mistWave = 0.5 + 0.5 * sin(vUv.x * 6.5 + uTime * 0.12);
        vec3 mistBase = mix(vec3(0.08, 0.16, 0.24) * linTint, vec3(0.44, 0.18, 0.08), uDuskBlend * 0.78);
        col = mix(col, mistBase, shoreMist * uMistOpacity * (0.24 + 0.14 * mistWave));

        if (uMeteorIntensity > 0.005) {
          vec2 skyUv = vec2(vUv.x, imgV);
          float meteors = 0.0;
          float mt = uEasterEggTime;
          meteors += meteorStreak(skyUv, vec2(0.14, 0.92), vec2(0.36, -0.22), fract(mt * 0.34 + 0.08), 0.16);
          meteors += meteorStreak(skyUv, vec2(0.36, 0.95), vec2(0.38, -0.24), fract(mt * 0.29 + 0.42), 0.18);
          meteors += meteorStreak(skyUv, vec2(0.56, 0.93), vec2(0.32, -0.21), fract(mt * 0.39 + 0.71), 0.15);
          meteors += meteorStreak(skyUv, vec2(0.24, 0.86), vec2(0.34, -0.20), fract(mt * 0.26 + 0.24), 0.14);
          meteors += meteorStreak(skyUv, vec2(0.48, 0.96), vec2(0.36, -0.22), fract(mt * 0.35 + 0.58), 0.17);
          meteors += meteorStreak(skyUv, vec2(0.68, 0.90), vec2(0.28, -0.19), fract(mt * 0.43 + 0.86), 0.13);
          meteors *= smoothstep(0.44, 0.62, imgV);
          col += vec3(1.45, 1.32, 0.96) * meteors * uMeteorIntensity;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
	});
}

/**
 * 中景左右松林岸翼 Shader（按亮度阈值分离松林剪影并叠加空气透视薄雾）。
 */
export function createShoreWingsMaterial(texture: THREE.Texture | null): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uMap: { value: texture },
			uTime: { value: 0 },
			uTint: { value: new THREE.Vector3(0.85, 0.94, 1.0) },
			uDuskBlend: { value: 0.0 },
			uMistOpacity: { value: 0.4 },
		},
		transparent: true,
		depthWrite: false,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform vec3 uTint;
      uniform float uDuskBlend;
      uniform float uMistOpacity;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        uv.x += sin(uv.y * 15.0 + uTime * 0.65) * 0.0011 * smoothstep(0.15, 0.85, uv.y);
        vec3 col = texture2D(uMap, uv).rgb;

        float leftWing = 1.0 - smoothstep(0.11, 0.24, vUv.x);
        float rightWing = smoothstep(0.79, 0.93, vUv.x);
        float wingMask = max(leftWing, rightWing);

        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float foliageMask = 1.0 - smoothstep(0.06, 0.16, lum);

        float bottomFade = smoothstep(0.05, 0.22, vUv.y);
        float alpha = wingMask * foliageMask * bottomFade * 0.92;
        if (alpha < 0.01) discard;

        vec3 linTint = pow(max(uTint, vec3(0.01)), vec3(1.65));
        vec3 graded = mix(col * linTint * 0.72, col * vec3(0.46, 0.28, 0.28), uDuskBlend);

        float mistVeil = (1.0 - smoothstep(0.08, 0.42, vUv.y)) * uMistOpacity * 0.42;
        vec3 mistCol = mix(vec3(0.10, 0.20, 0.30), vec3(0.42, 0.22, 0.15), uDuskBlend);
        graded = mix(graded, mistCol, mistVeil);

        gl_FragColor = vec4(graded, alpha);
      }
    `,
	});
}
