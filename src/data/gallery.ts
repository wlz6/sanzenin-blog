export interface GalleryItem {
	id: string;
	title: string;
	caption: string;
	src: string;
	category: "scene" | "scenery" | "diagram";
	aspect: "landscape" | "portrait" | "wide";
	relatedPostSlug?: string;
}

// 全部条目均对应站点 public/ 下实际存在的视觉资产与技术图解
export const galleryItems: readonly GalleryItem[] = [
	{
		id: "firefly-lake-full",
		title: "萤火眠于湖 · 全景合成",
		caption: "湖光、林岸、静坐少女与提灯暖晕构成的夜色主景。",
		src: "/scenes/firefly-lake/firefly-lake-fallback.webp",
		category: "scene",
		aspect: "wide",
	},
	{
		id: "firefly-lake-panorama",
		title: "静湖夜空全景层",
		caption: "月色天穹与远山湖面基底层，为实时水波与反射提供光场。",
		src: "/scenes/firefly-lake/lake-panorama.webp",
		category: "scene",
		aspect: "wide",
	},
	{
		id: "firefly-lake-forest",
		title: "湖畔林岸与木步道前景",
		caption: "深青林影与水面边界构成的景深层次。",
		src: "/scenes/firefly-lake/forest-shores.webp",
		category: "scene",
		aspect: "landscape",
	},
	{
		id: "firefly-lake-girl",
		title: "湖畔静坐少女图层",
		caption: "独立抠像人物与暖色提灯主体，随视角产生轻微视差与呼吸律动。",
		src: "/scenes/firefly-lake/girl-sitting.webp",
		category: "scene",
		aspect: "portrait",
	},
	{
		id: "site-banner",
		title: "Sanzenin 凪 · 夜海封面",
		caption: "站点主视觉与默认 OpenGraph 抽象夜海横幅。",
		src: "/images/banner.png",
		category: "scene",
		aspect: "wide",
		relatedPostSlug: "welcome",
	},
	{
		id: "scenery-window-sun",
		title: "窗边晚霞",
		caption: "室内窗框透入的暮色光线切片。",
		src: "/images/moments/night/window-sun.webp",
		category: "scenery",
		aspect: "landscape",
	},
	{
		id: "scenery-1",
		title: "暮色远景 · 一",
		caption: "光影与云层记录。",
		src: "/images/moments/scenery/scene-1.webp",
		category: "scenery",
		aspect: "landscape",
	},
	{
		id: "scenery-2",
		title: "暮色远景 · 二",
		caption: "低饱和天际线静景。",
		src: "/images/moments/scenery/scene-2.webp",
		category: "scenery",
		aspect: "landscape",
	},
	{
		id: "diagram-rope-wavelengths",
		title: "RoPE 旋转位置编码波长分布",
		caption: "MiniMind 学习笔记中的 RoPE 频率尺度与外推特性图解。",
		src: "/obsidian/rope_wavelengths.png",
		category: "diagram",
		aspect: "landscape",
		relatedPostSlug: "obsidian/minimind从零实现小语言模型",
	},
	{
		id: "diagram-rope-yarn",
		title: "YaRN 长度外推相位示意",
		caption: "高频与低频维度在上下文扩展中的相位插值曲线。",
		src: "/obsidian/rope_yarn_phase.png",
		category: "diagram",
		aspect: "landscape",
		relatedPostSlug: "obsidian/minimind从零实现小语言模型",
	},
	{
		id: "diagram-virtual-tree",
		title: "虚树构造完成示意图",
		caption: "关键点按 DFS 序排序并连边后的压缩树结构。",
		src: "/obsidian/虚树_步骤3_完成的虚树.png",
		category: "diagram",
		aspect: "landscape",
		relatedPostSlug: "obsidian/虚树",
	},
	{
		id: "diagram-lipschitz",
		title: "Lipschitz 连续性几何图解",
		caption: "函数斜率受双锥边界约束的直观示意。",
		src: "/obsidian/lipschitz_diagram.png",
		category: "diagram",
		aspect: "landscape",
	},
];
