<script lang="ts">
import { onMount } from "svelte";
import {
	initLiquidGlassCapability,
	populateDisplacementMaps,
	type LiquidGlassCapability,
} from "../../lib/liquid-glass/index.ts";

let {
	mapSize = 256,
	onCapabilityChange,
}: {
	mapSize?: number;
	onCapabilityChange?: (capability: LiquidGlassCapability) => void;
} = $props();

let svgEl = $state<SVGSVGElement>();

onMount(() => {
	let mapsBaked = false;
	const ensureMaps = (capability: LiquidGlassCapability) => {
		if (capability.refractMode === "svg" && !mapsBaked && svgEl) {
			mapsBaked = populateDisplacementMaps(svgEl, mapSize);
		}
		onCapabilityChange?.(capability);
	};

	const cleanup = initLiquidGlassCapability(document.documentElement, ensureMaps);
	return () => {
		cleanup();
	};
});
</script>

<svg
	bind:this={svgEl}
	id="lg-svg-defs"
	aria-hidden="true"
	focusable="false"
	style="position:fixed;width:0;height:0;overflow:hidden;pointer-events:none"
>
	<defs>
		<!-- Launch 主透镜：凸面 Fresnel 折射 + 轻微微色散（仅用于单一核心 CTA） -->
		<filter id="lg-refract-lens" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
			<feImage id="lg-map-lens" href="" preserveAspectRatio="none" result="dispMap" />
			<feDisplacementMap
				in="SourceGraphic"
				in2="dispMap"
				scale="22"
				xChannelSelector="R"
				yChannelSelector="G"
				result="rBase"
			/>
			<feOffset in="rBase" dx="0.6" dy="0" result="rShift" />
			<feColorMatrix
				in="rShift"
				type="matrix"
				values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="chR"
			/>
			<feColorMatrix
				in="rBase"
				type="matrix"
				values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="chG"
			/>
			<feOffset in="rBase" dx="-0.6" dy="0" result="bShift" />
			<feColorMatrix
				in="bShift"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
				result="chB"
			/>
			<feBlend in="chR" in2="chG" mode="screen" result="chRG" />
			<feBlend in="chRG" in2="chB" mode="screen" result="chroma" />
			<feGaussianBlur in="chroma" stdDeviation="1.4" result="soft" />
			<feColorMatrix in="soft" type="saturate" values="1.75" />
		</filter>

		<!-- Dock 与悬浮胶囊 -->
		<filter id="lg-refract-pill" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
			<feImage id="lg-map-pill" href="" preserveAspectRatio="none" result="dispMap" />
			<feDisplacementMap
				in="SourceGraphic"
				in2="dispMap"
				scale="16"
				xChannelSelector="R"
				yChannelSelector="G"
				result="refracted"
			/>
			<feGaussianBlur in="refracted" stdDeviation="2.0" result="soft" />
			<feColorMatrix in="soft" type="saturate" values="1.65" />
		</filter>

		<!-- 悬浮导航、弹窗与气泡 -->
		<filter id="lg-refract-chrome" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
			<feImage id="lg-map-chrome" href="" preserveAspectRatio="none" result="dispMap" />
			<feDisplacementMap
				in="SourceGraphic"
				in2="dispMap"
				scale="12"
				xChannelSelector="R"
				yChannelSelector="G"
				result="refracted"
			/>
			<feGaussianBlur in="refracted" stdDeviation="2.4" result="soft" />
			<feColorMatrix in="soft" type="saturate" values="1.55" />
		</filter>

		<!-- 桌面端工作区面板边缘 -->
		<filter id="lg-refract-panel" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
			<feImage id="lg-map-panel" href="" preserveAspectRatio="none" result="dispMap" />
			<feDisplacementMap
				in="SourceGraphic"
				in2="dispMap"
				scale="8"
				xChannelSelector="R"
				yChannelSelector="G"
				result="refracted"
			/>
			<feGaussianBlur in="refracted" stdDeviation="2.8" result="soft" />
			<feColorMatrix in="soft" type="saturate" values="1.45" />
		</filter>

		<!-- 卫星胶囊纯轮廓液态桥接（仅用于背景几何轮廓层，严禁用于文本） -->
		<filter id="lg-metaball-bridge" color-interpolation-filters="sRGB">
			<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
			<feColorMatrix
				in="blur"
				type="matrix"
				values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
				result="goo"
			/>
		</filter>
	</defs>
</svg>
