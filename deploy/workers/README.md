# Workers API 预留方案

状态：当前没有部署 Worker，也没有创建 `api.sanzenin.top` 记录。博客是 Cloudflare Pages 静态站点，不依赖 Worker 或 Azure。

## 当前边界

- Pages 项目：`sanzenin-blog`
- 主域名：`https://sanzenin.top`
- 备用域名：`https://www.sanzenin.top`，301 到主域名并保留路径与查询字符串
- Workers：未部署
- Azure：未启动 API 容器或 Tunnel

## 需要 API 时

先在 `wrangler.toml` 中配置 API 路由，再部署独立 Worker。示例见 `wrangler.toml.example`。

```toml
name = "sanzenin-api"
main = "src/index.ts"
compatibility_date = "2026-11-16"
routes = [
  { pattern = "api.sanzenin.top/*", zone_name = "sanzenin.top" }
]
```

部署前确认：

1. `api.sanzenin.top` 只承载 API，不参与博客页面渲染。
2. Worker 需要独立的错误处理、请求超时和 CORS 策略。
3. 需要稳定后端时优先使用已预留的 Azure 命名 Tunnel，而不是把数据库或长任务放进 Worker。
4. 免费额度为每天 100,000 次请求；超出前设置告警。
5. 部署 Worker 后另行创建 DNS 记录并验证证书。

## 本地验证

配置模板不包含真实账户、域名 ID 或密钥。实际部署时使用 `wrangler deploy`，不要把凭据写入仓库。
