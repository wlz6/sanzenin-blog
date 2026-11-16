# Obsidian 笔记同步

站点通过 `scripts/sync-obsidian.mjs` 将 Obsidian Vault 中的 Markdown 笔记转换为 Shirone 文章。

## 使用

默认读取 `/mnt/c/Users/Sanzenin/Documents/Obsidian Vault`：

```bash
pnpm sync:obsidian
```

也可以通过环境变量指定其他 Vault：

```bash
OBSIDIAN_VAULT="/path/to/vault" pnpm sync:obsidian
```

同步会生成：

- `shirones/content/posts/obsidian/*.md`：文章正文、标题、日期、分类、标签与 SEO 描述
- `public/obsidian/*`：文章实际引用的图片和附件

脚本只读取 Vault，不修改原笔记。重复执行会重建上述两个生成目录。

## 转换规则

- Obsidian 的 `![[图片]]` 与相对 `attachments/` 图片引用会复制到 `public/obsidian/`
- `[[笔记]]` 会转换为站内文章链接；无法解析的链接保留为文字
- 笔记 frontmatter 中的 `title`、`description`、`tags` 和日期会保留
- 缺失图片会显示为文字提示，不会生成失效图片 URL
- 标题、日期、分类和标签缺失时会从文件名、文件时间与顶层目录补齐

发布前仍应检查笔记是否含个人隐私信息或不应公开的内容。
