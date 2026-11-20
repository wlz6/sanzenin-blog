import * as THREE from "three";
import { MAX_RIPPLES } from "../simulationLogic.ts";

export interface WaterUniforms {
	[uniform: string]: THREE.IUniform<unknown>;
	uBackdropMap: THREE.IUniform<THREE.Texture | null>;
	uReflectionMap: THREE.IUniform<THREE.Texture | null>;
	uHasReflection: THREE.IUniform<number>;
	uTextureMatrix: THREE.IUniform<THREE.Matrix4>;
	uTime: THREE.IUniform<number>;
	uDuskBlend: THREE.IUniform<number>;
	uWaterBase: THREE.IUniform<THREE.Vector3>;
	uSkyTint: THREE.IUniform<THREE.Vector3>;
	uHorizonGlow: THREE.IUniform<THREE.Vector3>;
	uHorizonStrength: THREE.IUniform<number>;
	uReflectionStrength: THREE.IUniform<number>;
	uMoonShimmer: THREE.IUniform<number>;
	uLanternPos: THREE.IUniform<THREE.Vector3>;
	uLanternIntensity: THREE.IUniform<number>;
	uGirlPos: THREE.IUniform<THREE.Vector3>;
	uPalmGlow: THREE.IUniform<number>;
	uRibbonGlow: THREE.IUniform<number>;
	uRipples: THREE.IUniform<THREE.Vector4[]>;
}

/**
 * 实时平面反射湖水 Shader：结合 5 层各向异性 FBM 波纹、12 槽位物理径向涟漪、
 * Schlick Fresnel、木桩驻波环、月光与提灯 Blinn-Phong 高光及远岸羽化。
 */
