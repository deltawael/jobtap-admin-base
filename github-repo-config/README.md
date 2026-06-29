GitHub Repository secrets / variables 同步工具：

```bash
cd frontend
pnpm github:sync -- --dry-run
pnpm github:sync -- --config ../github-repo-config/prod.local.yaml
pnpm github:sync -- --config ../github-repo-config/staging.local.yaml
```

使用说明：

- 默认配置文件是仓库根目录的 `github-repo-config/default.local.yaml`。
- 多个仓库或环境的配置统一放在 `github-repo-config/` 目录下，例如 `prod.local.yaml`、`staging.local.yaml`。
- 可从 `github-repo-config/example.yaml` 复制一份本地配置并按需改名。
- GitHub token 默认维护在 `github-repo-config/token.local`，文件内容可直接写 token，或写成 `GITHUB_TOKEN=...`。
- `GITHUB_TOKEN` 环境变量仍可作为兼容 fallback。
- token 需要 classic token 的 `repo` scope，或 fine-grained token 的 repository `Secrets` / `Variables` 写权限。
- `--dry-run` 只打印计划动作，不会把变更发送到 GitHub。
