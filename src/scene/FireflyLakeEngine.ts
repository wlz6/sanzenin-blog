import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
	createChromaKeyedTexture,
	createPbrMapsFromAlbedo,
	loadImage,
	resolveSceneAssets,
	type SceneAssetUrls,
} from "./assets.ts";
import { AmbientAudioEngine } from "./audio/ambientAudio.ts";
import { createCinematicPipeline, type CinematicPipeline } from "./postprocessing/cinematicPipeline.ts";
import {
	buildForegroundFoliage,
	buildLakesideLantern,
	buildWoodenPier,
	type FoliageRig,
	type LanternRig,
	type PierRig,
} from "./props/buildPierAndLantern.ts";
import {
	createAtmosphereMotesSystem,
	createLightShaftsMaterial,
	createVolumetricLakeMist,
	type AtmosphereMotesRig,
	type VolumetricMistRig,
} from "./shaders/atmosphereShader.ts";
import { createBackdropMaterial, createShoreWingsMaterial } from "./shaders/backdropShader.ts";
import { createGirlMaterial } from "./shaders/girlShader.ts";
import { createWaterMaterial } from "./shaders/waterShader.ts";
import {
	clamp,
	cloneTimeParams,
	computeLaunchCameraTargets,
	dampTimeParams,
	GirlInteractionController,
	LanternEasterEggController,
	MAX_RIPPLES,
	resolveQualityPreset,
	RipplePool,
	TIME_THEMES,
	type EasterEggState,
	type GirlPhase,
	type InteractionMode,
	type SceneQuality,
	type TimeOfDay,
	type TimeThemeParams,
} from "./simulationLogic.ts";
import {
	createFallingLeavesSystem,
	createFireflySystem,
	type FireflySystemRig,
	type LeafSystemRig,
} from "./systems/fireflySystem.ts";

export type SceneHoverTarget = "none" | "girl" | "lantern" | "lake";

export interface FireflySceneState {
	timeOfDay: TimeOfDay;
	quality: SceneQuality;
	interactionMode: InteractionMode;
	cameraTransition: number;
	opticalBlur: number;
	opticalDim: number;
	reducedMotion: boolean;
	audioEnabled: boolean;
	hoverTarget: SceneHoverTarget;
	girlPhase: GirlPhase;
	easterEggState: EasterEggState;
	lanternClicks: number;
	rippleTotal: number;
	assetsReady: boolean;
	webglFallback: boolean;
	assetError: boolean;
	paused: boolean;
	mounted: boolean;
}

export type FireflySceneListener = (state: Readonly<FireflySceneState>) => void;

export interface FireflyLakeEngineOptions {
	basePath?: string;
	initialTimeOfDay?: TimeOfDay;
	initialQuality?: SceneQuality;
	initialInteractionMode?: InteractionMode;
	initialReducedMotion?: boolean;
}

const INTERACTIVE_UI_SELECTOR = [
	"button",
	"a",
	"input",
	"select",
	"textarea",
	"summary",
	"label",
	"[role='button']",
	"[contenteditable]",
	".lg-panel",
	".lg-dock",
	".lg-nav",
	".lg-article",
	"[data-lg-interactive]",
].join(", ");

const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.8);
const _cursorWorld = new THREE.Vector3();
const _palmWorld = new THREE.Vector3();
const _mistColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _camLookTarget = new THREE.Vector3();
const _waterClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.02);
const _biasMatrix = new THREE.Matrix4().set(
	0.5, 0.0, 0.0, 0.5,
	0.0, 0.5, 0.0, 0.5,
	0.0, 0.0, 0.5, 0.5,
	0.0, 0.0, 0.0, 1.0,
);
const _reflTextureMatrix = new THREE.Matrix4();

function detectWebGlCapabilities(): { supported: boolean; isSoftwareGl: boolean } {
	if (typeof document === "undefined") return { supported: false, isSoftwareGl: true };
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
	if (!gl) return { supported: false, isSoftwareGl: true };
	const ext = gl.getExtension("WEBGL_debug_renderer_info");
	const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
	const gpu = String(gl.getParameter(param) || "");
	gl.getExtension("WEBGL_lose_context")?.loseContext();
	const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
	return { supported: true, isSoftwareGl };
}

export function detectDefaultQuality(): SceneQuality {
	if (typeof window === "undefined") return "balanced";
	const isMobile = window.matchMedia("(max-width: 779px)").matches;
	const cores = navigator.hardwareConcurrency || 4;
	return isMobile || cores <= 4 ? "balanced" : "high";
}

function isTargetInsideInteractiveUi(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;
	return Boolean(target.closest(INTERACTIVE_UI_SELECTOR));
}

/**
 * 框架无关的「萤火眠于湖」Three.js 实时场景控制器。
 */
export class FireflyLakeEngine {
	private readonly assets: SceneAssetUrls;
	private readonly audioEngine = new AmbientAudioEngine();
	private readonly listeners = new Set<FireflySceneListener>();

	private state: FireflySceneState;
	private container: HTMLElement | null = null;
	private disposed = false;
	private isSoftwareGl = false;

	private renderer: THREE.WebGLRenderer | null = null;
	private scene: THREE.Scene | null = null;
	private camera: THREE.PerspectiveCamera | null = null;
	private reflectionCamera: THREE.PerspectiveCamera | null = null;
	private reflectionRT: THREE.WebGLRenderTarget | null = null;
	private pipeline: CinematicPipeline | null = null;
	private envRT: THREE.WebGLRenderTarget | null = null;

	private backdropMat: THREE.ShaderMaterial | null = null;
	private shoreMat: THREE.ShaderMaterial | null = null;
	private lightShaftsMat: THREE.ShaderMaterial | null = null;
	private lightShaftsMesh: THREE.Mesh | null = null;
	private waterMat: THREE.ShaderMaterial | null = null;
	private waterMesh: THREE.Mesh | null = null;
	private girlMat: THREE.ShaderMaterial | null = null;
	private hemiLight: THREE.HemisphereLight | null = null;
	private keyLight: THREE.DirectionalLight | null = null;
	private fireflyPointLight: THREE.PointLight | null = null;

	private pierRig: PierRig | null = null;
	private lanternRig: LanternRig | null = null;
	private foliageRig: FoliageRig | null = null;
	private fireflyRig: FireflySystemRig | null = null;
	private mistRig: VolumetricMistRig | null = null;
	private motesRig: AtmosphereMotesRig | null = null;
	private leavesRig: LeafSystemRig | null = null;
	private interactables: THREE.Object3D[] = [];
	private loadedTextures: THREE.Texture[] = [];
	private extraDisposables: { dispose: () => void }[] = [];

