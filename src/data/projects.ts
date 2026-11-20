export interface ProjectRecord {
	name: string;
	description: string;
	url: string;
	homepageUrl: string | null;
	primaryLanguage: string | null;
	stargazerCount: number;
	updatedAt: string;
	topics: string[];
	featured?: boolean;
}

// 来自 `gh repo list wlz6 --visibility public` 的真实公开仓库清单
export const projects: readonly ProjectRecord[] = [
	{
		name: "sanzenin-blog",
		description: "Sanzenin 凪的个人博客，基于 Shirone 与 Cloudflare Pages。",
		url: "https://github.com/wlz6/sanzenin-blog",
		homepageUrl: "https://sanzenin.top",
		primaryLanguage: "TypeScript",
		stargazerCount: 0,
		updatedAt: "2026-11-16T13:02:14Z",
		topics: ["astro", "svelte", "cloudflare-pages"],
		featured: true,
	},
	{
		name: "cf-coach",
		description: "A production-ready terminal TUI algorithm thinking coach for Codeforces with LLM, Rich, and Glow.",
		url: "https://github.com/wlz6/cf-coach",
		homepageUrl: null,
		primaryLanguage: "Python",
		stargazerCount: 0,
		updatedAt: "2026-09-21T12:49:48Z",
		topics: ["codeforces", "tui", "llm"],
		featured: true,
	},
	{
		name: "dsh-ide-ipc",
		description: "DeepSeek Harness IDE IPC plugin for multi-IDE context, dsh-tui, and Web.",
		url: "https://github.com/wlz6/dsh-ide-ipc",
		homepageUrl: null,
		primaryLanguage: "JavaScript",
		stargazerCount: 0,
		updatedAt: "2026-08-20T20:01:29Z",
		topics: ["dsh-plugin"],
		featured: true,
	},
	{
		name: "nvim-context-ipc",
		description: "Neovim IDE context provider for Codex CLI and Claude Code.",
		url: "https://github.com/wlz6/nvim-context-ipc",
		homepageUrl: null,
		primaryLanguage: "Lua",
		stargazerCount: 0,
		updatedAt: "2026-08-20T20:01:19Z",
		topics: ["neovim", "ipc"],
	},
	{
		name: "upc-latex-typesetter",
		description:
			"中国石油大学（华东）课程作业、实训、课程设计、本科毕业设计（论文）LaTeX 排版助手，支持自动生成封面、目录、正文、参考文献与 XeLaTeX 编译验证。",
		url: "https://github.com/wlz6/upc-latex-typesetter",
		homepageUrl: null,
		primaryLanguage: "Python",
		stargazerCount: 1,
		updatedAt: "2026-07-06T14:02:07Z",
		topics: ["latex", "xelatex"],
		featured: true,
	},
	{
		name: "SanzeninMind",
		description: "跟随 MiniMind 从零实现小语言模型的学习与实验仓库。",
		url: "https://github.com/wlz6/SanzeninMind",
		homepageUrl: null,
		primaryLanguage: "Python",
		stargazerCount: 0,
		updatedAt: "2026-08-10T17:47:04Z",
		topics: ["llm", "minimind"],
	},
	{
		name: "cp-editorial-skill",
		description: "用于个人整理、沉淀和复习算法竞赛题解的 Codex / Claude Code skill。",
		url: "https://github.com/wlz6/cp-editorial-skill",
		homepageUrl: null,
		primaryLanguage: null,
		stargazerCount: 0,
		updatedAt: "2026-07-21T09:15:12Z",
		topics: ["competitive-programming", "skill"],
	},
	{
		name: "sanzenin_vllm",
		description: "Python 开源仓库（wlz6/sanzenin_vllm）。",
		url: "https://github.com/wlz6/sanzenin_vllm",
		homepageUrl: null,
		primaryLanguage: "Python",
		stargazerCount: 0,
		updatedAt: "2026-08-17T17:09:11Z",
		topics: [],
	},
	{
		name: "SanzeninCode",
		description: "Go 语言开源仓库（wlz6/SanzeninCode）。",
		url: "https://github.com/wlz6/SanzeninCode",
		homepageUrl: null,
		primaryLanguage: "Go",
		stargazerCount: 0,
		updatedAt: "2026-08-02T11:28:46Z",
		topics: [],
	},
];