export function createWaterMaterial(backdropTex: THREE.Texture | null): THREE.ShaderMaterial {
	const rippleSlots: THREE.Vector4[] = [];
	for (let i = 0; i < MAX_RIPPLES; i++) {
		rippleSlots.push(new THREE.Vector4(0, 0, -100, 0));
	}

	const uniforms: WaterUniforms = {
		uBackdropMap: { value: backdropTex },
		uReflectionMap: { value: null },
		uHasReflection: { value: 0.0 },
		uTextureMatrix: { value: new THREE.Matrix4() },
		uTime: { value: 0 },
		uDuskBlend: { value: 0.0 },
		uWaterBase: { value: new THREE.Vector3(0.055, 0.135, 0.215) },
		uSkyTint: { value: new THREE.Vector3(0.94, 0.99, 1.06) },
		uHorizonGlow: { value: new THREE.Vector3(0.36, 0.54, 0.68) },
		uHorizonStrength: { value: 0.26 },
		uReflectionStrength: { value: 0.9 },
		uMoonShimmer: { value: 0.72 },
		uLanternPos: { value: new THREE.Vector3(3.08, 0.82, 1.5) },
		uLanternIntensity: { value: 2.25 },
		uGirlPos: { value: new THREE.Vector3(1.84, 1.2, 2.05) },
		uPalmGlow: { value: 0.0 },
		uRibbonGlow: { value: 0.0 },
		uRipples: { value: rippleSlots },
	};

	return new THREE.ShaderMaterial({
		uniforms,
		transparent: true,
		depthWrite: true,
		vertexShader: /* glsl */ `
      uniform mat4 uTextureMatrix;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec4 vReflCoord;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vReflCoord = uTextureMatrix * worldPos;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
		fragmentShader: /* glsl */ `
      #define MAX_RIPPLES ${MAX_RIPPLES}

      uniform sampler2D uBackdropMap;
      uniform sampler2D uReflectionMap;
      uniform float uHasReflection;
      uniform float uTime;
      uniform float uDuskBlend;
      uniform vec3 uWaterBase;
      uniform vec3 uSkyTint;
      uniform vec3 uHorizonGlow;
      uniform float uHorizonStrength;
      uniform float uReflectionStrength;
      uniform float uMoonShimmer;
      uniform vec3 uLanternPos;
      uniform float uLanternIntensity;
      uniform vec3 uGirlPos;
      uniform float uPalmGlow;
      uniform float uRibbonGlow;
      uniform vec4 uRipples[MAX_RIPPLES];

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec4 vReflCoord;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float lakeHeight(vec2 xz, float t) {
        float h = 0.0;
        h += sin(xz.x * 0.42 + xz.y * 1.12 - t * 0.52) * 0.24;
        h += sin(-xz.x * 0.28 + xz.y * 1.85 - t * 0.68 + 1.4) * 0.14;
        h += (vnoise(vec2(xz.x * 0.36 + t * 0.08, xz.y * 1.2 - t * 0.11)) - 0.5) * 0.46;
        vec2 r2 = vec2(xz.x * 0.88 + xz.y * 0.44, -xz.x * 0.24 + xz.y * 2.35);
        h += (vnoise(r2 + vec2(-t * 0.14, t * 0.19)) - 0.5) * 0.28;
        h += (vnoise(vec2(xz.x * 1.72 - t * 0.21, xz.y * 4.9 + t * 0.27)) - 0.5) * 0.15;
        h += (vnoise(vec2(xz.x * 3.6 + t * 0.31, xz.y * 9.8 - t * 0.36)) - 0.5) * 0.08;
        h += (vnoise(vec2(xz.x * 7.2 - t * 0.42, xz.y * 18.2 + t * 0.46)) - 0.5) * 0.036;
        return h;
      }

      vec3 calcLakeNormal(vec2 xz, float t, float ampScale) {
        float eps = 0.032;
        float hC = lakeHeight(xz, t);
        float hX = lakeHeight(xz + vec2(eps, 0.0), t);
        float hZ = lakeHeight(xz + vec2(0.0, eps), t);
        vec2 grad = vec2(hX - hC, hZ - hC) / eps;
        return normalize(vec3(-grad.x * ampScale, 1.0, -grad.y * ampScale));
      }

      void main() {
        vec2 xz = vWorldPos.xz;
        float distFactor = clamp((vWorldPos.z + 28.0) / 36.0, 0.0, 1.0);
        vec3 V = normalize(cameraPosition - vWorldPos);

        float waveAmp = mix(0.016, 0.056, pow(distFactor, 0.78));
        vec3 N = calcLakeNormal(xz, uTime, waveAmp);

        vec2 rippleNormalXZ = vec2(0.0);
        float rippleEnergy = 0.0;
        for (int i = 0; i < MAX_RIPPLES; i++) {
          vec4 rp = uRipples[i];
          float age = uTime - rp.z;
          if (age > 0.0 && age < 4.6 && rp.w > 0.001) {
            vec2 delta = xz - rp.xy;
            float dist = length(delta);
            float radius = age * 2.02;
            float ringDist = dist - radius;
            float bandWidth = 0.25 + age * 0.13;
            float env = exp(-(ringDist * ringDist) / (bandWidth * bandWidth));
            float decay = (1.0 - smoothstep(0.32, 4.55, age)) * rp.w;

            float phase = ringDist * 13.8 - age * 4.4;
            float dWave = cos(phase) * env * decay;
            vec2 radialDir = delta / max(dist, 0.001);

            rippleNormalXZ += radialDir * dWave * 0.25;
            rippleEnergy += abs(dWave);
          }
        }

        float pilingRing = 0.0;
        vec2 pilingPos[4];
        pilingPos[0] = vec2(2.05, 1.89);
        pilingPos[1] = vec2(2.05, 0.61);
        pilingPos[2] = vec2(4.10, 1.89);
        pilingPos[3] = vec2(6.26, 1.89);
        for (int p = 0; p < 4; p++) {
          vec2 pd = xz - pilingPos[p];
          float pl = length(pd);
          if (pl < 0.9) {
            float pr = sin(pl * 27.0 - uTime * 2.0) * exp(-pl * 4.6);
            rippleNormalXZ += (pd / max(pl, 0.001)) * pr * 0.062;
            pilingRing += exp(-pow((pl - 0.145) / 0.042, 2.0)) * 0.24;
          }
        }

        N = normalize(vec3(N.x - rippleNormalXZ.x, N.y, N.z - rippleNormalXZ.y));

        float NdotV = max(dot(N, V), 0.0);
        float schlick = 0.05 + 0.95 * pow(1.0 - NdotV, 3.8);
        float fresnel = clamp(mix(0.34, 0.95, schlick), 0.0, 1.0);

        vec3 reflCol = vec3(0.0);
        if (uHasReflection > 0.5 && vReflCoord.w > 0.001) {
          vec2 projUv = vReflCoord.xy / vReflCoord.w;
          float distortScale = mix(0.032, 0.088, distFactor);
          vec2 wavePerturb = vec2(N.x * distortScale * 1.15, N.z * distortScale * 1.75);
          vec2 rUv = clamp(projUv + wavePerturb, vec2(0.004), vec2(0.996));

          vec2 blurStep = vec2(0.0016 + abs(N.x) * 0.006, 0.0010);
          vec3 rC = texture2D(uReflectionMap, rUv).rgb;
          vec3 rL = texture2D(uReflectionMap, clamp(rUv - blurStep, vec2(0.004), vec2(0.996))).rgb;
          vec3 rR = texture2D(uReflectionMap, clamp(rUv + blurStep, vec2(0.004), vec2(0.996))).rgb;
          reflCol = rC * 0.52 + (rL + rR) * 0.24;

          reflCol *= mix(vec3(0.84, 0.91, 0.97), vec3(0.96, 0.88, 0.82), uDuskBlend * 0.75);
        } else {
          float uNorm = clamp((vWorldPos.x / 48.0) + 0.5, 0.015, 0.985);
          float mirrorY = mix(0.295, 0.90, pow(distFactor, 0.84));
          vec2 reflUv = clamp(vec2(uNorm + N.x * 0.26, mirrorY + N.z * 0.48), vec2(0.01, 0.28), vec2(0.99, 0.98));
          reflCol = texture2D(uBackdropMap, reflUv).rgb * uSkyTint;
        }

        float farGlow = exp(-pow(distFactor / 0.34, 2.0));
        reflCol += uHorizonGlow * farGlow * uHorizonStrength * 0.26;

        vec3 shallowTint = uWaterBase * 1.32 + vec3(0.015, 0.042, 0.048) * (1.0 - uDuskBlend * 0.6);
        vec3 abyssTint = uWaterBase * 0.58;
        vec3 deepWater = mix(shallowTint, abyssTint, smoothstep(0.18, 0.95, distFactor));
        float caustic = vnoise(xz * vec2(1.9, 3.2) + vec2(uTime * 0.18, -uTime * 0.12));
        deepWater += vec3(0.03, 0.07, 0.09) * pow(caustic, 3.0) * (1.0 - distFactor) * (1.0 - uDuskBlend * 0.5);

        vec3 col = mix(deepWater, reflCol * 0.92, fresnel * uReflectionStrength);

        vec3 moonLightPos = vec3(-5.2, 12.2, -28.0);
        vec3 L_moon = normalize(moonLightPos - vWorldPos);
        vec3 H_moon = normalize(L_moon + V);
        float NdotH_moon = max(dot(N, H_moon), 0.0);
        float moonSpecTight = pow(NdotH_moon, 260.0) * 1.85;
        float moonSpecBroad = pow(NdotH_moon, 32.0) * 0.22;
        float moonColMask = exp(-pow((vWorldPos.x + 5.2 + N.x * 14.0) / mix(2.2, 4.2, distFactor), 2.0));
        vec3 moonSpecTint = mix(vec3(0.84, 0.93, 1.0), vec3(1.0, 0.78, 0.46), uDuskBlend * 0.85);
        col += moonSpecTint * (moonSpecTight * 0.78 + moonSpecBroad) * (0.40 + 0.60 * moonColMask) * max(uMoonShimmer, uDuskBlend * 0.65);

        vec3 lanternLightPos = vec3(uLanternPos.x, uLanternPos.y + 0.36, uLanternPos.z);
        vec3 L_lantern = normalize(lanternLightPos - vWorldPos);
        vec3 H_lantern = normalize(L_lantern + V);
        float lanternDist = length(vWorldPos.xz - uLanternPos.xz);
        float lanternAtten = 1.0 / (1.0 + lanternDist * lanternDist * 0.13);
        float lanternSpec = pow(max(dot(N, H_lantern), 0.0), 84.0) * 1.25 + pow(max(dot(N, H_lantern), 0.0), 16.0) * 0.20;

        vec2 lanternDelta = vec2(vWorldPos.x - uLanternPos.x, vWorldPos.z - (uLanternPos.z + 1.05));
        float lanternColX = exp(-pow((lanternDelta.x + N.x * 11.0) / 0.58, 2.0));
        float lanternColZ = exp(-pow(max(0.0, lanternDelta.y) / 4.2, 2.0)) * smoothstep(-1.8, 0.42, lanternDelta.y);
        float lanternShimmer = 0.45 + 0.55 * vnoise(vec2(xz.x * 3.8, xz.y * 13.5 - uTime * 1.5));
        col += vec3(1.0, 0.80, 0.40) * (lanternSpec * lanternAtten * 0.62 + lanternColX * lanternColZ * lanternShimmer * 0.18) * uLanternIntensity;

        if (uPalmGlow > 0.01) {
          vec2 palmDelta = vec2(vWorldPos.x - (uGirlPos.x - 0.24), vWorldPos.z - (uGirlPos.z + 0.75));
          float palmSpot = exp(-dot(palmDelta * vec2(1.25, 0.65), palmDelta * vec2(1.25, 0.65)) * 1.1);
          col += vec3(1.0, 0.84, 0.46) * palmSpot * uPalmGlow * 0.28;
        }

        if (uRibbonGlow > 0.01) {
          float ribbonX = exp(-pow((vWorldPos.x + 1.4 + sin(vWorldPos.z * 0.4) * 1.2 + N.x * 7.5) / 5.2, 2.0));
          float ribbonZ = exp(-pow((vWorldPos.z + 7.5) / 5.4, 2.0));
          float ribbonSparkle = 0.45 + 0.55 * vnoise(vec2(xz.x * 3.0, xz.y * 9.0 - uTime * 1.6));
          col += vec3(1.0, 0.85, 0.48) * ribbonX * ribbonZ * ribbonSparkle * uRibbonGlow * 0.34;
        }

        float rippleSpec = pow(max(dot(N, H_moon), 0.0), 48.0) * 0.9 + pow(max(dot(N, H_lantern), 0.0), 40.0) * lanternAtten * 0.65;
        vec3 rippleLightCol = mix(vec3(0.78, 0.90, 0.99), vec3(1.0, 0.80, 0.48), uDuskBlend * 0.72);
        col += rippleLightCol * (rippleSpec + rippleEnergy * 0.12) * clamp(rippleEnergy * 2.1, 0.0, 1.0);

        vec2 starGrid = xz * vec2(1.4, 2.4) + N.xz * 1.8;
        vec2 starCell = floor(starGrid);
        vec2 starLocal = fract(starGrid) - 0.5;
        float starRnd = hash21(starCell);
        if (starRnd > 0.962 && distFactor > 0.14 && distFactor < 0.84) {
          vec2 jitter = (vec2(hash21(starCell + 3.1), hash21(starCell + 9.7)) - 0.5) * 0.55;
          float dStar = length(starLocal - jitter);
          float sparkDot = exp(-dStar * dStar * 85.0);
          float twinkle = pow(max(0.0, sin(uTime * (2.0 + starRnd * 3.2) + starRnd * 50.0)), 5.0);
          col += vec3(0.86, 0.94, 1.05) * sparkDot * twinkle * 0.55 * (1.0 - uDuskBlend * 0.85);
        }

        float pierBoxX = smoothstep(1.38, 1.82, vWorldPos.x) * (1.0 - smoothstep(6.85, 7.25, vWorldPos.x));
        float pierBoxZ = smoothstep(0.28, 0.68, vWorldPos.z) * (1.0 - smoothstep(1.88, 2.38, vWorldPos.z));
        float pierShadow = pierBoxX * pierBoxZ;
        col *= mix(1.0, 0.40, pierShadow);
        col += vec3(0.32, 0.48, 0.58) * pilingRing * (1.0 - uDuskBlend * 0.45);

        float horizonSeam = 1.0 - smoothstep(0.0, 0.14, distFactor);
        vec3 mistCol = mix(uWaterBase * 1.15, vec3(0.14, 0.24, 0.34) * uSkyTint, 0.58);
        mistCol = mix(mistCol, vec3(0.56, 0.24, 0.12), uDuskBlend * 0.78);
        col = mix(col, mistCol, horizonSeam * 0.64);

        float nearDepth = smoothstep(0.82, 1.0, distFactor);
        col *= mix(1.0, 0.78, nearDepth);

        float farAlphaFeather = smoothstep(0.0, 0.048, distFactor);
        gl_FragColor = vec4(col, farAlphaFeather);
      }
    `,
	});
}
