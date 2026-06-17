# CanvasFlow

> **演示用 Demo** — 一个基于画布的短剧/视频创作工具，用来帮助开发者直观理解产品愿景。
> 仍在持续迭代中。

CanvasFlow 把"写剧本 → 拆分镜 → 生成图片/视频素材 → 时间线合成"整条创作流程放到一张无限画布上，节点之间通过连线表达上下游关系。

## ⚠️ 这是一个 Demo

- **没有真实的 LLM / 生成 API**：后端的"脚本生成、提示词合成、素材生成"全部由 **mock / fixture 数据** 通过 SSE 流式返回，用来模拟真实交互的节奏与形态。
- **没有真实对象存储**：上传走 mock 分支，文件在浏览器里以本地 blob URL 存在，刷新不持久化。
- 目的就是**把产品形态演示出来**，方便讨论与迭代，而不是一个生产级实现。

## 技术栈

- **Web**：React 19 + Zustand 5 + ReactFlow (@xyflow) 12 + Tailwind 4 + Vite
- **API**：Hono + better-sqlite3（仅存工程元数据）+ zod
- **Monorepo**：pnpm workspace

## 目录结构

```
CanvasFlow/
├── packages/shared/   @canvasflow/shared — 共享类型、helper、常量
├── apps/web/          @canvasflow/web    — Vite SPA（画布前端）
└── apps/api/          @canvasflow/api    — Hono mock API 服务
```

## 快速开始

需要 Node >= 20 和 pnpm（仓库锁定 `pnpm@10.33.0`）。

```bash
pnpm install

# 同时启动 web + api
pnpm dev

# 或分别启动
pnpm dev:web   # 前端 → http://localhost:5173
pnpm dev:api   # 后端 → http://localhost:3001
```

打开 http://localhost:5173 即可。前端通过 Vite 代理把 `/api` 转发到 `http://localhost:3001`。

可选环境变量见 `.env.example`（demo 下留空即可，全部走 mock）。

## 常用脚本

```bash
pnpm lint    # 各包 tsc --noEmit / eslint
pnpm test    # 各包 vitest
pnpm build   # 各包构建
```

## Mock 数据约定

- `POST /api/scripts/generate` — SSE 流式返回脚本分镜
- `POST /api/scripts/compose-prompts` — SSE 流式返回合成后的提示词
- `POST /api/assets/generate` — SSE 流式返回素材生成进度，完成后给占位图
- `GET/PUT /api/projects/:id` — 工程读写（sqlite，存画布 JSON）

这些接口的"生成"结果均来自固定 fixture，仅用于演示流程，不代表真实模型输出。
