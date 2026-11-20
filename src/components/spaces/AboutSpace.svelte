<script lang="ts">
import type { BlogSiteMetadata } from "../../lib/api/social-client.ts";
import { GlassButton } from "../glass/index.ts";

let {
	aboutHtml,
	site,
}: {
	aboutHtml: string;
	site: BlogSiteMetadata;
} = $props();
</script>

<section class="lg-about-space" aria-label="关于作者">
	<header class="lg-about-space__hero">
		<div class="lg-about-space__identity">
			<img src="/logo/icon.svg" alt={site.author} width="54" height="54" class="lg-about-space__avatar" />
			<div>
				<h3 class="lg-about-space__name">{site.author}</h3>
				<p class="lg-about-space__bio">{site.bio}</p>
			</div>
		</div>

		<div class="lg-about-space__links">
			<GlassButton
				variant="ghost-on-glass"
				size="sm"
				href={site.githubUrl}
				target="_blank"
				rel="noopener noreferrer"
			>
				GitHub ↗
			</GlassButton>
			<GlassButton variant="ghost-on-glass" size="sm" href="/about/">
				独立页面
			</GlassButton>
		</div>
	</header>

	<div class="lg-about-space__prose">
		<!-- 构建期由 scripts/export-blog-data.mjs 通过 marked + FilterXSS 净化生成的关于正文 -->
		{@html aboutHtml}
	</div>
</section>

<style>
	.lg-about-space {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	.lg-about-space__hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 14px;
		padding: 16px 18px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
	}

	.lg-about-space__identity {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.lg-about-space__avatar {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		border: 1px solid var(--lg-separator-strong);
		background: rgba(16, 29, 56, 0.72);
		flex: none;
	}

	.lg-about-space__name {
		margin: 0;
		font-family: var(--lg-font-display);
		font-size: var(--lg-text-h2);
		font-weight: 500;
		color: var(--lg-ink-primary);
	}

	.lg-about-space__bio {
		margin: 4px 0 0;
		font-size: var(--lg-text-ui);
		color: var(--lg-ink-secondary);
		line-height: 1.55;
	}

	.lg-about-space__links {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.lg-about-space__prose {
		color: var(--lg-ink-primary);
		font-size: var(--lg-text-body);
		line-height: 1.78;
		overflow-wrap: anywhere;
		user-select: text;
	}

	.lg-about-space__prose :global(h1) {
		display: none;
	}

	.lg-about-space__prose :global(h2) {
		margin: 22px 0 10px;
		font-family: var(--lg-font-display);
		font-size: 1.375rem;
		font-weight: 500;
		color: var(--lg-ink-primary);
	}

	.lg-about-space__prose :global(p),
	.lg-about-space__prose :global(ul),
	.lg-about-space__prose :global(ol) {
		margin: 0 0 12px;
		color: var(--lg-ink-secondary);
	}

	.lg-about-space__prose :global(ul),
	.lg-about-space__prose :global(ol) {
		padding-inline-start: 20px;
	}

	.lg-about-space__prose :global(li) {
		margin-bottom: 6px;
	}

	.lg-about-space__prose :global(a) {
		color: var(--lg-moonlight);
		text-decoration: underline;
	}

	.lg-about-space__prose :global(code) {
		font-family: var(--lg-font-mono);
		font-size: 0.85em;
		padding: 1px 6px;
		border-radius: 6px;
		background: var(--lg-fill-code);
		color: var(--lg-ink-primary);
	}
</style>
