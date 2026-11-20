import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { clamp, type TimeThemeParams } from "../simulationLogic.ts";

/**
 * 线性 HDR 电影级后期调色 Shader：
 * 支持 ACES Filmic 色调映射、边缘镜头柔焦、Launch→Workspace→Reading 实时光学景深（uWorkspaceBlur）
 * 与氛围压暗（uWorkspaceDim）、暗部/高光分离调色、暗角及 35mm 胶片细颗粒。
 */
const CinematicGradeShader = {
	uniforms: {
		tDiffuse: { value: null as THREE.Texture | null },
		uResolution: { value: new THREE.Vector2(1440, 900) },
		uTime: { value: 0 },
		uExposure: { value: 1.02 },
		uContrast: { value: 1.05 },
		uSaturation: { value: 1.04 },
		uVignetteStrength: { value: 0.28 },
		uShadowTint: { value: new THREE.Vector3(0.92, 0.97, 1.06) },
		uHighlightTint: { value: new THREE.Vector3(1.02, 1.01, 0.98) },
		uGrainStrength: { value: 0.016 },
		uFocusCenter: { value: new THREE.Vector2(0.62, 0.4) },
		uWorkspaceBlur: { value: 0.0 },
		uWorkspaceDim: { value: 0.0 },
	},
	vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uExposure;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignetteStrength;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uGrainStrength;
    uniform vec2 uFocusCenter;
    uniform float uWorkspaceBlur;
    uniform float uWorkspaceDim;

    varying vec2 vUv;

    vec3 acesFilm(vec3 x) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec3 sampleSafe(vec2 uv) {
      return texture2D(tDiffuse, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
    }

    void main() {
      vec2 texel = 1.0 / max(uResolution, vec2(1.0));
      vec3 hdr = sampleSafe(vUv);

      // 1. 光学镜头景深与工作区柔焦（线性 HDR 空间采样，保留萤火与月光圆润散景）
      if (uWorkspaceBlur > 0.005) {
        float blurAmt = clamp(uWorkspaceBlur, 0.0, 1.0);
        float radiusPx = mix(1.4, 7.6, blurAmt);
        vec2 r1 = texel * radiusPx * 0.52;
        vec2 r2 = texel * radiusPx;

        vec3 accum = hdr * 0.18;
        // 内环 4 点
        accum += sampleSafe(vUv + vec2(r1.x, r1.y)) * 0.105;
        accum += sampleSafe(vUv + vec2(-r1.x, r1.y)) * 0.105;
        accum += sampleSafe(vUv + vec2(r1.x, -r1.y)) * 0.105;
        accum += sampleSafe(vUv + vec2(-r1.x, -r1.y)) * 0.105;
        // 外环 8 点等角散景采样
        accum += sampleSafe(vUv + vec2(r2.x, 0.0)) * 0.05;
        accum += sampleSafe(vUv + vec2(-r2.x, 0.0)) * 0.05;
        accum += sampleSafe(vUv + vec2(0.0, r2.y)) * 0.05;
        accum += sampleSafe(vUv + vec2(0.0, -r2.y)) * 0.05;
        accum += sampleSafe(vUv + vec2(r2.x * 0.707, r2.y * 0.707)) * 0.05;
        accum += sampleSafe(vUv + vec2(-r2.x * 0.707, r2.y * 0.707)) * 0.05;
        accum += sampleSafe(vUv + vec2(r2.x * 0.707, -r2.y * 0.707)) * 0.05;
        accum += sampleSafe(vUv + vec2(-r2.x * 0.707, -r2.y * 0.707)) * 0.05;

        hdr = mix(hdr, accum, smoothstep(0.0, 0.18, blurAmt));
      } else {
        vec2 focusDelta = (vUv - uFocusCenter) * vec2(1.35, 1.0);
        float focusDist = length(focusDelta);
        float edgeSoft = smoothstep(0.58, 1.15, focusDist) * 0.42;
        if (edgeSoft > 0.005) {
          vec2 o = texel * (1.25 + edgeSoft * 1.4);
          vec3 blur = (
            sampleSafe(vUv + vec2(o.x, o.y)) +
            sampleSafe(vUv + vec2(-o.x, o.y)) +
            sampleSafe(vUv + vec2(o.x, -o.y)) +
            sampleSafe(vUv + vec2(-o.x, -o.y))
          ) * 0.25;
          hdr = mix(hdr, blur, edgeSoft);
        }
      }

      // 2. 曝光（叠加工作区柔和压暗）+ ACES Filmic 色调映射
      float effectiveExposure = uExposure * (1.0 - clamp(uWorkspaceDim, 0.0, 1.0) * 0.26);
      vec3 mapped = acesFilm(hdr * effectiveExposure);

      // 3. Linear -> sRGB
      vec3 col = pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.2));

      // 4. 暗部与高光分离调色
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float shadowMask = 1.0 - smoothstep(0.08, 0.56, lum);
      float highMask = smoothstep(0.42, 0.94, lum);
      col *= mix(vec3(1.0), uShadowTint, shadowMask * 0.65);
      col *= mix(vec3(1.0), uHighlightTint, highMask * 0.55);

      // 5. 对比度与饱和度平衡
      col = (col - 0.5) * uContrast + 0.5;
      float gradedLum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(gradedLum), col, uSaturation);

      // 6. 柔和暗角（工作区与阅读态适度收束边缘注意力）
      vec2 vPos = (vUv - vec2(0.52, 0.48)) * vec2(1.22, 1.08);
      float effectiveVig = uVignetteStrength + clamp(uWorkspaceDim, 0.0, 1.0) * 0.14;
      float vig = 1.0 - smoothstep(0.45, 1.25, length(vPos)) * effectiveVig;
      col *= vig;

      // 7. 细微 35mm 胶片颗粒
      float grain = (hash12(gl_FragCoord.xy + fract(uTime * 17.3) * 100.0) - 0.5) * uGrainStrength;
      col += grain * (0.45 + 0.55 * (1.0 - highMask));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export interface CinematicPipeline {
	composer: EffectComposer;
	bloomPass: UnrealBloomPass;
	gradePass: ShaderPass;
	resize: (width: number, height: number, pixelRatio: number) => void;
	setOpticalBlur: (blur: number, dim: number) => void;
	update: (time: number, theme: TimeThemeParams, focusBoost: number) => void;
	render: () => void;
	dispose: () => void;
}

