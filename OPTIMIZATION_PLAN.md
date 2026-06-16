# CanvasFlow 优化与改造方案（Claude Code 执行文档）

> 本文档由资深工程师审查后产出，供 Claude Code **按阶段、按顺序**执行。
> 每个阶段都有明确的改动清单和验收标准。**不要跳过阶段，不要推倒重写既有架构** —— 现有代码底子是好的，本方案是增量优化。
> 涉及不确定的实现选择时，遵循本文档给定的默认方案；如确有更优解，先在该阶段顶部以注释说明再动手。

---

## 0. 背景与现状（执行前必读）

- 这是一个 pnpm monorepo：`apps/web`（React 19 + Vite + @xyflow/react + zustand 前端，约 1.3 万行）、`apps/api`（Hono 后端，当前全是 mock）、`packages/shared`（前后端共享 TypeScript 类型）。
- **现状关键事实**：
  - `apps/api` 所有接口都是演示桩：脚本/资产用 `setTimeout` 吐预置数据，图片返回 `picsum.photos` 占位图，`/api/projects` 的保存接口直接 `return { ok: true }` 不落库。
  - 前端状态只活在内存（zustand），**没有任何持久化**，刷新即丢失。
  - 用户上传的图片被 `readAsDataURL` 读成 **base64 直接塞进画布节点状态**（见 `ImagePickerModal.tsx`、`ScriptTableView.tsx`、`ScriptCardView.tsx`）。这是后续要重点改的隐患。
  - 节点数据里存的是图片 **URL**（不是二进制），这点是好的，对象存储改造能平滑接入。
- **总目标**：在不破坏现有功能的前提下，(A) 清理工程卫生问题；(B) 加入项目持久化；(C) 引入对象存储托管图片/视频，消除 base64 入状态的隐患；(D) 把 `apps/api` 从 mock 桩养成真实后端骨架。

---

## 阶段 1 — 工程卫生清理（低风险，先做）

**目标**：消除环境不一致和历史残留。

### 1.1 统一为 pnpm，删除多余 lockfile
- 删除根目录的 `bun.lock` 和 `package-lock.json`，**只保留 `pnpm-lock.yaml`**。
- 在 `.gitignore` 中确认已忽略，并在 `package.json` 增加 `"packageManager": "pnpm@<当前版本>"` 字段锁定包管理器。
- 执行 `pnpm install` 重新生成干净 lock，确认无报错。

### 1.2 清理上一代架构残留
- 删除目录/文件：`.wrangler/`、`.tanstack/`、`.conductor/`、根目录已被构建产物污染的 `dist/`（确认 `dist/` 已在 `.gitignore` 中，且不含手写源码后再删）。
- 检查 `.gitignore`，移除针对已废弃技术栈（vinxi/tanstack/wrangler）的无用条目仅保留仍需要的。

### 1.3 验收
- `pnpm install && pnpm -r run lint && pnpm -r run build` 全绿。
- `git status` 干净，仓库不再追踪任何构建产物或上一代残留。

---

## 阶段 2 — 项目持久化（数据库层）

**目标**：让"保存/读取项目"真正落库，替换 `/api/projects` 的空桩。

### 2.1 技术选型（默认方案）
- 数据库：**SQLite**（用 `better-sqlite3`），最低接入摩擦，单文件、零运维，适合当前阶段。
- **必须把数据访问封装在 repository 层**（`apps/api/src/db/` 下），所有 SQL 只出现在这一层，业务路由不直接写 SQL。这样未来切换到 Postgres 只改 repository 实现，不动路由。
- DB 文件路径走环境变量 `DATABASE_PATH`，默认 `./data/canvasflow.db`，并把 `data/` 加入 `.gitignore`。

### 2.2 数据模型（最小可用）
创建表 `projects`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 项目 id |
| `name` | TEXT | 项目名 |
| `canvas` | TEXT (JSON) | 序列化的 `{ nodes, edges }`（即 `Snapshot` 类型） |
| `created_at` | TEXT | ISO 时间 |
| `updated_at` | TEXT | ISO 时间 |

