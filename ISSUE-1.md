# #1 pi-tinyfish 完整设计方案

## 概述

pi-tinyfish 是一个 **pi package**，让 LLM 在对话中能直接调用 TinyFish 的全部核心能力：网页搜索、内容抽取、目标驱动网站自动化、运行管理。

不依赖 `@tiny-fish/sdk`，直接 REST 调用，认证信息通过 `~/.pi/agent/pi-tinyfish.json` 本地管理。

---

## TinyFish 能力映射

| API | 能力 | 端点 | 工具名 |
|---|---|---|---|
| Agent | 自然语言目标驱动网站自动化 | `POST /v1/automation/run-sse` | `tinyfish_agent_run` |
| Search | 网页搜索，返回排名结果 | `GET https://api.search.tinyfish.ai` | `tinyfish_search` |
| Fetch | 渲染 URL + 抽取内容 | `POST https://api.fetch.tinyfish.ai` | `tinyfish_fetch` |
| Run 管理 - 查询 | 查询单个 run 状态和结果 | `GET /v1/runs/{id}` | `tinyfish_run_get` |
| Run 管理 - 列表 | 列表/搜索历史 runs | `GET /v1/runs` | `tinyfish_run_list` |
| Run 管理 - 取消 | 取消进行中的 run | `DELETE /v1/runs/{id}` | `tinyfish_run_cancel` |

### 后续版本（不在 MVP 范围）

| 工具名 | 对应 API | 用途 |
|---|---|---|
| `tinyfish_browser_create` | Browser API | 创建远程浏览器会话（CDP） |
| `tinyfish_browser_terminate` | Browser API | 终止浏览器会话 |

---

## 包结构

```
pi-tinyfish/
├── package.json
├── README.md
├── extensions/
│   ├── index.ts              # 入口：注册工具 + 命令
│   ├── config.ts              # 配置读写 + 命令实现
│   ├── api.ts                 # REST 客户端（统一 header、错误处理）
│   ├── tools/
│   │   ├── search.ts          # tinyfish_search
│   │   ├── fetch.ts           # tinyfish_fetch
│   │   ├── agent-run.ts       # tinyfish_agent_run (SSE streaming)
│   │   ├── run-get.ts         # tinyfish_run_get
│   │   ├── run-list.ts        # tinyfish_run_list
│   │   └── run-cancel.ts      # tinyfish_run_cancel
│   └── format.ts             # 输出格式化 + 截断
└── skills/
    └── tinyfish/
        └── SKILL.md           # 告诉模型什么时候/怎么用 TinyFish
```

---

## 配置设计

### 位置

```
~/.pi/agent/pi-tinyfish.json
```

### 内容

```json
{
  "apiKey": "tf_xxx",
  "defaultLocation": "US",
  "defaultLanguage": "en",
  "defaultFetchFormat": "markdown",
  "defaultBrowserProfile": "lite"
}
```

### API key 来源优先级

1. `pi-tinyfish.json` 里的 `apiKey` ← **主方案**
2. `TINYFISH_API_KEY` 环境变量 ← fallback（CI / 临时调试）
3. 都没有 → 提示运行 `/tinyfish-login`

### 安全规则

- 写入时原子写入（先写 `.tmp-{pid}-{ts}` 再 rename）
- 文件权限 `0600`
- tool result 中**绝不返回** apiKey
- `/tinyfish-status` 只显示是否已配置，不暴露 key 值
- 错误信息中脱敏 key

### 目录解析

```ts
function getAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  if (!configured) return join(homedir(), ".pi", "agent");
  if (configured === "~") return homedir();
  if (configured.startsWith("~/")) return resolve(homedir(), configured.slice(2));
  return resolve(configured);
}
```

---

## 注册的命令

| 命令 | 用途 | 行为 |
|---|---|---|
| `/tinyfish-login` | 配置 API key | `ctx.ui.input()` 输入 key → 原子写入 `0600` |
| `/tinyfish-status` | 显示状态 | 已配置 / 未配置；key 显示为 `tf_****abcd` |
| `/tinyfish-logout` | 删除 key | 删除 `pi-tinyfish.json` 或清空 apiKey 字段 |

---

## 工具详细设计

### 1. `tinyfish_search`

```ts
parameters: {
  query: string;          // 必填，搜索词
  location?: string;      // 国家码，默认 US
  language?: string;       // 语言码，默认 en
  page?: number;           // 页码，0-10
  maxBytes?: number;       // 输出上限，默认 50KB，最大 200KB
}
```

调用：`GET https://api.search.tinyfish.ai?query=...&location=...&language=...`

返回格式化后的排名结果（title, snippet, url, site_name）。

### 2. `tinyfish_fetch`

