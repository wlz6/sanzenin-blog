# Azure 后端按需部署模板（未启用）

本目录中的 Compose、Cloudflare Tunnel 配置和 systemd 单元均为模板。当前服务器未安装 Docker，未创建 API 容器，`cloudflared-quick.service` 保持停用。模板文件不会被 systemd 或 Docker 自动加载。

部署前先确定 API 镜像、健康检查地址、实际环境变量、数据存储位置和访问控制方式。没有这些信息时不要安装 Docker 或启动容器。

## 当前服务器边界

| 项目 | 现状 |
| --- | --- |
| 主机 | `student-vm-my`，`Standard_B2ats_v2`，2 vCPU / 1 GiB 内存 |
| 位置 | Malaysia West，资源组 `RG-AZURE-STUDENT-MY` |
| 系统盘 | 64 GiB Premium SSD P6，根分区已用 15 GiB |
| 公网地址 | `85.211.195.152`，静态 Standard IPv4 |
| 私网地址 | `10.0.0.4` |
| Tailscale | `100.76.135.118`，节点在线 |
| SSH | 仅通过 Tailscale 使用 `ssh azure-student-my`；公网 22 被 NSG 拒绝 |
| nginx | 运行中，公网 80 返回默认的 “Azure Student VM is online” 页面 |
| 443 | NSG 放行，但本机没有监听进程 |
| Docker / Podman | 未安装 |
| Quick Tunnel | 服务和进程均未运行，服务处于 `disabled` |
| 博客 | 未部署到该服务器 |

完整证据、费用和风险记录见 [AUDIT-2026-11-16.md](AUDIT-2026-11-16.md)。

## 文件用途

| 文件 | 用途 |
| --- | --- |
| `compose.api.example.yaml` | API 单容器模板，端口只绑定 `127.0.0.1:8787`，使用 `api` profile |
| `api.env.example` | Compose 插值和 API 环境变量模板，复制为未跟踪的 `api.env` |
| `cloudflared/ingress.example.yml` | 命名 Tunnel 的 ingress，`api.sanzenin.top` 指向 `127.0.0.1:8787` |
| `cloudflared/cloudflared-sanzenin-api.service.example` | 命名 Tunnel 的 systemd 单元模板，默认不安装、不启用 |
| `.gitignore` | 排除实际环境变量、Tunnel 凭据和本机配置 |

`api.sanzenin.top` 必须在 Cloudflare 中由同一账号管理。Tunnel 使用出站连接，不需要在 Azure NSG 或 UFW 中开放 8787。

## 启用前检查

1. 确认 API 已有可部署镜像，并固定到 `@sha256:` 摘要，不使用浮动标签。
2. 确认 API 的内存上限。当前主机仅有约 274 MiB 可用内存，swap 已使用约 1.2 GiB。模板限制为 256 MiB，仍可能挤压现有进程。
3. 确认数据存储位置。1 GiB 内存的主机不适合同时运行 API、PostgreSQL、Redis 和博客构建任务；数据库应使用外部服务。
4. 决定 `api.sanzenin.top` 的认证方式。公开 API 需要应用层认证；内部 API 增加 Cloudflare Access。
5. 记录回滚方式。停用 API 不应影响 nginx 默认页或 Tailscale SSH。

## 启用 API

在服务器的仓库根目录执行以下命令：

```bash
cd deploy/azure
cp api.env.example api.env
chmod 600 api.env
cp compose.api.example.yaml compose.api.yaml
```

编辑 `api.env`，填写实际镜像摘要和 API 所需变量。编辑 `compose.api.yaml` 时保留以下边界：

- `ports` 必须是 `127.0.0.1:8787:8787`，不能改成 `0.0.0.0`。
- `profiles` 保持为 `api`，这样普通的 `docker compose up` 不会启动服务。
- `restart` 保持为 `"no"`。验收后需要开机自动恢复时，再单独改为 `unless-stopped`。
- `mem_limit`、`memswap_limit`、`pids_limit` 保持有限值。
- 只有镜像确实需要写入根文件系统时才移除 `read_only`。
- 健康检查命令必须与镜像内实际可用的工具和路径一致。

安装 Docker 属于单独的系统变更。经用户授权后，从 Docker 官方仓库安装，并且只启动 Docker 所需的服务。完成安装后手动启动 API：

```bash
docker compose --env-file api.env -f compose.api.yaml --profile api up -d
docker compose --env-file api.env -f compose.api.yaml ps
curl --fail --silent http://127.0.0.1:8787/healthz
```

