import {
	type SocialUser,
	getAuthMe,
	getGithubLoginUrl,
	logout as apiLogout,
} from "../../lib/api/social-client.ts";

class AuthStore {
	user = $state<SocialUser | null>(null);
	oauthConfigured = $state<boolean>(false);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	private initialized = false;
	private inflight: Promise<void> | null = null;

	async ensureLoaded(): Promise<void> {
		if (typeof window === "undefined") return;
		if (this.initialized) return;
		if (this.inflight) return this.inflight;
		return this.load(false);
	}

	async refresh(): Promise<void> {
		if (typeof window === "undefined") return;
		return this.load(true);
	}

	private async load(force: boolean): Promise<void> {
		if (!force && this.inflight) return this.inflight;

		const run = (async () => {
			this.loading = true;
			this.error = null;
			try {
				const res = await getAuthMe();
				this.user = res.user;
				this.oauthConfigured = res.oauthConfigured;
				this.initialized = true;
			} catch (err) {
				this.error = err instanceof Error ? err.message : "获取登录状态失败，请稍后重试。";
			} finally {
				this.loading = false;
				this.inflight = null;
			}
		})();

		this.inflight = run;
		return run;
	}

	async logout(): Promise<void> {
		if (typeof window === "undefined") return;
		this.loading = true;
		this.error = null;
		try {
			await apiLogout();
			this.user = null;
			this.initialized = true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : "退出登录失败，请稍后重试。";
			throw err;
		} finally {
			this.loading = false;
		}
	}

	getLoginUrl(redirectTo?: string): string {
		const target =
			redirectTo ??
			(typeof window !== "undefined"
				? `${window.location.pathname}${window.location.search}${window.location.hash}`
				: "/");
		return getGithubLoginUrl(target);
	}
}

export const authStore = new AuthStore();