> 注意：`canvas` 里**只允许存资产的 URL，禁止存 base64**（阶段 3 会保证这一点）。

### 2.3 后端改造（`apps/api`）
在 `apps/api/src/routes/projects.ts` 用真实实现替换桩：
- `GET  /api/projects` → 列出所有项目（id/name/updated_at）。
- `GET  /api/projects/:id` → 返回完整项目含 `canvas`（解析 JSON 后返回 `nodes`/`edges`）。
- `PUT  /api/projects/:id` → upsert，写入 `canvas` 与 `updated_at`。
- `POST /api/projects` → 新建项目。
- 加入请求体校验（用 `zod`，schema 放 `apps/api/src/schemas/`），拒绝畸形或超大 payload（见阶段 3 的大小限制）。

### 2.4 前端改造（`apps/web`）
- 在 `services/api.ts` 新增 `loadProject(id)` / `saveProject(id, snapshot)` / `listProjects()`。
- 在 `canvasStore.ts` 增加 `loadFromServer(id)` 和 `saveToServer()` action；保存内容为 `{ nodes, edges }`。
- 自动保存：对画布变更做 **debounce（建议 1.5–2s）** 后调用 `saveToServer()`；同时在顶栏保留手动"保存"入口与保存状态指示（已保存 / 保存中 / 失败）。
- 应用启动时按 `projectName`/默认项目 id 调 `loadFromServer` 恢复状态；失败时回退到 `mockData` 并提示。

### 2.5 验收
- 搭好画布 → 刷新页面 → 状态完整恢复。
- DB 文件中 `canvas` 字段不含任何 `data:image` base64 串（阶段 3 完成后复检）。

---

## 阶段 3 — 对象存储（图片 / 视频资产）⭐ 重点

**目标**：所有真实图片/视频走对象存储，数据库与画布节点**只存 URL/key**，彻底消除 base64 入状态的隐患。

### 3.1 核心原则（必须严格遵守）
> **二进制文件（图、视频）放对象存储；DB 和画布节点里只存对象的 URL 或 key。前端任何地方都不再把上传文件以 base64 长期存入 zustand 状态。**

### 3.2 技术选型（默认方案）
- 对象存储：**Cloudflare R2**（与项目早期的 Cloudflare 技术栈一致、无出口流量费、对视频友好），通过 **S3 兼容 SDK**（`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`）接入。
- **务必用 S3 兼容接口而非 R2 私有 API**，以便将来一行配置即可切换到阿里云 OSS / 腾讯云 COS / AWS S3。
- 所有 endpoint、bucket、密钥走环境变量：`S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL`。在仓库根加 `.env.example` 列出全部变量（**不要提交真实密钥**）。

### 3.3 上传机制：预签名直传（presigned upload）
**不要让文件经过后端中转**。流程如下：
1. 前端选好文件 → 调后端 `POST /api/assets/upload-url`，带 `{ filename, contentType, size }`。
2. 后端校验类型/大小（见 3.5），生成对象 key（建议 `projects/<projectId>/<uuid>.<ext>`），返回 `{ uploadUrl(presigned PUT), publicUrl, key }`。
3. 前端用 `fetch(uploadUrl, { method: 'PUT', body: file })` 直传对象存储。
4. 直传成功后，前端把 `publicUrl` 写入对应节点的 `data.src`（或 `ScriptAsset.image` 等字段）。

### 3.4 前端改造点（替换现有 base64 逻辑）
以下文件当前用 `readAsDataURL` 把图片转 base64 塞状态，**全部改为走 3.3 的直传并只保存返回的 URL**：
- `apps/web/src/components/script/ImagePickerModal.tsx`（`handleFile`）
- `apps/web/src/components/script/ScriptTableView.tsx`（`handleFile`）
- `apps/web/src/components/script/ScriptCardView.tsx`（`handleFile`）
- 抽一个公共 hook：`apps/web/src/lib/useAssetUpload.ts`，封装"取预签名 URL → 直传 → 返回 publicUrl"，三处复用，附带上传进度与失败重试。
- 上传过程中可临时用本地 `URL.createObjectURL` 做即时预览，但**最终写入状态/落库的必须是对象存储 URL**，并在写入后 `revokeObjectURL` 释放。

