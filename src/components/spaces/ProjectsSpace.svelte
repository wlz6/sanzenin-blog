<script lang="ts">
import type { ProjectRecord } from "../../lib/api/social-client.ts";
import { GlassButton } from "../glass/index.ts";

let {
	projects,
}: {
	projects: ProjectRecord[];
} = $props();

const languageColors: Record<string, string> = {
	TypeScript: "#3178c6",
	JavaScript: "#f1e05a",
	Python: "#3572a5",
	Go: "#00add8",
	Lua: "#000080",
};

function formatDate(iso: string): string {
	return iso.slice(0, 10);
}
</script>

<section class="lg-projects-space" aria-label="开源项目">
	{#if projects.length === 0}
		<p class="lg-projects-space__empty">暂无公开项目记录。</p>
	{:else}
		<div class="lg-projects-grid">
			{#each projects as project (project.name)}
				<article class="lg-project-card" data-featured={project.featured ? "true" : undefined}>
					<header class="lg-project-card__head">
						<div class="lg-project-card__title-wrap">
							<h3 class="lg-project-card__title">
								<a href={project.url} target="_blank" rel="noopener noreferrer" class="lg-project-card__link">
									{project.name}
								</a>
							</h3>
							{#if project.primaryLanguage}
								<span class="lg-project-card__lang">
									<span
										class="lg-project-card__lang-dot"
										style={`background:${languageColors[project.primaryLanguage] ?? "var(--lg-moonlight)"}`}
										aria-hidden="true"
									></span>
									{project.primaryLanguage}
								</span>
							{/if}
						</div>

						<span class="lg-project-card__stars" aria-label={`${project.stargazerCount} stars`}>
							★ {project.stargazerCount}
						</span>
					</header>

					<p class="lg-project-card__desc">{project.description}</p>

					{#if project.topics.length > 0}
						<div class="lg-project-card__topics">
							{#each project.topics as topic (topic)}
								<span class="lg-project-card__topic">{topic}</span>
							{/each}
						</div>
					{/if}

					<footer class="lg-project-card__foot">
						<time class="lg-project-card__time" datetime={project.updatedAt}>
							更新于 {formatDate(project.updatedAt)}
						</time>
						<div class="lg-project-card__actions">
							{#if project.homepageUrl}
								<GlassButton
									variant="ghost-on-glass"
									size="sm"
									href={project.homepageUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									访问站点
								</GlassButton>
							{/if}
							<GlassButton
								variant="ghost-on-glass"
								size="sm"
								href={project.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								GitHub ↗
							</GlassButton>
						</div>
					</footer>
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	.lg-projects-space {
		min-width: 0;
	}

	.lg-projects-space__empty {
		margin: 0;
		color: var(--lg-ink-secondary);
		font-size: var(--lg-text-ui);
	}

	.lg-projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr));
		gap: 14px;
	}

	.lg-project-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 18px;
		border-radius: var(--lg-radius-card);
		border: 1px solid var(--lg-separator);
		background: var(--lg-fill-note-embedded);
		min-width: 0;
		transition:
			background-color 160ms var(--lg-ease-out),
			border-color 160ms var(--lg-ease-out);
	}

	.lg-project-card[data-featured="true"] {
		border-color: rgba(185, 216, 232, 0.28);
	}

	.lg-project-card__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.lg-project-card__title-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.lg-project-card__title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.lg-project-card__link {
		color: var(--lg-ink-primary);
		text-decoration: none;
	}

	.lg-project-card__lang {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-secondary);
	}

	.lg-project-card__lang-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex: none;
	}

	.lg-project-card__stars {
		font-size: var(--lg-text-micro);
		color: var(--lg-firefly-gold);
		font-variant-numeric: tabular-nums;
		flex: none;
	}

	.lg-project-card__desc {
		margin: 0;
		flex: 1;
		font-size: var(--lg-text-ui);
		line-height: 1.6;
		color: var(--lg-ink-secondary);
		overflow-wrap: anywhere;
	}

	.lg-project-card__topics {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.lg-project-card__topic {
		padding: 2px 8px;
		border-radius: var(--lg-radius-pill);
		background: var(--lg-accent-soft);
		color: var(--lg-moonlight);
		font-size: 0.72rem;
	}

	.lg-project-card__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--lg-separator);
	}

	.lg-project-card__time {
		font-size: var(--lg-text-micro);
		color: var(--lg-ink-tertiary);
	}

	.lg-project-card__actions {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lg-project-card:hover {
			background: var(--lg-fill-note-hover);
			border-color: var(--lg-separator-strong);
		}
		.lg-project-card__link:hover {
			color: var(--lg-firefly-gold);
		}
	}
</style>
