import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vaultRoot = path.resolve(
	process.env.OBSIDIAN_VAULT ?? "/mnt/c/Users/Sanzenin/Documents/Obsidian Vault",
);
const postsRoot = path.join(projectRoot, "shirones/content/posts/obsidian");
const assetsRoot = path.join(projectRoot, "public/obsidian");
const ignoredDirectories = new Set([".obsidian", ".trash", ".playwright-mcp"]);
const secretPatterns = [
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
	/\b(?:sk|pk|rk)-[A-Za-z0-9]{20,}\b/,
	/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
	/\bcfat_[A-Za-z0-9_-]{30,}\b/,
	/\bAKIA[0-9A-Z]{16}\b/,
	/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
];

async function walk(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (ignoredDirectories.has(entry.name)) continue;
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walk(fullPath)));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

function splitFrontmatter(text) {
	if (!text.startsWith("---\n")) return { metadata: {}, body: text };
	const end = text.indexOf("\n---", 4);
	if (end === -1) return { metadata: {}, body: text };
	const metadata = parseYaml(text.slice(4, end)) ?? {};
	return {
		metadata,
		body: text.slice(end + 4).replace(/^\n+/, ""),
	};
}

function slugify(value) {
	const slug = value
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "note";
}

function normalizeDate(value) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === "string" || typeof value === "number") {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
	}
	return null;
}

