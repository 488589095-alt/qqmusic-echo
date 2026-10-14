# 回声原型：Vercel 部署

这是 QQ音乐「回声」的交互演示源码。Vercel 使用根目录的 `vercel.json`，执行 `pnpm build:static`，发布 `dist-static` 目录。封面、照片和 30 秒歌曲预览随构建文件一起部署；网页运行时不依赖 ChatGPT Sites。

## 从 GitHub 导入

1. 在 Vercel 选择 **Add New → Project → Import Git Repository**，选择本仓库。
2. 保持仓库根目录为 Root Directory。`vercel.json` 已设置 Framework 为 Vite、Build Command 为 `pnpm build:static`、Output Directory 为 `dist-static`。
3. 先用 Vercel 分配的 `*.vercel.app` 地址检查首页、交互 Demo、图片和两段音频。
4. 在项目 **Settings → Domains** 添加 `memory-echoes.online`。根据 Vercel 对该项目显示的 DNS 指引，在阿里云替换当前两条 `@` A 记录；不要在 Vercel 部署验证前切换 DNS。

域名解析仍由阿里云管理。Vercel 的通用 A 地址只是示例，以项目实际提示为准。DNS 切换后检查 HTTPS，并用中国内地的普通移动网络与宽带分别测试。

## 本地检查

```sh
pnpm install
pnpm build:static
```

产物位于 `dist-static/`。静态部署不会使用现有的 `.openai/hosting.json`。
