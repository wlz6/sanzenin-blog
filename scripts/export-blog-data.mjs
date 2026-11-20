import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { Marked } from "marked";
import readingTime from "reading-time";
import { FilterXSS } from "xss";
import { parse as parseYaml } from "yaml";
import { galleryItems } from "../src/data/gallery.ts";
import { projects } from "../src/data/projects.ts";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const POSTS_DIR = join(PROJECT_ROOT, "shirones/content/posts");
const ABOUT_PATH = join(PROJECT_ROOT, "shirones/content/spec/about.md");
const PUBLIC_DIR = join(PROJECT_ROOT, "public");
const OUTPUT_PATH = join(PUBLIC_DIR, "data/blog-index.json");

const aboutMarked = new Marked({ gfm: true, breaks: false });
const aboutSanitizer = new FilterXSS({
	whiteList: {
		h1: [],
		h2: [],
		h3: [],
		h4: [],
		p: [],
		br: [],
		strong: [],
		em: [],
		code: [],
		pre: [],
		blockquote: [],
		ul: [],
		ol: [],
		li: [],
		a: ["href", "title", "rel", "target"],
		hr: [],
	},
	stripIgnoreTag: true,
	stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
	allowCommentTag: false,
	css: false,
});

function walkMarkdownFiles(dir) {
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkMarkdownFiles(full));
		} else if (entry.isFile()) {
			const ext = extname(entry.name).toLowerCase();
			if (ext === ".md" || ext === ".mdx") {
				results.push(full);
			}
		}
	}
	return results.sort();
}

function splitFrontmatter(raw, filePath) {
	const match = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(raw);
	if (match?.index !== 0) {
		throw new Error(`文章缺少有效 YAML frontmatter：${filePath}`);
	}
	const metadata = parseYaml(match[1]) ?? {};
	const body = raw.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)+/, "");
	return { metadata, body };
}