function firstHeading(body) {
	const match = body.match(/^#\s+(.+)$/m);
	return match ? match[1].replace(/[*_`]/g, "").trim() : "";
}

function plainDescription(body, title) {
	const text = body
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\$\$[\s\S]*?\$\$/g, " ")
		.replace(/\$[^$\n]+\$/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/^#{1,6}\s+.*$/gm, " ")
		.replace(/^>\s?/gm, "")
		.replace(/^---+$/gm, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/[*_`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	const summary = text.slice(0, 160).trim();
	return summary || `${title} 的笔记。`;
}

function assertNoSecrets(relativePath, body) {
	for (const pattern of secretPatterns) {
		if (pattern.test(body)) {
			throw new Error(`检测到疑似密钥：${relativePath}，同步已停止`);
		}
	}
}

function mapOutsideCode(text, transform) {
	return text
		.split(/(```[\s\S]*?```|`[^`\n]+`)/g)
		.map((part, index) => (index % 2 === 0 ? transform(part) : part))
		.join("");
}

function markdownAlt(value, fallback) {
	return (value || fallback).replace(/[[\]]/g, "").trim();
}

function normalizeTags(metadata, category) {
	const raw = Array.isArray(metadata.tags)
		? metadata.tags
		: typeof metadata.tags === "string"
			? metadata.tags.split(/[,，]/)
			: [];
	const tags = [...raw, category, "Obsidian"]
		.map((tag) => String(tag).replace(/^#/, "").trim())
		.filter(Boolean);
	return [...new Set(tags)].slice(0, 8);
}

async function main() {
	const allFiles = await walk(vaultRoot);
	const noteFiles = allFiles.filter((file) => file.endsWith(".md"));
	const attachmentFiles = allFiles.filter((file) => !file.endsWith(".md"));
	const attachments = new Map();
	const attachmentsByPath = new Map();

	for (const file of attachmentFiles) {
		const name = path.basename(file);
		if (attachments.has(name)) {
			throw new Error(`附件重名，无法安全生成固定 URL：${name}`);
		}
		attachments.set(name, file);
		attachmentsByPath.set(path.relative(vaultRoot, file).replaceAll("\\", "/"), file);
	}

	const notes = [];
	for (const file of noteFiles) {
		const relativePath = path.relative(vaultRoot, file);
		const text = await fs.readFile(file, "utf8");
		const { metadata, body } = splitFrontmatter(text);
		assertNoSecrets(relativePath, body);
		const title =
			String(metadata.title ?? "").trim() || firstHeading(body) || path.basename(file, ".md");
		const folder = relativePath.split(path.sep)[0];
		const category = relativePath.includes(path.sep) ? folder : "笔记";
		const date =
			normalizeDate(metadata.published ?? metadata.date ?? metadata.created) ??
			(await fs.stat(file)).mtime.toISOString().slice(0, 10);
		const slug = slugify(path.basename(file, ".md"));
		notes.push({
			file,
			relativePath,
			title,
			category,
			date,
			slug,
			body,
			metadata,
			tags: normalizeTags(metadata, category),
		});
	}

	const seenSlugs = new Map();
	for (const note of notes) {
		const count = seenSlugs.get(note.slug) ?? 0;
		seenSlugs.set(note.slug, count + 1);
		if (count > 0) {
			const hash = createHash("sha1").update(note.relativePath).digest("hex").slice(0, 6);
			note.slug = `${note.slug}-${hash}`;
		}
	}

	const noteLinks = new Map();
	for (const note of notes) {
		const url = `/posts/obsidian/${encodeURIComponent(note.slug)}/`;
		note.url = url;
		noteLinks.set(path.basename(note.file, ".md").toLowerCase(), url);
		noteLinks.set(note.relativePath.replace(/\.md$/i, "").toLowerCase(), url);
	}

	const copiedAssets = new Map();
	const missingAttachments = new Set();

	async function copyAttachment(name) {
		const normalizedName = path.basename(name);
		if (copiedAssets.has(normalizedName)) return copiedAssets.get(normalizedName);
		const source =
			attachments.get(normalizedName) ??
			attachmentsByPath.get(name.replaceAll("\\", "/")) ??
			attachmentsByPath.get(`attachments/${name.replaceAll("\\", "/")}`);
		if (!source) {
			missingAttachments.add(name);
			return null;
		}
		const target = path.join(assetsRoot, normalizedName);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.copyFile(source, target);
		const url = `/obsidian/${encodeURIComponent(normalizedName)}`;
		copiedAssets.set(normalizedName, url);
		return url;
	}

	function rewriteLinks(body) {
		return mapOutsideCode(body, (segment) =>
			segment
				.replace(/!\[\[([^\]]+)\]\]/g, (_, inner) => {
					const [targetPart, ...aliasParts] = inner.split("|");
					const target = targetPart.split("#")[0].trim();
					return `[[image:${target}|${aliasParts.join("|")}]]`;
				})
				.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
					const [targetPart, ...labelParts] = inner.split("|");
					const [rawTarget, rawAnchor] = targetPart.split("#");
					const target = rawTarget.trim();
					const anchor = rawAnchor?.trim() ?? "";
					const label = labelParts.join("|").trim();
					if (target.startsWith("image:")) {
						const name = target.slice("image:".length);
						const alt = markdownAlt(label, path.basename(name, path.extname(name)));
						return `[[asset:${name}|${alt}]]`;
					}
					if (!target) {
						return `[${label || anchor}](#${slugify(anchor)})`;
					}
					const noteUrl =
						noteLinks.get(target.toLowerCase()) ??
						noteLinks.get(target.replace(/\.md$/i, "").toLowerCase());
					if (noteUrl) {
						return `[${label || target}](${noteUrl}${anchor ? `#${slugify(anchor)}` : ""})`;
					}
					const attachmentUrl = attachments.has(target)
						? `/obsidian/${encodeURIComponent(target)}`
						: null;
					if (attachmentUrl) return `[${label || target}](${attachmentUrl})`;
					return label || target;
				})
				.replace(/\[\[asset:([^|\]]+)\|([^\]]*)\]\]/g, (_, name, alt) => {
					if (!attachments.has(name)) {
						missingAttachments.add(name);
						return `\`[图片缺失：${name}]\``;
					}
					return `![${markdownAlt(alt, path.basename(name, path.extname(name)))}]([[pending:${name}]])`;
				})
				.replace(
					/\[\[pending:([^\]]+)\]\]/g,
					(_, name) => `/obsidian/${encodeURIComponent(name)}`,
				)
				.replace(/\]\((?:\.\.\/)*attachments\/([^)]+)\)/g, (_, name) => {
					const decoded = decodeURIComponent(name);
					const basename = path.basename(decoded);
					if (!attachments.has(basename)) {
						missingAttachments.add(decoded);
						return `](${name})`;
					}
					return `](/obsidian/${encodeURIComponent(basename)})`;
				}),
		);
	}

	await fs.rm(postsRoot, { recursive: true, force: true });
	await fs.rm(assetsRoot, { recursive: true, force: true });
	await fs.mkdir(postsRoot, { recursive: true });
	await fs.mkdir(assetsRoot, { recursive: true });

	for (const note of notes) {
		const body = rewriteLinks(note.body)
			.replace(/%%[\s\S]*?%%/g, "")
			.replace(/[ \t]+\n/g, "\n")
			.trim();

		const imageEmbed = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
		const image = imageEmbed?.[1]?.startsWith("/obsidian/") ? imageEmbed[1] : "";
		const summary = plainDescription(body, note.title);
		const description =
			String(note.metadata.description ?? "").trim() ||
			(summary.length >= 40 ? summary : `${note.title}，来自 Obsidian 的${note.category}笔记。`);
		const frontmatter = stringifyYaml(
			{
				title: note.title,
				published: note.date,
				description,
				image,
				tags: note.tags,
				category: note.category,
				lang: "zh_CN",
				draft: false,
			},
			{ lineWidth: 0 },
		);
		const output = `---\n${frontmatter}---\n\n<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->\n\n${body}\n`;
		await fs.writeFile(path.join(postsRoot, `${note.slug}.md`), output, "utf8");
		for (const match of body.matchAll(/\]\((?:\/obsidian\/)([^)]+)\)/g)) {
			await copyAttachment(decodeURIComponent(match[1]));
		}
	}

	console.log({
		vaultRoot,
		notes: notes.length,
		assets: copiedAssets.size,
		missingAttachments: [...missingAttachments],
		output: postsRoot,
	});
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