```ts
parameters: {
  url?: string;            // 单 URL
  urls?: string[];         // 多 URL，最多 10 个
  format?: "markdown" | "html" | "json";  // 默认 markdown
  links?: boolean;         // 是否提取链接
  imageLinks?: boolean;    // 是否提取图片链接
  maxBytes?: number;       // 输出上限
}
```

调用：`POST https://api.fetch.tinyfish.ai`

返回每个页面的 title, description, text, links 等。

### 3. `tinyfish_agent_run`

```ts
parameters: {
  url: string;                    // 必填，目标网址
  goal: string;                   // 必填，自然语言目标
  browserProfile?: "lite" | "stealth";  // 默认 lite
  useVault?: boolean;             // 是否使用密码管理器凭证
  credentialItemIds?: string[];   // 指定凭证
  proxyConfig?: {                 // 可选代理
    enabled?: boolean;
    type?: "tetra" | "custom";
    countryCode?: string;
    url?: string;
    username?: string;
    password?: string;
  };
}
```

调用：`POST https://agent.tinyfish.ai/v1/automation/run-sse`

SSE 事件流通过 `onUpdate()` 实时展示：
- `STARTED` → 开始执行
- `STREAMING_URL` → 浏览器预览地址
- `PROGRESS` → 进度更新
- `COMPLETE` → 最终结果

### 4. `tinyfish_run_get`

```ts
parameters: {
  runId: string;     // 必填
}
```

调用：`GET https://agent.tinyfish.ai/v1/runs/{id}`

返回完整 run 信息（status, result, steps, error）。

### 5. `tinyfish_run_list`

```ts
parameters: {
  status?: "COMPLETED" | "FAILED" | "CANCELLED";
  goal?: string;       // 目标文本模糊搜索
  createdAfter?: string; // ISO 时间戳
  createdBefore?: string;
  sortDirection?: "asc" | "desc";
  limit?: number;       // 1-100，默认 20
}
```

调用：`GET https://agent.tinyfish.ai/v1/runs`

### 6. `tinyfish_run_cancel`

```ts
parameters: {
  runId: string;
}
```

调用：`DELETE https://agent.tinyfish.ai/v1/runs/{id}`

---

## 核心技术决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| SDK vs REST | REST 直调 | 更好控制认证来源、SSE 流处理、超时、截断 |
| 配置位置 | `~/.pi/agent/pi-tinyfish.json` | 和 pi-telegram 同级，简洁明了 |
| key 安全 | 不在 tool result 中返回 | 防止 LLM 上下文泄露 |
| 输出截断 | 复用 pi 内置 `truncateHead` | 防止撑爆上下文 |
| Agent 调用方式 | SSE streaming + `onUpdate` | 实时进度反馈，用户体验好 |
| TypeScript | 是，jiti 直接跑 | 和 pi 扩展生态一致 |
| 外部依赖 | 仅 peerDependencies + typebox | 轻量，无 SDK 绑定 |
| 测试框架 | vitest | 社区主流选择 |

---

## 不做的事（明确边界）

- ❌ 不碰 `~/.pi/agent/settings.json`
- ❌ 不碰 `~/.pi/agent/auth.json`
- ❌ 不要求用户设置全局环境变量
- ❌ 不做 OAuth（TinyFish 当前仅 API Key 认证）
- ❌ 不做 Browser CDP（后续 v2 加）
- ❌ 不做 Vault 密码管理器集成（后续 v2 加）

---

## package.json

```json
{
  "name": "pi-tinyfish",
  "version": "0.1.0",
  "description": "TinyFish Web Agent tools for pi — search, fetch, and goal-driven browser automation",
  "type": "module",
  "keywords": ["pi-package", "tinyfish", "web-automation", "search", "fetch", "browser-agent"],
  "license": "MIT",
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  },
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"]
  }
}
```

---

## 安装与使用

### 开发调试

```bash
pi -e ./pi-tinyfish
```

### 本地安装

```bash
pi install ./pi-tinyfish
```

### 发布后

```bash
pi install npm:pi-tinyfish
# 或
pi install git:github.com/<user>/pi-tinyfish@v0.1.0
```

### 使用流程

1. 安装后首次使用会提示未配置 API key
2. 运行 `/tinyfish-login`，粘贴从 [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) 获取的 key
3. 之后 LLM 即可自然调用 TinyFish 工具

---

## 参考项目

- [x1any/pi-tinyfish](https://github.com/x1any/pi-tinyfish) — Search + Fetch 的参考实现（SDK 方式）
- [@llblab/pi-telegram](https://github.com/llblab/pi-telegram) — config 管理模式参考（telegram.json + 0600 + atomic write）
- [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) — OAuth credential 存储参考
- [nicobailon/pi-web-access](https://github.com/nicobailon/pi-web-access) — web-search.json config 模式参考
- [pi-i18n](https://github.com) — state/ 目录约定参考