export function createCinematicPipeline(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
	width: number,
	height: number,
	pixelRatio: number,
	isSoftwareGl: boolean,
	msaaSamples = 4,
): CinematicPipeline {
	renderer.toneMapping = THREE.NoToneMapping;

	const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
	const rtHeight = Math.max(1, Math.floor(height * pixelRatio));

	const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
		type: THREE.HalfFloatType,
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		samples: isSoftwareGl ? 0 : Math.max(0, Math.min(msaaSamples, 4)),
	});

	const composer = new EffectComposer(renderer, renderTarget);
	composer.setPixelRatio(pixelRatio);
	composer.setSize(width, height);

	const renderPass = new RenderPass(scene, camera);
	composer.addPass(renderPass);

	const bloomScale = isSoftwareGl ? 0.5 : pixelRatio <= 1.35 ? 0.75 : 1.0;
	const bloomResolution = new THREE.Vector2(
		Math.max(1, Math.floor(width * bloomScale)),
		Math.max(1, Math.floor(height * bloomScale)),
	);
	const bloomPass = new UnrealBloomPass(bloomResolution, 0.28, 0.52, 0.85);
	composer.addPass(bloomPass);

	const gradePass = new ShaderPass(CinematicGradeShader);
	gradePass.uniforms.uResolution.value.set(rtWidth, rtHeight);
	composer.addPass(gradePass);

	return {
		composer,
		bloomPass,
		gradePass,
		resize: (w, h, pr) => {
			composer.setPixelRatio(pr);
			composer.setSize(w, h);
			const nextBloomScale = isSoftwareGl ? 0.5 : pr <= 1.35 ? 0.75 : 1.0;
			bloomPass.resolution.set(
				Math.max(1, Math.floor(w * nextBloomScale)),
				Math.max(1, Math.floor(h * nextBloomScale)),
			);
			gradePass.uniforms.uResolution.value.set(
				Math.max(1, Math.floor(w * pr)),
				Math.max(1, Math.floor(h * pr)),
			);
		},
		setOpticalBlur: (blur, dim) => {
			gradePass.uniforms.uWorkspaceBlur.value = clamp(blur, 0, 1);
			gradePass.uniforms.uWorkspaceDim.value = clamp(dim, 0, 1);
		},
		update: (time, theme, focusBoost) => {
			bloomPass.strength = theme.bloomStrength + focusBoost * 0.08;
			bloomPass.threshold = theme.bloomThreshold;
			bloomPass.radius = 0.54;

			gradePass.uniforms.uTime.value = time;
			gradePass.uniforms.uExposure.value = theme.exposure;
			gradePass.uniforms.uContrast.value = theme.contrast;
			gradePass.uniforms.uSaturation.value = theme.saturation;
			gradePass.uniforms.uVignetteStrength.value = theme.vignetteStrength;
			(gradePass.uniforms.uShadowTint.value as THREE.Vector3).set(
				theme.gradeShadowTint.r,
				theme.gradeShadowTint.g,
				theme.gradeShadowTint.b,
			);
			(gradePass.uniforms.uHighlightTint.value as THREE.Vector3).set(
				theme.gradeHighlightTint.r,
				theme.gradeHighlightTint.g,
				theme.gradeHighlightTint.b,
			);
		},
		render: () => {
			composer.render();
		},
		dispose: () => {
			bloomPass.dispose();
			gradePass.dispose();
			renderTarget.dispose();
			composer.dispose();
		},
	};
}
