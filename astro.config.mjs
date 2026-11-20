import http from "node:http";
import { defineConfig } from "astro/config";
import shirones from "shirones";

function socialApiDevProxyPlugin() {
  const targetUrl = new URL(process.env.SOCIAL_API_PROXY_TARGET ?? "http://127.0.0.1:8788");
  return {
    name: "sanzenin:social-api-dev-proxy",
    configureServer(server) {
      // 返回 post-hook，确保在 vitePluginAstroServer 的 trailingSlashMiddleware 之后再 unshift 到最前
      return () => {
        server.middlewares.stack.unshift({
          route: "",
          handle(req, res, next) {
            const rawUrl = req.url ?? "";
            if (rawUrl !== "/api" && !rawUrl.startsWith("/api/") && !rawUrl.startsWith("/api?")) {
              next();
              return;
            }
            const proxyReq = http.request(
              {
                hostname: targetUrl.hostname,
                port: Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80)),
                path: rawUrl,
                method: req.method,
                headers: req.headers,
              },
              (proxyRes) => {
                res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
                proxyRes.pipe(res);
              },
            );
            proxyReq.on("error", () => {
              if (res.headersSent) return;
              const body = JSON.stringify({
                error: {
                  code: "SOCIAL_API_UNAVAILABLE",
                  message: "本地社交 API 服务未启动，请先运行 pnpm run api:social。",
                },
              });
              res.writeHead(502, {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": Buffer.byteLength(body),
              });
              res.end(body);
            });
            req.pipe(proxyReq);
          },
        });
      };
    },
  };
}

// Site-level settings (site URL, base, title, theme colour, fonts, …) live in
// `shirones/config/` so they stay typed and version-controlled with your
// content. This file only wires the theme in.
export default defineConfig({
  integrations: [
    shirones({
      // 由自定义空间路由接管 /projects/，避免与主题内置停用占位页冲突
      excludeRoutes: ["/projects"],
    }),
  ],
  vite: {
    plugins: [socialApiDevProxyPlugin()],
  },
});