### 3.5 安全与限制（后端强制）
- 校验 `contentType` 白名单：图片 `image/png|jpeg|webp|gif`，视频 `video/mp4|webm|quicktime`。
- 大小上限：图片建议 ≤ 20MB，视频 ≤ 500MB（可配置，放常量）。
- 预签名 URL 有效期短（如 5 分钟）。
- bucket 不要全公开写；公开读可接受，或后续改为带签名的读 URL。

### 3.6 AI 生成资产的衔接（为阶段 4 铺路）
- 现在 `assets`/`scripts` 路由返回的是 picsum 占位图；保持其"返回 URL 而非二进制"的契约不变。
- 将来真实生成出的图/视频，由后端落到对象存储后，同样**只把 URL 通过 SSE 回传前端**。前端代码无需为"真假资产"分叉。

### 3.7 验收
- 本地上传一张图 → 网络面板能看到 PUT 直传到对象存储 → 节点 `data.src` 是对象存储 URL，**不是 `data:image/...`**。
- DB 中 `canvas` JSON 全程不含 base64。
- 删除/重新加载项目，图片仍可正常显示。

---

## 阶段 4 — 把 mock 后端养成真实后端骨架（接 AI 生成时再做）

**目标**：在不改前端契约的前提下，把生成类接口从 mock 替换为真实模型调用。**此阶段在你决定接真实 AI 生成时才执行。**

### 4.1 关键安全红线
- **模型 API 密钥只能放后端环境变量，绝不进浏览器。** 所有文生图/文生视频调用由 `apps/api` 代理。

### 4.2 改造点
- `apps/api/src/routes/scripts.ts`、`assets.ts`：把 `setTimeout` + fixtures 替换为真实模型 API 调用，保持现有 **SSE 事件名与数据结构不变**（`shot` / `progress` / `prompt` / `asset-done` / `done`），这样前端 `services/api.ts` 不用改。
- 长任务（视频生成几十秒~几分钟）：引入轻量任务表 + 轮询或 SSE 续传，避免前端长时间挂起连接；任务产物落对象存储后回传 URL。
- 加错误事件与超时处理；前端 `fetchSSE` 的结束判断与 `progress` 解析目前偏 hacky，借此机会加固（统一事件解析、明确 `done`/`error` 分支）。

### 4.3 验收
- 浏览器端任何请求/源码都搜不到模型密钥。
- 真实生成的资产 URL 指向对象存储，可持久化、可刷新恢复。

---

## 阶段 5 — 代码质量收尾（可与上面并行，低优先级）

- **拆分超大组件**（仅做机械抽离，不改行为）：`TrackTimeline.tsx`（956 行）、`ScriptNode.tsx`（639 行）、`ScriptTableView.tsx`（638 行）按子区域/子逻辑拆成更小组件与 hooks。
- 三处图片上传逻辑已在阶段 3.4 收敛到 `useAssetUpload`，删除重复代码。
- 为对象存储 key 生成、大小/类型校验、SSE 解析等纯函数补单测（项目已用 vitest，见 `storyboard.test.ts` 的风格）。

---

## 执行顺序与总验收

1. 阶段 1（清理）→ 2. 阶段 2（持久化）→ 3. 阶段 3（对象存储）→ 4. 阶段 5（质量收尾）。
5. 阶段 4（真实 AI 后端）按业务节奏单独触发。

**每完成一个阶段都要保证**：`pnpm -r run lint && pnpm -r run build && pnpm -r run test` 全绿，且不破坏现有 demo 流程（搭画布、生成脚本、生成分镜、视频合成预览）。

**全局禁止事项**：
- ❌ 不要把上传/生成的二进制以 base64 长期存入 zustand 或写进 DB。
- ❌ 不要把任何密钥写进 `apps/web` 或提交到仓库。
- ❌ 不要为了重构而改变现有功能行为；重构与功能变更分开提交。
- ❌ 不要重新引入 npm/bun lockfile。