	private readonly baseCamPos = new THREE.Vector3(0, 2.25, 11.4);
	private readonly baseLookAt = new THREE.Vector3(0, 2.32, -28);
	private baseFov = 38;
	private readonly girlBasePos = new THREE.Vector3(1.84, 1.2, 2.05);
	private readonly girlPlaneWidth = 2.4 * 0.75;
	private readonly girlPlaneHeight = 2.4;

	private currentTheme: TimeThemeParams;
	private readonly ripplePool = new RipplePool();
	private readonly girlCtrl = new GirlInteractionController();
	private readonly easterEggCtrl = new LanternEasterEggController();

	private pointerNormX = 0;
	private pointerNormY = 0;
	private cursorActive = false;
	private lastPointerMoveAt = 0;
	private wheelZoomTarget = 0;
	private wheelZoomCurrent = 0;
	private transitionTarget = 0;
	private transitionCurrent = 0;
	private blurTarget = 0;
	private blurCurrent = 0;
	private dimTarget = 0;
	private dimCurrent = 0;
	private lastRaycastTime = 0;
	private elapsedTotal = 0;
	private lastTimestamp = 0;
	private lastRenderAt = 0;
	private girlHoverSmooth = 0;
	private lanternHoverSmooth = 0;
	private contextLost = false;
	private frameId = 0;
	private resizeObserver: ResizeObserver | null = null;

	private activePixelRatio = 1.5;
	private activeReflectionScale = 0.78;
	private activeFireflyScale = 1.0;
	private activeFpsCap = 60;

	constructor(options: FireflyLakeEngineOptions = {}) {
		this.assets = resolveSceneAssets(options.basePath ?? "/");
		const initialTime = options.initialTimeOfDay ?? "blue_hour";
		const initialQuality = options.initialQuality ?? detectDefaultQuality();
		const initialMode = options.initialInteractionMode ?? "launch";
		const initialReduced = options.initialReducedMotion ?? false;

		this.currentTheme = cloneTimeParams(TIME_THEMES[initialTime]);
		this.state = {
			timeOfDay: initialTime,
			quality: initialQuality,
			interactionMode: initialMode,
			cameraTransition: 0,
			opticalBlur: 0,
			opticalDim: 0,
			reducedMotion: initialReduced,
			audioEnabled: false,
			hoverTarget: "none",
			girlPhase: "idle",
			easterEggState: "idle",
			lanternClicks: 0,
			rippleTotal: 0,
			assetsReady: false,
			webglFallback: false,
			assetError: false,
			paused: false,
			mounted: false,
		};
	}

	getState(): Readonly<FireflySceneState> {
		return { ...this.state };
	}