如果健康检查路径不是 `/healthz`，同时修改 Compose 文件和验证命令。

## 启用命名 Tunnel

使用本机管理的命名 Tunnel。不要把 Tunnel 凭据或 token 写入仓库。

```bash
cloudflared tunnel login
cloudflared tunnel create sanzenin-api
cloudflared tunnel route dns sanzenin-api api.sanzenin.top
sudo useradd --system --user-group --home-dir /etc/cloudflared --shell /usr/sbin/nologin cloudflared
sudo install -d -o root -g cloudflared -m 0750 /etc/cloudflared
sudo install -o root -g cloudflared -m 0640 "$HOME/.cloudflared/<TUNNEL_UUID>.json" /etc/cloudflared/
sudo install -o root -g cloudflared -m 0640 cloudflared/ingress.example.yml /etc/cloudflared/config.yml
sudo install -o root -g root -m 0644 cloudflared/cloudflared-sanzenin-api.service.example /etc/systemd/system/cloudflared-sanzenin-api.service
```

把 `/etc/cloudflared/config.yml` 中的 `<TUNNEL_UUID>` 替换为实际 UUID。确认 `credentials-file` 路径存在，然后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-sanzenin-api.service
sudo systemctl status cloudflared-sanzenin-api.service --no-pager
curl --fail --silent https://api.sanzenin.top/healthz
```

当前已有的 `cloudflared-quick.service` 继续保持停用。Quick Tunnel 会创建无需认证的临时公网地址，并通过出站连接绕过 NSG 的入站限制，不用于正式 API。

## 停用与回滚

停止公网入口：

```bash
sudo systemctl disable --now cloudflared-sanzenin-api.service
```

停止 API：

```bash
cd deploy/azure
docker compose --env-file api.env -f compose.api.yaml --profile api down
```

确认 nginx 默认页仍可访问，Tailscale SSH 仍可用。只有确认没有其他容器用途后，才考虑停用 Docker：

```bash
sudo systemctl disable --now docker.service docker.socket
```

停用 Tunnel 后，如需删除 Cloudflare 侧资源，再单独执行 `cloudflared tunnel delete sanzenin-api` 并清理 DNS 记录。删除操作不属于常规回滚。

## 运维要求

- 查看 API 日志：`docker compose --env-file api.env -f compose.api.yaml logs -f --tail=100 api`
- 查看 Tunnel 日志：`journalctl -u cloudflared-sanzenin-api.service -n 100 --no-pager`
- 查看资源占用：`docker stats --no-stream`、`free -h`、`df -hT`
- 更新镜像时先拉取固定摘要，再重建容器。不要使用 Watchtower 或其他自动升级容器。
- 备份 API 数据。模板不创建数据库卷，也不提供数据库备份。
- 每月检查 Azure 费用、信用额度到期时间和免费服务期限。
- 为 `api.sanzenin.top` 配置 Cloudflare Access 或应用自身认证。不要依赖难以猜测的主机名。

## 安全边界

- API 只监听回环地址，Cloudflare Tunnel 从本机连接 API。
- NSG 保持 22 关闭。SSH 使用 Tailscale。
- 不为 Tunnel 开放 80/443，不为 API 开放 8787。
- Tunnel 凭据文件权限为 `0640`，所有者为 `root:cloudflared`；`api.env` 权限为 `0600`。
- 容器丢弃全部 capability，禁止提权，限制内存、CPU、PID 和日志大小。
- API 镜像使用固定摘要。镜像来源和构建流程需要可审计。
- 不在该主机运行数据库、Redis、对象存储或大规模构建任务。

## 现有公网入口建议

当前 NSG 放行公网 80 和 443。80 提供默认 nginx 页面，443 没有监听进程，日志中已有自动化扫描请求。博客上线并确认访问路径后，可以在单独维护窗口关闭不需要的 NSG 规则。Cloudflare Tunnel 本身不需要公网入站端口。

UFW 对 22 的规则当前允许所有来源。建议在单独维护窗口将其限制为 `tailscale0` 接口或 `100.64.0.0/10`，并保持 NSG 不放行公网 22。

静态 IPv4 当前是本月唯一主要费用。若不再需要公网直连，可以在验收后移除公网 IP，改用 Tunnel 和 Tailscale。该操作会改变现有默认页访问方式，需要单独授权。