function normalizeDate(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

function stripToExcerpt(markdown, maxLen = 180) {
	const plain = markdown
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/\$\$[\s\S]*?\$\$/g, " ")
		.replace(/^#{1,6}\s+.*$/gm, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
		.replace(/\\le\b/g, "≤")
		.replace(/\\ge\b/g, "≥")
		.replace(/\\times\b/g, "×")
		.replace(/\\cdot\b/g, "·")
		.replace(/\\[a-zA-Z]+/g, " ")
		.replace(/[${}*_`>#]/g, " ")
		.replace(/\s+/gu, " ")
		.trim();
	const chars = [...plain];
	if (chars.length <= maxLen) return plain;
	return `${chars.slice(0, maxLen).join("").trimEnd()}…`;
}

function hasBrokenMathGaps(text) {
	return (
		/\p{Script=Han}\s+[个次位倍棵项点种为的与且则及于到在和、，。；：]|[为有按到和与：:]\s+[,，。；]|\s+[与且则及]\s+[，。]/u.test(
			text,
		)
	);
}

function normalizeSlugFromPath(filePath) {
	const rel = relative(POSTS_DIR, filePath).replaceAll("\\", "/");
	return rel.replace(/\.(md|mdx)$/i, "");
}

function buildPostUrl(slug) {
	const clean = slug.replace(/^\/+|\/+$/g, "");
	return `/posts/${clean}/`;
}

function readAllPosts() {
	const files = walkMarkdownFiles(POSTS_DIR);
	const posts = [];
	for (const filePath of files) {
		const raw = readFileSync(filePath, "utf8");
		const { metadata, body } = splitFrontmatter(raw, filePath);
		if (metadata.draft === true) continue;

		const slug = normalizeSlugFromPath(filePath);
		const title = typeof metadata.title === "string" ? metadata.title.trim() : "";
		const published = normalizeDate(metadata.published);
		if (!title || !published) {
			throw new Error(`文章缺少 title 或 published：${filePath}`);
		}
		const updated = normalizeDate(metadata.updated);
		const rawDescription = typeof metadata.description === "string"
			? metadata.description.replace(/\s+/gu, " ").trim()
			: "";
		const excerpt = stripToExcerpt(body, 180);
		const description = rawDescription && !hasBrokenMathGaps(rawDescription)
			? rawDescription
			: excerpt || rawDescription || title;

		const category = typeof metadata.category === "string" ? metadata.category.trim() : "";
		const tags = Array.isArray(metadata.tags)
			? [...new Set(metadata.tags.map((item) => String(item).trim()).filter(Boolean))]
			: [];
		const image = typeof metadata.image === "string" && metadata.image.trim()
			? metadata.image.trim()
			: null;

		const stats = readingTime(body);
		const words = Math.max(1, stats.words);
		const readingMinutes = Math.max(1, Math.round(stats.minutes));

		posts.push({
			slug,
			title,
			published,
			updated,
			description,
			excerpt,
			category,
			tags,
			readingMinutes,
			words,
			image,
			url: buildPostUrl(slug),
			prev: null,
			next: null,
		});
	}

	posts.sort((a, b) => {
		if (a.published !== b.published) return b.published.localeCompare(a.published);
		return a.slug.localeCompare(b.slug);
	});

	for (let index = 0; index < posts.length; index++) {
		const newer = index > 0 ? posts[index - 1] : null;
		const older = index + 1 < posts.length ? posts[index + 1] : null;
		posts[index].next = newer ? { slug: newer.slug, title: newer.title, url: newer.url } : null;
		posts[index].prev = older ? { slug: older.slug, title: older.title, url: older.url } : null;
	}

	return posts;
}

function aggregateTaxonomy(posts) {
	const categoryCounts = new Map();
	const tagCounts = new Map();
	for (const post of posts) {
		if (post.category) {
			categoryCounts.set(post.category, (categoryCounts.get(post.category) ?? 0) + 1);
		}
		for (const tag of post.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}
	const sortEntries = (entries) =>
		entries
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));

	return {
		categories: sortEntries([...categoryCounts.entries()]),
		tags: sortEntries([...tagCounts.entries()]),
	};
}

function readAbout() {
	const markdown = readFileSync(ABOUT_PATH, "utf8").trim();
	const headingMatch = /^#\s+(.+)$/m.exec(markdown);
	const title = headingMatch ? headingMatch[1].trim() : "关于 Sanzenin 凪";
	const rendered = aboutMarked.parse(markdown);
	if (typeof rendered !== "string") {
		throw new Error("marked.parse failed while rendering about.md");
	}
	const html = aboutSanitizer.process(rendered).trim();
	return { title, markdown, html };
}

function verifyGalleryAssets() {
	for (const item of galleryItems) {
		const relativeAsset = item.src.replace(/^\/+/, "");
		const fullPath = join(PUBLIC_DIR, relativeAsset);
		if (!existsSync(fullPath)) {
			throw new Error(`画廊引用的静态资源不存在：${item.src}（解析路径：${fullPath}）`);
		}
	}
}

export function exportBlogIndex({ outputPath = OUTPUT_PATH } = {}) {
	verifyGalleryAssets();
	const posts = readAllPosts();
	const { categories, tags } = aggregateTaxonomy(posts);
	const about = readAbout();

	const payload = {
		generatedAt: new Date().toISOString(),
		site: {
			title: "Sanzenin 凪",
			subtitle: "Sanzenin 凪的个人博客，记录技术、阅读与日常。",
			author: "Sanzenin 凪",
			bio: "在代码、文字与海风之间，记录一些值得留下的东西。",
			githubUrl: "https://github.com/wlz6",
			siteUrl: "https://sanzenin.top",
		},
		stats: {
			posts: posts.length,
			categories: categories.length,
			tags: tags.length,
			projects: projects.length,
			gallery: galleryItems.length,
		},
		posts,
		categories,
		tags,
		about,
		aboutHtml: about.html,
		projects: [...projects],
		gallery: [...galleryItems],
	};

	mkdirSync(resolve(outputPath, ".."), { recursive: true });
	writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	return payload;
}

if (import.meta.main) {
	const result = exportBlogIndex();
	console.log(
		JSON.stringify({
			output: OUTPUT_PATH,
			stats: result.stats,
		}),
	);
}
