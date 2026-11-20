import * as THREE from "three";

export interface GirlUniforms {
	[uniform: string]: THREE.IUniform<unknown>;
	uMap: THREE.IUniform<THREE.Texture | null>;
	uTexelSize: THREE.IUniform<THREE.Vector2>;
	uTime: THREE.IUniform<number>;
	uDuskBlend: THREE.IUniform<number>;
	uGirlTint: THREE.IUniform<THREE.Vector3>;
	uLanternBoost: THREE.IUniform<number>;
	uArmLift: THREE.IUniform<number>;
	uPalmGlow: THREE.IUniform<number>;
	uGazePitch: THREE.IUniform<number>;
	uBlink: THREE.IUniform<number>;
	uHoverGlow: THREE.IUniform<number>;
	uNearbyFireflyUv: THREE.IUniform<THREE.Vector2>;
	uNearbyFireflyIntensity: THREE.IUniform<number>;
	uReducedMotion: THREE.IUniform<number>;
}

/**
 * 湖畔银发少女角色 Shader：48×64 高密顶点骨骼变形 + Alpha 梯度月光边缘光、提灯暖光包裹与掌心萤火光照。
 */
export function createGirlMaterial(texture: THREE.Texture | null): THREE.ShaderMaterial {
	const uniforms: GirlUniforms = {
		uMap: { value: texture },
		uTexelSize: { value: new THREE.Vector2(1 / 896, 1 / 1200) },
		uTime: { value: 0 },
		uDuskBlend: { value: 0.0 },
		uGirlTint: { value: new THREE.Vector3(0.93, 0.98, 1.04) },
		uLanternBoost: { value: 0.55 },
		uArmLift: { value: 0.0 },
		uPalmGlow: { value: 0.0 },
		uGazePitch: { value: 0.0 },
		uBlink: { value: 0.0 },
		uHoverGlow: { value: 0.0 },
		uNearbyFireflyUv: { value: new THREE.Vector2(0.32, 0.56) },
		uNearbyFireflyIntensity: { value: 0.0 },
		uReducedMotion: { value: 0.0 },
	};

	return new THREE.ShaderMaterial({
		uniforms,
		transparent: true,
		depthWrite: true,
		alphaTest: 0.05,
		side: THREE.DoubleSide,
		vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uArmLift;
      uniform float uGazePitch;
      uniform float uReducedMotion;

      varying vec2 vUv;

      vec2 rotateAround(vec2 p, vec2 pivot, float angle) {
        vec2 rel = p - pivot;
        float ca = cos(angle);
        float sa = sin(angle);
        return pivot + vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        float motionScale = 1.0 - uReducedMotion * 0.84;

        float gust = 0.62 + 0.38 * sin(uTime * 0.48 + 0.7) * cos(uTime * 0.23);

        // 1. 胸口与锁骨自然呼吸
        float breathPhase = sin(uTime * 1.38) * 0.5 + 0.5;
        float breathEase = breathPhase * breathPhase * (3.0 - 2.0 * breathPhase);
        float chestMask = smoothstep(0.42, 0.62, uv.y) * (1.0 - smoothstep(0.75, 0.84, uv.y))
                        * smoothstep(0.42, 0.54, uv.x) * (1.0 - smoothstep(0.68, 0.78, uv.x));
        pos.y += breathEase * 0.015 * chestMask * motionScale;
        pos.x -= breathEase * 0.005 * chestMask * motionScale;

        // 2. 三级风滞后银发飘动与颊侧发丝
        float hairBack = smoothstep(0.56, 0.68, uv.x) * smoothstep(0.36, 0.52, uv.y) * (1.0 - smoothstep(0.84, 0.94, uv.y));
        float hairLengthFactor = smoothstep(0.58, 0.90, uv.x);
        float hairLowerTip = smoothstep(0.78, 0.42, uv.y) * hairLengthFactor;

        float strandPhase = uTime * 1.65 - hairLengthFactor * 2.8 - uv.y * 5.2;
        float hairSwayX = (sin(strandPhase) * 0.026 + sin(strandPhase * 1.85 + 1.1) * 0.009) * gust;
        float hairSwayY = (cos(strandPhase * 0.85) * 0.018 + sin(strandPhase * 1.4) * 0.006) * gust;
        float hairWeight = hairBack * (0.28 + 0.72 * hairLengthFactor) + hairLowerTip * 0.55;
        pos.x += hairSwayX * hairWeight * motionScale;
        pos.y += hairSwayY * hairWeight * motionScale;

        float cheekLock = smoothstep(0.42, 0.49, uv.x) * (1.0 - smoothstep(0.54, 0.59, uv.x))
                        * smoothstep(0.56, 0.66, uv.y) * (1.0 - smoothstep(0.76, 0.82, uv.y));
        pos.x += sin(uTime * 1.85 + uv.y * 10.5) * 0.009 * gust * cheekLock * motionScale;

        // 3. 裙摆风纹与赤足轻摆
        float skirtHem = smoothstep(0.10, 0.22, uv.x) * (1.0 - smoothstep(0.44, 0.54, uv.x))
                       * smoothstep(0.13, 0.22, uv.y) * (1.0 - smoothstep(0.36, 0.46, uv.y));
        float skirtWave = sin(uTime * 1.45 + uv.x * 10.0 - uv.y * 6.5) * 0.020 * gust;
        pos.x += skirtWave * skirtHem * motionScale;
        pos.y += cos(uTime * 1.15 + uv.x * 8.0) * 0.009 * skirtHem * motionScale;

        float feetMask = smoothstep(0.08, 0.16, uv.x) * (1.0 - smoothstep(0.34, 0.42, uv.x))
                       * smoothstep(0.02, 0.07, uv.y) * (1.0 - smoothstep(0.15, 0.22, uv.y));
        pos.x += sin(uTime * 0.72 + 0.5) * 0.011 * feetMask * motionScale;

        // 4. 颈部枢轴抬头与低头
        vec2 neckPivot = vec2(0.545, 0.748);
        float headMask = smoothstep(0.735, 0.805, uv.y) * smoothstep(0.38, 0.46, uv.x) * (1.0 - smoothstep(0.68, 0.80, uv.x));
        float headAngle = uGazePitch * 0.088 * (1.0 - uReducedMotion * 0.45);
        vec2 headRot = rotateAround(uv, neckPivot, headAngle) - uv;
        pos.x += headRot.x * 1.85 * headMask;
        pos.y += headRot.y * 2.35 * headMask;

        // 5. 肘部枢轴旋转抬手承接萤火虫
        vec2 elbowPivot = vec2(0.515, 0.535);
        float armRegion = smoothstep(0.28, 0.34, uv.x) * (1.0 - smoothstep(0.49, 0.555, uv.x))
                        * smoothstep(0.455, 0.495, uv.y) * (1.0 - smoothstep(0.585, 0.635, uv.y));
        float liftAngle = -uArmLift * 0.34;
        vec2 armRot = rotateAround(uv, elbowPivot, liftAngle) - uv;
        float handHover = sin(uTime * 2.2) * 0.007 * uArmLift * motionScale;
        pos.x += armRot.x * 1.75 * armRegion;
        pos.y += (armRot.y * 2.35 + handHover) * armRegion;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uTexelSize;
      uniform float uTime;
      uniform float uDuskBlend;
      uniform vec3 uGirlTint;
      uniform float uLanternBoost;
      uniform float uArmLift;
      uniform float uPalmGlow;
      uniform float uBlink;
      uniform float uHoverGlow;
      uniform vec2 uNearbyFireflyUv;
      uniform float uNearbyFireflyIntensity;

      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.05) discard;

        vec3 col = tex.rgb;

        if (uBlink > 0.015) {
          vec2 eyeCenter = vec2(0.494, 0.829);
          vec2 eDelta = (vUv - eyeCenter) * vec2(1.0, 2.45);
          float eyeOval = 1.0 - smoothstep(0.008, 0.022, length(eDelta));
          float lidSweep = smoothstep(eyeCenter.y - 0.008 + (1.0 - uBlink) * 0.014, eyeCenter.y + 0.006, vUv.y);
          vec3 skinLidTone = vec3(0.52, 0.44, 0.44) * mix(vec3(0.86, 0.94, 1.04), vec3(1.06, 0.90, 0.82), uDuskBlend);
          float lashLine = exp(-pow((vUv.y - (eyeCenter.y - 0.002 - uBlink * 0.003)) / 0.0022, 2.0)) * eyeOval;
          col = mix(col, skinLidTone, eyeOval * lidSweep * uBlink * 0.85);
          col = mix(col, vec3(0.04, 0.05, 0.08), lashLine * uBlink * 0.72);
        }

        vec3 linearTint = pow(max(uGirlTint, vec3(0.01)), vec3(1.75));
        col *= linearTint * mix(0.46, 0.60, uDuskBlend);

        vec2 stepUv = uTexelSize * 2.5;
        float aL = texture2D(uMap, vUv - vec2(stepUv.x, 0.0)).a;
        float aR = texture2D(uMap, vUv + vec2(stepUv.x, 0.0)).a;
        float aD = texture2D(uMap, vUv - vec2(0.0, stepUv.y)).a;
        float aU = texture2D(uMap, vUv + vec2(0.0, stepUv.y)).a;

        vec2 edgeGrad = vec2(aL - aR, aD - aU);
        float edgeMag = clamp(length(edgeGrad) * 1.35, 0.0, 1.0);
        vec2 edgeDir = edgeGrad / max(length(edgeGrad), 0.0001);

        vec2 moonDir2D = normalize(vec2(-0.72, 0.69));
        float moonFacing = max(dot(edgeDir, moonDir2D), 0.0);
        float upperBodyMask = smoothstep(0.18, 0.86, vUv.y);
        vec3 moonRimCol = mix(vec3(0.30, 0.54, 0.82), vec3(0.92, 0.52, 0.24), uDuskBlend * 0.85);
        col += moonRimCol * edgeMag * moonFacing * (0.20 + 0.24 * upperBodyMask);

        float crownSheen = smoothstep(0.58, 0.92, vUv.y) * (1.0 - smoothstep(0.36, 0.70, vUv.x));
        col += moonRimCol * crownSheen * 0.09;

        vec2 lanternUV = vec2(0.92, 0.36);
        vec2 toLantern = normalize(lanternUV - vUv);
        float lanternFacing = max(dot(edgeDir, toLantern), 0.0);
        float lanternDist = length((vUv - vec2(0.84, 0.37)) * vec2(1.25, 1.05));
        float lanternFalloff = exp(-lanternDist * 2.15);
        float lanternFlicker = 0.96 + 0.04 * sin(uTime * 5.2) * cos(uTime * 3.1);
        float clampedBoost = min(uLanternBoost, 0.95);
        vec3 warmGold = vec3(0.96, 0.56, 0.16);
        col += warmGold * edgeMag * lanternFacing * exp(-lanternDist * 1.4) * clampedBoost * lanternFlicker * 0.52;
        col += warmGold * lanternFalloff * clampedBoost * lanternFlicker * 0.19;

        float lowerBounce = (1.0 - smoothstep(0.06, 0.40, vUv.y)) * (1.0 - smoothstep(0.36, 0.68, vUv.x));
        float rippleBounce = 0.86 + 0.14 * sin(uTime * 2.1 + vUv.x * 12.0);
        vec3 waterBounceCol = mix(vec3(0.09, 0.20, 0.30), vec3(0.38, 0.20, 0.11), uDuskBlend);
        col += waterBounceCol * lowerBounce * rippleBounce * 0.16;

        if (uPalmGlow > 0.005) {
          vec2 palmPos = vec2(0.35 - uArmLift * 0.018, 0.535 + uArmLift * 0.055);
          float palmDist = length((vUv - palmPos) * vec2(1.0, 1.25));
          float localWarmth = exp(-palmDist * 4.2) * 0.34 + exp(-palmDist * 11.0) * 0.30;
          float faceBounce = exp(-length((vUv - vec2(0.48, 0.80)) * vec2(1.4, 1.4)) * 4.2) * 0.14;
          col += vec3(0.98, 0.68, 0.22) * (localWarmth + faceBounce) * uPalmGlow;
        }

        if (uNearbyFireflyIntensity > 0.005) {
          float nfDist = length((vUv - uNearbyFireflyUv) * vec2(1.0, 1.25));
          float nfGlow = exp(-nfDist * 4.8) * min(uNearbyFireflyIntensity, 0.85) * 0.18;
          col += vec3(0.96, 0.72, 0.28) * nfGlow;
        }

        col += vec3(0.28, 0.44, 0.60) * uHoverGlow * 0.05;
        col = col / (1.0 + col * 0.36);

        gl_FragColor = vec4(col, tex.a);
      }
    `,
	});
}