	subscribe(listener: FireflySceneListener): () => void {
		this.listeners.add(listener);
		listener(this.getState());
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(patch: Partial<FireflySceneState>): void {
		let changed = false;
		for (const key of Object.keys(patch) as (keyof FireflySceneState)[]) {
			if (this.state[key] !== patch[key]) {
				changed = true;
				break;
			}
		}
		if (!changed) return;
		this.state = { ...this.state, ...patch };
		const snapshot = this.getState();
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}

	private syncDocumentPhase(): void {
		if (typeof document !== "undefined") {
			document.documentElement.dataset.scenePhase = this.state.timeOfDay;
		}
	}

	mount(container: HTMLElement): void {
		if (this.container) this.dispose();
		this.disposed = false;
		this.container = container;
		this.syncDocumentPhase();

		const { supported, isSoftwareGl } = detectWebGlCapabilities();
		this.isSoftwareGl = isSoftwareGl;
		if (!supported) {
			this.emit({ webglFallback: true, assetsReady: true, mounted: true });
			return;
		}

		const initW = container.clientWidth || window.innerWidth;
		const initH = container.clientHeight || window.innerHeight;
		const preset = this.computeCurrentPreset();
		this.applyPresetMetrics(preset);

		const renderer = new THREE.WebGLRenderer({
			antialias: !isSoftwareGl && preset.msaaSamples > 0,
			powerPreference: "high-performance",
			alpha: false,
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.localClippingEnabled = true;
		renderer.setPixelRatio(this.activePixelRatio);
		renderer.shadowMap.enabled = preset.enableShadows && !isSoftwareGl;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.setSize(initW, initH);

		const domCanvas = renderer.domElement;
		domCanvas.style.display = "block";
		domCanvas.style.width = "100%";
		domCanvas.style.height = "100%";
		domCanvas.setAttribute("data-testid", "lake-webgl-canvas");
		container.appendChild(domCanvas);
		this.renderer = renderer;

		const scene = new THREE.Scene();
		const initialTheme = cloneTimeParams(TIME_THEMES[this.state.timeOfDay]);
		this.currentTheme = initialTheme;
		scene.background = new THREE.Color(
			initialTheme.fogColor.r,
			initialTheme.fogColor.g,
			initialTheme.fogColor.b,
		);
		scene.fog = new THREE.FogExp2(scene.background.getHex(), initialTheme.fogDensity);
		this.scene = scene;

		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
		scene.environment = envRT.texture;
		pmremGenerator.dispose();
		this.envRT = envRT;

		const camera = new THREE.PerspectiveCamera(38, this.getAspect(), 0.1, 160);
		const reflectionCamera = new THREE.PerspectiveCamera(38, this.getAspect(), 0.1, 160);
		this.camera = camera;
		this.reflectionCamera = reflectionCamera;
		this.updateResponsiveCameraBase();
		camera.position.copy(this.baseCamPos);
		camera.lookAt(this.baseLookAt);

		const hemiLight = new THREE.HemisphereLight(0x7aa4c4, 0x0d1e2e, initialTheme.ambientIntensity);
		scene.add(hemiLight);
		this.hemiLight = hemiLight;

		const keyLight = new THREE.DirectionalLight(0xc2dcf2, initialTheme.keyLightIntensity);
		keyLight.position.set(-7.5, 11.5, -5.5);
		if (!isSoftwareGl && preset.enableShadows) {
			keyLight.castShadow = true;
			keyLight.shadow.mapSize.set(2048, 2048);
			keyLight.shadow.camera.near = 2;
			keyLight.shadow.camera.far = 32;
			keyLight.shadow.camera.left = -8;
			keyLight.shadow.camera.right = 8;
			keyLight.shadow.camera.top = 8;
			keyLight.shadow.camera.bottom = -4;
			keyLight.shadow.bias = -0.0004;
			keyLight.shadow.normalBias = 0.02;
		}
		scene.add(keyLight);
		this.keyLight = keyLight;

		const rimLight = new THREE.DirectionalLight(0x9ec5de, 0.42);
		rimLight.position.set(5.5, 4.2, -8.0);
		scene.add(rimLight);

		const fireflyPointLight = new THREE.PointLight(0xf6da74, 0.0, 5.2, 1.8);
		scene.add(fireflyPointLight);
		this.fireflyPointLight = fireflyPointLight;

		const reflectionRT = new THREE.WebGLRenderTarget(
			Math.max(1, Math.floor(initW * this.activePixelRatio * this.activeReflectionScale)),
			Math.max(1, Math.floor(initH * this.activePixelRatio * this.activeReflectionScale)),
			{
				type: THREE.HalfFloatType,
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			},
		);
		this.reflectionRT = reflectionRT;

		const backdropGeo = new THREE.PlaneGeometry(54, 30.0);
		const backdropMat = createBackdropMaterial(null);
		const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
		backdropMesh.position.set(0, 8.25, -28);
		backdropMesh.renderOrder = 0;
		scene.add(backdropMesh);
		this.backdropMat = backdropMat;

		const shoreGeo = new THREE.PlaneGeometry(36, 15.5);
		const shoreMat = createShoreWingsMaterial(null);
		const shoreMesh = new THREE.Mesh(shoreGeo, shoreMat);
		shoreMesh.position.set(0, 4.2, -13.5);
		shoreMesh.renderOrder = 1;
		scene.add(shoreMesh);
		this.shoreMat = shoreMat;

		const lightShaftsGeo = new THREE.PlaneGeometry(26, 14.5);
		const lightShaftsMat = createLightShaftsMaterial();
		const lightShaftsMesh = new THREE.Mesh(lightShaftsGeo, lightShaftsMat);
		lightShaftsMesh.position.set(-2.2, 5.1, -11.0);
		lightShaftsMesh.renderOrder = 2;
		scene.add(lightShaftsMesh);
		this.lightShaftsMat = lightShaftsMat;
		this.lightShaftsMesh = lightShaftsMesh;

		const waterGeo = new THREE.PlaneGeometry(66, 40, 1, 1);
		const waterMat = createWaterMaterial(null);
		waterMat.uniforms.uReflectionMap.value = reflectionRT.texture;
		waterMat.uniforms.uHasReflection.value = 1.0;
		const waterMesh = new THREE.Mesh(waterGeo, waterMat);
		waterMesh.rotation.x = -Math.PI / 2;
		waterMesh.position.set(0, 0, -8.5);
		waterMesh.userData = { interactable: "lake" };
		waterMesh.renderOrder = 1;
		scene.add(waterMesh);
		this.waterMat = waterMat;
		this.waterMesh = waterMesh;

		const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
		const pierRig = buildWoodenPier(null, maxAnisotropy);
		scene.add(pierRig.group);
		this.pierRig = pierRig;

		const lanternWorldPos = new THREE.Vector3(3.08, pierRig.deckTopY, 1.5);
		const lanternRig = buildLakesideLantern(lanternWorldPos, isSoftwareGl);
		scene.add(lanternRig.group);
		this.lanternRig = lanternRig;

		const girlGeo = new THREE.PlaneGeometry(this.girlPlaneWidth, this.girlPlaneHeight, 48, 64);
		const girlMat = createGirlMaterial(null);
		const girlMesh = new THREE.Mesh(girlGeo, girlMat);
		this.girlBasePos.set(1.84, pierRig.deckTopY + 0.38, 2.05);
		girlMesh.position.copy(this.girlBasePos);
		girlMesh.renderOrder = 5;
		scene.add(girlMesh);
		this.girlMat = girlMat;

		const girlHitGeo = new THREE.PlaneGeometry(1.38, 2.05);
		const girlHitMat = new THREE.MeshBasicMaterial({ visible: false });
		const girlHitProxy = new THREE.Mesh(girlHitGeo, girlHitMat);
		girlHitProxy.position.set(this.girlBasePos.x, this.girlBasePos.y + 0.05, this.girlBasePos.z + 0.04);
		girlHitProxy.userData = { interactable: "girl" };
		scene.add(girlHitProxy);

		this.extraDisposables.push(
			backdropGeo,
			backdropMat,
			shoreGeo,
			shoreMat,
			lightShaftsGeo,
			lightShaftsMat,
			waterGeo,
			waterMat,
			girlGeo,
			girlMat,
			girlHitGeo,
			girlHitMat,
		);

		const foliageRig = buildForegroundFoliage();
		scene.add(foliageRig.group);
		this.foliageRig = foliageRig;

		const fireflyRig = createFireflySystem(preset.fireflyMaxCount);
		fireflyRig.setPixelRatio(this.activePixelRatio);
		scene.add(fireflyRig.group);
		this.fireflyRig = fireflyRig;

		const mistRig = createVolumetricLakeMist(lanternWorldPos);
		scene.add(mistRig.group);
		this.mistRig = mistRig;

		const motesRig = createAtmosphereMotesSystem(lanternWorldPos, preset.motesCount);
		motesRig.setPixelRatio(this.activePixelRatio);
		scene.add(motesRig.points);
		this.motesRig = motesRig;

		const leavesRig = createFallingLeavesSystem(7);
		scene.add(leavesRig.group);
		this.leavesRig = leavesRig;

		this.interactables = [lanternRig.hitProxy, girlHitProxy, waterMesh];

		const pipeline = createCinematicPipeline(
			renderer,
			scene,
			camera,
			initW,
			initH,
			this.activePixelRatio,
			isSoftwareGl,
			preset.msaaSamples,
		);
		pipeline.setOpticalBlur(this.blurCurrent, this.dimCurrent);
		this.pipeline = pipeline;

		this.ripplePool.spawn(-1.8, -3.2, 0.2, 0.55);

		this.bindEvents();
		this.emit({ mounted: true, webglFallback: false });
		void this.loadAllTextures(maxAnisotropy);

		this.lastTimestamp = performance.now();
		this.syncLoopState();
	}

	private computeCurrentPreset() {
		const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 779px)").matches;
		const threads = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		return resolveQualityPreset(this.state.quality, this.isSoftwareGl, isMobile, threads, dpr);
	}

	private applyPresetMetrics(preset: ReturnType<typeof resolveQualityPreset>): void {
		this.activePixelRatio = preset.pixelRatio;
		this.activeReflectionScale = preset.reflectionScale;
		this.activeFireflyScale = preset.fireflyActiveScale;
		this.activeFpsCap = preset.targetFpsCap;
	}

	private getAspect(): number {
		const w = this.container?.clientWidth || window.innerWidth || 1;
		const h = Math.max(1, this.container?.clientHeight || window.innerHeight || 1);
		return w / h;
	}

	private updateResponsiveCameraBase(): void {
		if (!this.camera) return;
		const aspect = this.getAspect();
		this.camera.aspect = aspect;
		if (aspect < 0.9) {
			this.baseFov = 48;
			this.baseCamPos.set(1.42, 2.22, 12.15);
			this.baseLookAt.set(1.12, 2.02, -28);
		} else if (aspect < 1.35) {
			this.baseFov = 42;
			this.baseCamPos.set(0.42, 2.25, 11.6);
			this.baseLookAt.set(0.22, 2.25, -28);
		} else if (aspect > 2.05) {
			this.baseFov = 35;
			this.baseCamPos.set(0.0, 2.3, 12.2);
			this.baseLookAt.set(0.0, 2.35, -28);
		} else {
			this.baseFov = 38;
			this.baseCamPos.set(0, 2.25, 11.4);
			this.baseLookAt.set(0, 2.32, -28);
		}
		this.camera.fov = this.baseFov;
		this.camera.updateProjectionMatrix();
	}

	private async loadAllTextures(maxAnisotropy: number): Promise<void> {
		try {
			const [lakeImg, girlImg, woodImg, shoreImg] = await Promise.all([
				loadImage(this.assets.lakePanorama),
				loadImage(this.assets.girlSitting),
				loadImage(this.assets.woodPlanks),
				loadImage(this.assets.forestShores),
			]);
			if (this.disposed) return;

			const lakeTex = new THREE.Texture(lakeImg);
			lakeTex.colorSpace = THREE.SRGBColorSpace;
			lakeTex.anisotropy = maxAnisotropy;
			lakeTex.generateMipmaps = false;
			lakeTex.minFilter = THREE.LinearFilter;
			lakeTex.magFilter = THREE.LinearFilter;
			lakeTex.needsUpdate = true;
			this.loadedTextures.push(lakeTex);

			if (this.backdropMat) this.backdropMat.uniforms.uMap.value = lakeTex;
			if (this.waterMat) this.waterMat.uniforms.uBackdropMap.value = lakeTex;

			const girlTex = createChromaKeyedTexture(girlImg, maxAnisotropy);
			this.loadedTextures.push(girlTex);
			if (this.girlMat) {
				this.girlMat.uniforms.uMap.value = girlTex;
				(this.girlMat.uniforms.uTexelSize.value as THREE.Vector2).set(
					1 / Math.max(1, girlImg.naturalWidth || 896),
					1 / Math.max(1, girlImg.naturalHeight || 1200),
				);
			}

			const woodTex = new THREE.Texture(woodImg);
			woodTex.colorSpace = THREE.SRGBColorSpace;
			woodTex.wrapS = THREE.RepeatWrapping;
			woodTex.wrapT = THREE.RepeatWrapping;
			woodTex.repeat.set(1.6, 1.0);
			woodTex.anisotropy = maxAnisotropy;
			woodTex.needsUpdate = true;
			this.loadedTextures.push(woodTex);

			const { normalMap, roughnessMap } = createPbrMapsFromAlbedo(woodImg, 2.6, maxAnisotropy);
			this.loadedTextures.push(normalMap, roughnessMap);
			this.pierRig?.applyPbrTextures(woodTex, normalMap, roughnessMap);

			const shoreTex = new THREE.Texture(shoreImg);
			shoreTex.colorSpace = THREE.SRGBColorSpace;
			shoreTex.anisotropy = maxAnisotropy;
			shoreTex.generateMipmaps = false;
			shoreTex.minFilter = THREE.LinearFilter;
			shoreTex.magFilter = THREE.LinearFilter;
			shoreTex.needsUpdate = true;
			this.loadedTextures.push(shoreTex);
			if (this.shoreMat) this.shoreMat.uniforms.uMap.value = shoreTex;

			if (!this.isSoftwareGl && this.renderer && this.scene && this.camera) {
				this.renderer.compile(this.scene, this.camera);
			}

			this.emit({ assetsReady: true, assetError: false });
		} catch (err) {
			console.error("[FireflyLakeEngine] 场景贴图加载失败:", err);
			this.emit({ assetsReady: true, assetError: true });
		}
	}

	private updatePointerFromClient(clientX: number, clientY: number): void {
		const canvas = this.renderer?.domElement;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
		const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
		this.pointerNormX = clamp(nx, -1, 1);
		this.pointerNormY = clamp(ny, -1, 1);
		_pointerNdc.set(this.pointerNormX, this.pointerNormY);
		this.cursorActive = true;
		this.lastPointerMoveAt = this.elapsedTotal;
	}

	private performRaycast(): { kind: SceneHoverTarget; point?: THREE.Vector3 } {
		if (!this.camera) return { kind: "none" };
		_raycaster.setFromCamera(_pointerNdc, this.camera);
		const hits = _raycaster.intersectObjects(this.interactables, false);
		if (hits.length === 0) return { kind: "none" };
		const first = hits[0];
		const kind = (first.object.userData?.interactable as SceneHoverTarget | undefined) ?? "none";
		return { kind, point: first.point };
	}

	private readonly onPointerMove = (e: PointerEvent) => {
		if (this.state.quality === "static" || this.state.paused) return;
		this.updatePointerFromClient(e.clientX, e.clientY);

		if (this.state.interactionMode !== "launch" || isTargetInsideInteractiveUi(e.target)) {
			if (this.state.hoverTarget !== "none") {
				this.emit({ hoverTarget: "none" });
			}
			return;
		}

		const now = performance.now();
		if (now - this.lastRaycastTime > 48) {
			this.lastRaycastTime = now;
			const hit = this.performRaycast();
			if (hit.kind !== this.state.hoverTarget) {
				this.emit({ hoverTarget: hit.kind });
			}
		}
	};

	private readonly onPointerLeave = () => {
		this.cursorActive = false;
		this.pointerNormX = 0;
		this.pointerNormY = 0;
		if (this.state.hoverTarget !== "none") {
			this.emit({ hoverTarget: "none" });
		}
	};

	private readonly onPointerDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		if (this.state.quality === "static" || this.state.paused) return;
		if (this.state.interactionMode !== "launch") return;
		if (isTargetInsideInteractiveUi(e.target)) return;

		this.updatePointerFromClient(e.clientX, e.clientY);
		const hit = this.performRaycast();

		if (hit.kind === "lantern") {
			this.triggerLantern();
			return;
		}
		if (hit.kind === "girl") {
			this.triggerGirl();
			return;
		}
		if (hit.kind === "lake" && hit.point) {
			this.spawnRipple(hit.point.x, hit.point.z, 1.0);
		}
	};

	private readonly onWheel = (e: WheelEvent) => {
		if (this.state.quality === "static" || this.state.paused) return;
		if (this.state.interactionMode !== "launch") return;
		if (isTargetInsideInteractiveUi(e.target)) return;
		this.wheelZoomTarget = clamp(this.wheelZoomTarget + e.deltaY * 0.0014, -1.25, 0.45);
	};

	private readonly onResize = () => {
		this.handleResize();
	};

	private readonly onVisibilityChange = () => {
		this.syncLoopState();
	};

	private readonly onContextLost = (e: Event) => {
		e.preventDefault();
		this.contextLost = true;
	};

	private readonly onContextRestored = () => {
		this.contextLost = false;
		this.lastTimestamp = performance.now();
	};

	private bindEvents(): void {
		const domCanvas = this.renderer?.domElement;
		window.addEventListener("pointermove", this.onPointerMove, { passive: true });
		document.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
		window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
		window.addEventListener("wheel", this.onWheel, { passive: true });
		window.addEventListener("resize", this.onResize, { passive: true });
		document.addEventListener("visibilitychange", this.onVisibilityChange);
		domCanvas?.addEventListener("webglcontextlost", this.onContextLost);
		domCanvas?.addEventListener("webglcontextrestored", this.onContextRestored);

		if (this.container && typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(() => this.handleResize());
			this.resizeObserver.observe(this.container);
		}
	}

	private unbindEvents(): void {
		const domCanvas = this.renderer?.domElement;
		window.removeEventListener("pointermove", this.onPointerMove);
		document.removeEventListener("pointerleave", this.onPointerLeave);
		window.removeEventListener("pointerdown", this.onPointerDown);
		window.removeEventListener("wheel", this.onWheel);
		window.removeEventListener("resize", this.onResize);
		document.removeEventListener("visibilitychange", this.onVisibilityChange);
		domCanvas?.removeEventListener("webglcontextlost", this.onContextLost);
		domCanvas?.removeEventListener("webglcontextrestored", this.onContextRestored);
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
	}

	private handleResize(): void {
		if (!this.container || !this.renderer || !this.pipeline || !this.reflectionRT) return;
		const w = this.container.clientWidth || window.innerWidth;
		const h = this.container.clientHeight || window.innerHeight;
		if (w <= 0 || h <= 0) return;

		const preset = this.computeCurrentPreset();
		this.applyPresetMetrics(preset);

		this.renderer.setSize(w, h);
		this.renderer.setPixelRatio(this.activePixelRatio);
		this.pipeline.resize(w, h, this.activePixelRatio);
		this.reflectionRT.setSize(
			Math.max(1, Math.floor(w * this.activePixelRatio * this.activeReflectionScale)),
			Math.max(1, Math.floor(h * this.activePixelRatio * this.activeReflectionScale)),
		);
		this.fireflyRig?.setPixelRatio(this.activePixelRatio);
		this.motesRig?.setPixelRatio(this.activePixelRatio);
		this.updateResponsiveCameraBase();
	}

	private shouldPauseLoop(): boolean {
		const hidden = typeof document !== "undefined" && document.hidden;
		return this.disposed || hidden || this.state.quality === "static" || this.state.webglFallback;
	}

	private syncLoopState(): void {
		const shouldPause = this.shouldPauseLoop();
		if (shouldPause) {
			if (this.frameId) {
				cancelAnimationFrame(this.frameId);
				window.clearTimeout(this.frameId);
				this.frameId = 0;
			}
			this.emit({ paused: true });
			return;
		}

		this.emit({ paused: false });
		if (!this.frameId && this.renderer) {
			this.lastTimestamp = performance.now();
			this.lastRenderAt = 0;
			this.frameId = requestAnimationFrame(this.tick);
		}
	}

	private scheduleNextFrame(): void {
		if (this.shouldPauseLoop()) {
			this.frameId = 0;
			return;
		}
		if (this.isSoftwareGl && this.renderer) {
			const gl = this.renderer.getContext() as WebGL2RenderingContext;
			if (!gl || typeof gl.fenceSync !== "function") {
				this.frameId = window.setTimeout(() => this.tick(performance.now()), 80);
				return;
			}
			const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
			gl.flush();
			const poll = () => {
				if (this.shouldPauseLoop()) {
					if (sync) gl.deleteSync(sync);
					this.frameId = 0;
					return;
				}
				const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
				if (status === gl.UNSIGNALED) {
					this.frameId = window.setTimeout(poll, 5);
				} else {
					if (sync) gl.deleteSync(sync);
					this.frameId = window.setTimeout(() => this.tick(performance.now()), 80);
				}
			};
			this.frameId = window.setTimeout(poll, 5);
		} else {
			this.frameId = requestAnimationFrame(this.tick);
		}
	}

	private readonly tick = (nowMs: number) => {
		this.frameId = 0;
		if (this.shouldPauseLoop()) return;

		// 阅读态自动收敛至 30fps 降低 GPU 功耗，其他态遵循画质上限
		const effectiveFpsCap =
			this.state.interactionMode === "reading" ? Math.min(this.activeFpsCap, 30) : this.activeFpsCap;
		if (effectiveFpsCap < 58 && this.lastRenderAt > 0) {
			const minInterval = 1000 / effectiveFpsCap;
			if (nowMs - this.lastRenderAt < minInterval - 1) {
				this.scheduleNextFrame();
				return;
			}
		}
		this.lastRenderAt = nowMs;

		const dt = clamp((nowMs - this.lastTimestamp) / 1000, 0.001, 0.1);
		this.lastTimestamp = nowMs;
		this.elapsedTotal += dt;

		if (!this.contextLost) {
			this.renderFrame(dt);
		}

		this.scheduleNextFrame();
	};

	private renderFrame(dt: number): void {
		if (
			!this.renderer ||
			!this.scene ||
			!this.camera ||
			!this.reflectionCamera ||
			!this.reflectionRT ||
			!this.pipeline ||
			!this.backdropMat ||
			!this.shoreMat ||
			!this.lightShaftsMat ||
			!this.lightShaftsMesh ||
			!this.waterMat ||
			!this.waterMesh ||
			!this.girlMat ||
			!this.hemiLight ||
			!this.keyLight ||
			!this.fireflyPointLight ||
			!this.lanternRig ||
			!this.foliageRig ||
			!this.fireflyRig ||
			!this.mistRig ||
			!this.motesRig ||
			!this.leavesRig
		) {
			return;
		}

		const reduced = this.state.reducedMotion;
		const targetTheme = TIME_THEMES[this.state.timeOfDay];
		this.currentTheme = dampTimeParams(this.currentTheme, targetTheme, 1.55, dt);

		const eggSample = this.easterEggCtrl.update(dt, this.elapsedTotal);
		const girlSample = this.girlCtrl.update(dt, eggSample.gazeUp);

		const dampCam = 1 - Math.exp(-3.8 * dt);
		const dampOptical = 1 - Math.exp(-6.2 * dt);

		// 工作区/阅读态重置滚轮偏移，避免残余偏移干扰推镜目标
		if (this.state.interactionMode !== "launch") {
			this.wheelZoomTarget = 0;
		}
		this.wheelZoomCurrent += (this.wheelZoomTarget - this.wheelZoomCurrent) * dampCam;
		this.transitionCurrent += (this.transitionTarget - this.transitionCurrent) * dampCam;
		this.blurCurrent += (this.blurTarget - this.blurCurrent) * dampOptical;
		this.dimCurrent += (this.dimTarget - this.dimCurrent) * dampOptical;

		const modeParallaxFactor =
			this.state.interactionMode === "reading"
				? 0.28
				: this.state.interactionMode === "workspace"
					? 0.55
					: 1.0;
		const parallaxScale = (reduced ? 0.15 : 1.0) * modeParallaxFactor;
		const breathX = reduced ? 0 : Math.sin(this.elapsedTotal * 0.28) * 0.032;
		const breathY = reduced ? 0 : Math.cos(this.elapsedTotal * 0.21 + 0.6) * 0.018;

		const focusZoom = girlSample.armLift * -0.44 + eggSample.ribbonFormation * 0.22;
		const camTarget = computeLaunchCameraTargets(
			this.baseCamPos,
			this.baseLookAt,
			this.baseFov,
			this.transitionCurrent,
			focusZoom,
			this.wheelZoomCurrent,
		);

		const targetCamX = camTarget.posX + this.pointerNormX * 0.46 * parallaxScale + breathX;
		const targetCamY = camTarget.posY + this.pointerNormY * 0.19 * parallaxScale + breathY;
		const targetCamZ = camTarget.posZ;

		this.camera.position.x += (targetCamX - this.camera.position.x) * dampCam;
		this.camera.position.y += (targetCamY - this.camera.position.y) * dampCam;
		this.camera.position.z += (targetCamZ - this.camera.position.z) * dampCam;

		if (Math.abs(this.camera.fov - camTarget.fov) > 0.01) {
			this.camera.fov += (camTarget.fov - this.camera.fov) * dampCam;
			this.camera.updateProjectionMatrix();
		}

		_camLookTarget.set(
			camTarget.lookX + this.pointerNormX * 0.15 * parallaxScale,
			camTarget.lookY + this.pointerNormY * 0.09 * parallaxScale,
			camTarget.lookZ,
		);
		this.camera.lookAt(_camLookTarget);
		this.camera.updateMatrixWorld();

		if (this.cursorActive) {
			_raycaster.setFromCamera(_pointerNdc, this.camera);
			_raycaster.ray.intersectPlane(_cursorPlane, _cursorWorld);
		}

		_fogColor.setRGB(
			this.currentTheme.fogColor.r * this.currentTheme.fogColor.r,
			this.currentTheme.fogColor.g * this.currentTheme.fogColor.g,
			this.currentTheme.fogColor.b * this.currentTheme.fogColor.b,
		);
		(this.scene.background as THREE.Color).copy(_fogColor);
		if (this.scene.fog instanceof THREE.FogExp2) {
			this.scene.fog.color.copy(_fogColor);
			this.scene.fog.density = this.currentTheme.fogDensity;
		}

		this.hemiLight.color.setRGB(
			this.currentTheme.ambientCool.r,
			this.currentTheme.ambientCool.g,
			this.currentTheme.ambientCool.b,
		);
		this.hemiLight.intensity = this.currentTheme.ambientIntensity;

		this.keyLight.color.setRGB(
			this.currentTheme.keyLightColor.r,
			this.currentTheme.keyLightColor.g,
			this.currentTheme.keyLightColor.b,
		);
		this.keyLight.intensity = this.currentTheme.keyLightIntensity;

		this.backdropMat.uniforms.uTime.value = this.elapsedTotal;
		this.backdropMat.uniforms.uDuskBlend.value = this.currentTheme.duskBlend;
		(this.backdropMat.uniforms.uSkyTint.value as THREE.Vector3).set(
			this.currentTheme.skyTint.r,
			this.currentTheme.skyTint.g,
			this.currentTheme.skyTint.b,
		);
		(this.backdropMat.uniforms.uHorizonGlow.value as THREE.Vector3).set(
			this.currentTheme.horizonGlow.r,
			this.currentTheme.horizonGlow.g,
			this.currentTheme.horizonGlow.b,
		);
		this.backdropMat.uniforms.uHorizonStrength.value = this.currentTheme.horizonGlowStrength;
		this.backdropMat.uniforms.uMoonGlow.value = this.currentTheme.moonGlow;
		this.backdropMat.uniforms.uStarVisibility.value = this.currentTheme.starVisibility;
		this.backdropMat.uniforms.uMeteorIntensity.value = eggSample.meteorShower;
		this.backdropMat.uniforms.uEasterEggTime.value = eggSample.elapsed;
		this.backdropMat.uniforms.uMistOpacity.value = this.currentTheme.mistOpacity;

		this.shoreMat.uniforms.uTime.value = this.elapsedTotal;
		this.shoreMat.uniforms.uDuskBlend.value = this.currentTheme.duskBlend;
		this.shoreMat.uniforms.uMistOpacity.value = this.currentTheme.mistOpacity;
		(this.shoreMat.uniforms.uTint.value as THREE.Vector3).set(
			this.currentTheme.skyTint.r,
			this.currentTheme.skyTint.g,
			this.currentTheme.skyTint.b,
		);

		this.lightShaftsMat.uniforms.uTime.value = this.elapsedTotal;
		this.lightShaftsMat.uniforms.uIntensity.value =
			this.currentTheme.godRayIntensity * (1.0 + eggSample.lanternBoost * 0.25);
		this.lightShaftsMat.uniforms.uDuskBlend.value = this.currentTheme.duskBlend;

		const hoverDamp = 1 - Math.exp(-6.5 * dt);
		this.girlHoverSmooth +=
			((this.state.hoverTarget === "girl" ? 1 : 0) - this.girlHoverSmooth) * hoverDamp;
		this.lanternHoverSmooth +=
			((this.state.hoverTarget === "lantern" ? 1 : 0) - this.lanternHoverSmooth) * hoverDamp;

		const lanternTotalIntensity =
			this.currentTheme.lanternIntensity * (1.0 + eggSample.lanternBoost * 1.45);
		this.lanternRig.update(this.elapsedTotal, lanternTotalIntensity, this.lanternHoverSmooth);

		_palmWorld.set(
			this.girlBasePos.x + (0.35 - 0.5) * this.girlPlaneWidth - girlSample.armLift * 0.06,
			this.girlBasePos.y + (0.52 - 0.5) * this.girlPlaneHeight + girlSample.armLift * 0.2,
			this.girlBasePos.z + 0.05,
		);

		const fireflyFeedback = this.fireflyRig.update({
			time: this.elapsedTotal,
			dt,
			density: this.currentTheme.fireflyDensity,
			brightness: this.currentTheme.fireflyBrightness,
			qualityScale: this.activeFireflyScale,
			cursorWorldX: _cursorWorld.x,
			cursorWorldY: _cursorWorld.y,
			cursorActive: this.cursorActive && this.state.interactionMode !== "reading",
			cursorIdleSec: this.elapsedTotal - this.lastPointerMoveAt,
			girlPalmWorld: _palmWorld,
			girlBasePos: this.girlBasePos,
			girlSample,
			easterEgg: eggSample,
			reducedMotion: reduced,
		});

		this.fireflyPointLight.position.copy(fireflyFeedback.worldPos);
		this.fireflyPointLight.intensity = fireflyFeedback.intensity * 1.65;

		this.girlMat.uniforms.uTime.value = this.elapsedTotal;
		this.girlMat.uniforms.uDuskBlend.value = this.currentTheme.duskBlend;
		(this.girlMat.uniforms.uGirlTint.value as THREE.Vector3).set(
			this.currentTheme.girlTint.r,
			this.currentTheme.girlTint.g,
			this.currentTheme.girlTint.b,
		);
		this.girlMat.uniforms.uLanternBoost.value = clamp(lanternTotalIntensity * 0.36, 0.25, 1.45);
		this.girlMat.uniforms.uArmLift.value = girlSample.armLift;
		this.girlMat.uniforms.uPalmGlow.value = girlSample.palmGlow;
		this.girlMat.uniforms.uGazePitch.value = girlSample.gazePitch;
		this.girlMat.uniforms.uBlink.value = girlSample.blinkAmount;
		this.girlMat.uniforms.uHoverGlow.value = this.girlHoverSmooth;
		this.girlMat.uniforms.uReducedMotion.value = reduced ? 1.0 : 0.0;
		(this.girlMat.uniforms.uNearbyFireflyUv.value as THREE.Vector2).set(
			clamp((fireflyFeedback.worldPos.x - this.girlBasePos.x) / this.girlPlaneWidth + 0.5, 0.0, 1.0),
			clamp((fireflyFeedback.worldPos.y - this.girlBasePos.y) / this.girlPlaneHeight + 0.5, 0.0, 1.0),
		);
		this.girlMat.uniforms.uNearbyFireflyIntensity.value = fireflyFeedback.intensity;

		this.foliageRig.update(
			this.elapsedTotal,
			1.0,
			this.currentTheme.duskBlend,
			lanternTotalIntensity,
			reduced,
		);

		_mistColor.setRGB(
			0.18 * this.currentTheme.skyTint.r +
				this.currentTheme.horizonGlow.r * this.currentTheme.horizonGlowStrength * 0.22,
			0.26 * this.currentTheme.skyTint.g +
				this.currentTheme.horizonGlow.g * this.currentTheme.horizonGlowStrength * 0.16,
			0.36 * this.currentTheme.skyTint.b,
		);
		this.mistRig.update(
			this.elapsedTotal,
			this.currentTheme.mistOpacity,
			_mistColor,
			lanternTotalIntensity,
			reduced,
		);
		this.motesRig.update(
			this.elapsedTotal,
			lanternTotalIntensity,
			this.currentTheme.duskBlend,
			reduced,
		);

		this.leavesRig.update(this.elapsedTotal, dt, reduced, (lx, lz) => {
			this.ripplePool.spawn(lx, lz, this.elapsedTotal, 0.42);
		});

		const activeRipples = this.ripplePool.getActive(this.elapsedTotal);
		const rippleUniforms = this.waterMat.uniforms.uRipples.value as THREE.Vector4[];
		for (let i = 0; i < MAX_RIPPLES; i++) {
			if (i < activeRipples.length) {
				const rp = activeRipples[i];
				rippleUniforms[i].set(rp.x, rp.z, rp.startTime, rp.strength);
			} else {
				rippleUniforms[i].set(0, 0, -100, 0);
			}
		}
		this.waterMat.uniforms.uTime.value = this.elapsedTotal;
		this.waterMat.uniforms.uDuskBlend.value = this.currentTheme.duskBlend;
		(this.waterMat.uniforms.uWaterBase.value as THREE.Vector3).set(
			this.currentTheme.waterBase.r * this.currentTheme.waterBase.r,
			this.currentTheme.waterBase.g * this.currentTheme.waterBase.g,
			this.currentTheme.waterBase.b * this.currentTheme.waterBase.b,
		);
		(this.waterMat.uniforms.uSkyTint.value as THREE.Vector3).set(
			this.currentTheme.skyTint.r,
			this.currentTheme.skyTint.g,
			this.currentTheme.skyTint.b,
		);
		(this.waterMat.uniforms.uHorizonGlow.value as THREE.Vector3).set(
			this.currentTheme.horizonGlow.r * this.currentTheme.horizonGlow.r,
			this.currentTheme.horizonGlow.g * this.currentTheme.horizonGlow.g,
			this.currentTheme.horizonGlow.b * this.currentTheme.horizonGlow.b,
		);
		this.waterMat.uniforms.uHorizonStrength.value = this.currentTheme.horizonGlowStrength;
		this.waterMat.uniforms.uReflectionStrength.value = this.currentTheme.waterReflectionStrength;
		this.waterMat.uniforms.uMoonShimmer.value = this.currentTheme.waterMoonShimmer;
		this.waterMat.uniforms.uLanternIntensity.value = lanternTotalIntensity;
		this.waterMat.uniforms.uPalmGlow.value = girlSample.palmGlow;
		this.waterMat.uniforms.uRibbonGlow.value = eggSample.ribbonFormation;

		// PASS 1: 实时平面反射
		this.reflectionCamera.fov = this.camera.fov;
		this.reflectionCamera.aspect = this.camera.aspect;
		this.reflectionCamera.near = this.camera.near;
		this.reflectionCamera.far = this.camera.far;
		this.reflectionCamera.updateProjectionMatrix();
		this.reflectionCamera.position.set(
			this.camera.position.x,
			-this.camera.position.y,
			this.camera.position.z,
		);
		this.reflectionCamera.lookAt(_camLookTarget.x, -_camLookTarget.y, _camLookTarget.z);
		this.reflectionCamera.updateMatrixWorld();

		_reflTextureMatrix.copy(_biasMatrix);
		_reflTextureMatrix.multiply(this.reflectionCamera.projectionMatrix);
		_reflTextureMatrix.multiply(this.reflectionCamera.matrixWorldInverse);
		(this.waterMat.uniforms.uTextureMatrix.value as THREE.Matrix4).copy(_reflTextureMatrix);

		this.waterMesh.visible = false;
		this.foliageRig.group.visible = false;
		this.motesRig.points.visible = false;
		this.lightShaftsMesh.visible = false;
		this.renderer.clippingPlanes = [_waterClipPlane];
		this.renderer.setRenderTarget(this.reflectionRT);
		this.renderer.clear();
		this.renderer.render(this.scene, this.reflectionCamera);
		this.renderer.setRenderTarget(null);
		this.renderer.clippingPlanes = [];
		this.waterMesh.visible = true;
		this.foliageRig.group.visible = true;
		this.motesRig.points.visible = true;
		this.lightShaftsMesh.visible = true;

		// PASS 2: HDR 后期渲染 + 光学景深柔焦 + ACES Filmic 调色
		this.pipeline.setOpticalBlur(this.blurCurrent, this.dimCurrent);
		this.pipeline.update(
			this.elapsedTotal,
			this.currentTheme,
			girlSample.palmGlow * 0.6 + eggSample.lanternBoost * 0.65,
		);
		this.pipeline.render();

		const totalRipples = this.ripplePool.getTotalSpawned();
		if (
			girlSample.phase !== this.state.girlPhase ||
			eggSample.state !== this.state.easterEggState ||
			eggSample.clickCount !== this.state.lanternClicks ||
			totalRipples !== this.state.rippleTotal
		) {
			this.emit({
				girlPhase: girlSample.phase,
				easterEggState: eggSample.state,
				lanternClicks: eggSample.clickCount,
				rippleTotal: totalRipples,
			});
		}
	}

	// ========================================================================
	// 对外控制接口
	// ========================================================================

	setCameraTransition(progress: number): void {
		const next = clamp(progress, 0, 1);
		this.transitionTarget = next;
		if (this.state.reducedMotion) {
			this.transitionCurrent = next;
		}
		this.emit({ cameraTransition: next });
	}

	setOpticalBlur(blur: number, dim: number): void {
		const nextBlur = clamp(blur, 0, 1);
		const nextDim = clamp(dim, 0, 1);
		this.blurTarget = nextBlur;
		this.dimTarget = nextDim;
		if (this.state.reducedMotion) {
			this.blurCurrent = nextBlur;
			this.dimCurrent = nextDim;
		}
		this.emit({ opticalBlur: nextBlur, opticalDim: nextDim });
	}

	setInteractionMode(mode: InteractionMode): void {
		const patch: Partial<FireflySceneState> = { interactionMode: mode };
		if (mode !== "launch") {
			this.wheelZoomTarget = 0;
			if (this.state.hoverTarget !== "none") {
				patch.hoverTarget = "none";
			}
		}
		this.emit(patch);
	}

	setTimeOfDay(phase: TimeOfDay): void {
		if (!(phase in TIME_THEMES)) return;
		this.emit({ timeOfDay: phase });
		this.syncDocumentPhase();
	}

	setQuality(quality: SceneQuality): void {
		this.emit({ quality });
		if (quality !== "static") {
			this.handleResize();
		}
		this.syncLoopState();
	}

	setReducedMotion(reduced: boolean): void {
		this.emit({ reducedMotion: reduced });
	}

	async setAudioEnabled(enabled: boolean): Promise<boolean> {
		const result = await this.audioEngine.setEnabled(enabled);
		this.emit({ audioEnabled: result });
		return result;
	}

	triggerGirl(): boolean {
		const started = this.girlCtrl.trigger();
		if (started) {
			this.audioEngine.playGirlFireflyChime();
		}
		return started;
	}

	triggerLantern(): { triggered: boolean; clickCount: number } {
		const res = this.easterEggCtrl.registerClick(this.elapsedTotal);
		if (res.triggered) {
			this.audioEngine.playEasterEggBloom();
			this.ripplePool.spawn(-1.2, -5.0, this.elapsedTotal, 1.15);
		} else {
			this.audioEngine.playLanternTap(res.clickCount);
		}
		return res;
	}

	spawnRipple(x = -1.6, z = -3.6, strength = 1.0): void {
		this.ripplePool.spawn(x, z, this.elapsedTotal, strength);
		this.audioEngine.playWaterRipple();
	}

	dispose(): void {
		this.disposed = true;
		if (this.frameId) {
			cancelAnimationFrame(this.frameId);
			window.clearTimeout(this.frameId);
			this.frameId = 0;
		}
		this.unbindEvents();
		this.audioEngine.dispose();

		for (const item of this.extraDisposables) {
			item.dispose();
		}
		this.extraDisposables = [];

		this.pierRig?.dispose();
		this.lanternRig?.dispose();
		this.foliageRig?.dispose();
		this.fireflyRig?.dispose();
		this.mistRig?.dispose();
		this.motesRig?.dispose();
		this.leavesRig?.dispose();
		for (const tex of this.loadedTextures) {
			tex.dispose();
		}
		this.loadedTextures = [];
		this.reflectionRT?.dispose();
		this.pipeline?.dispose();
		this.envRT?.dispose();

		if (this.renderer) {
			const domCanvas = this.renderer.domElement;
			this.renderer.dispose();
			if (this.container && domCanvas.parentNode === this.container) {
				this.container.removeChild(domCanvas);
			}
		}

		this.renderer = null;
		this.scene = null;
		this.camera = null;
		this.reflectionCamera = null;
		this.reflectionRT = null;
		this.pipeline = null;
		this.envRT = null;
		this.backdropMat = null;
		this.shoreMat = null;
		this.lightShaftsMat = null;
		this.lightShaftsMesh = null;
		this.waterMat = null;
		this.waterMesh = null;
		this.girlMat = null;
		this.hemiLight = null;
		this.keyLight = null;
		this.fireflyPointLight = null;
		this.pierRig = null;
		this.lanternRig = null;
		this.foliageRig = null;
		this.fireflyRig = null;
		this.mistRig = null;
		this.motesRig = null;
		this.leavesRig = null;
		this.interactables = [];
		this.container = null;
		this.emit({ mounted: false, paused: true, hoverTarget: "none" });
	}
}
