import type { AboutConfig } from "@/types/aboutConfig.ts";
import { withUserConfig } from "@/utils/config-overlay.ts";

export const aboutConfig: AboutConfig = withUserConfig("about", {
	enable: true,
	title: "$t:about",
	description: "关于 Sanzenin 凪与这个博客：写作方向、技术栈与联系方式。",
});
