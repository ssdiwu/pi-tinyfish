# pi-tinyfish

[English](./README.md) · 简体中文

为 **pi** 提供的 TinyFish Web Agent 工具——搜索、抓取和目标驱动的浏览器自动化。

## 工具

| 工具 | API | 说明 |
|------|-----|------|
| `tinyfish_search` | Search API | 网页搜索，返回排序结果、摘要与 URL |
| `tinyfish_fetch` | Fetch API | 渲染 URL 并提取干净内容（markdown/html/json） |
| `tinyfish_agent_run` | Agent API (SSE) | 目标驱动的浏览器自动化，带实时进度 |
| `tinyfish_run_get` | Runs API | 查询指定自动化运行状态与结果 |
| `tinyfish_run_list` | Runs API | 列出／搜索历史自动化运行 |
| `tinyfish_run_cancel` | Runs API | 取消正在进行的运行 |

## 安装

1. 安装：

```bash
pi install npm:pi-tinyfish-tools
# 或本地：
pi install ./pi-tinyfish
```

2. 配置 TinyFish API key（可从 [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) 获取）：

```
/tinyfish-login
```

3. 查看状态：

```
/tinyfish-status
```

## 配置

API key 与默认值保存在 `~/.pi/agent/pi-tinyfish.json`（权限 `0600`）；无需全局变量。

```json
{
  "apiKey": "tf_xxx",
  "defaultLocation": "US",
  "defaultLanguage": "en",
  "defaultFetchFormat": "markdown",
  "defaultBrowserProfile": "lite"
}
```

回退：CI／调试时可用 `TINYFISH_API_KEY` 环境变量。

## 命令

| 命令 | 说明 |
|------|------|
| `/tinyfish-login` | 交互式输入 TinyFish API key |
| `/tinyfish-status` | 显示配置状态（不暴露 key） |
| `/tinyfish-logout` | 删除已保存的 API key |

## 开发、测试与公开契约入口

请从源码仓库打开下列贡献约定、文档索引和测试指南。

```bash
npm install          # peer deps
npm test             # vitest
pi -e .             # 加载扩展做测试
```

- 开发与贡献规则：[`AGENTS.md`](./AGENTS.md) 与 [`doc/README.md`](./doc/README.md)。
- 测试：[`tests/README.md`](./tests/README.md)——配置、TinyFish API 客户端、输出格式与工具结果投影；运行 `npm test`。
- 公开工具契约：字段级三层结果契约与各工具摘要文字见 [`src/tools/README.md`](./src/tools/README.md)；注册工具实现在 [`src/tools/`](./src/tools/)，扩展入口在 [`index.ts`](./index.ts)。

## 工具结果 UI

工具结果遵循三层信息模型：LLM 拿到完整信息，用户屏幕上只显示需要的内容：

- `content` — 完整输出，进入下一轮对话，不会静默截断。
- `details` — 紧凑的结构化摘要（status、count、urls），供 `renderResult` 使用并保存在会话状态中。
- `renderResult` — 给人看的视图：默认一行摘要，按 `Ctrl+O`（`app.tools.expand`）展开完整 markdown。

以上适用于全部六个工具。字段级契约与各工具摘要文字见 [src/tools/README.md](./src/tools/README.md)。

## 目录结构

```
index.ts               # 标准包入口——重新导出 src/index.ts
src/                   # Extension（扩展）实现
  index.ts             #   注册工具与 /命令
  api.ts               #   TinyFish REST/SSE 客户端
  config.ts            #   ~/.pi/agent/pi-tinyfish.json 读写
  format.ts            #   输出文本格式化
  render.ts            #   共享 renderResult 帮助函数
  tools/               #   每个注册工具一个文件
skills/
  tinyfish/
    SKILL.md           # 面向 agent 的使用指引
```

每个文件的职责与实现约定见 [src/README.md](./src/README.md)。

## 文档

[doc/README.md](./doc/README.md) 是仓库文档的导航入口——现行机制、决策档案（`doc/决策档案/`）与来源／历史（`doc/references/`）。

## 设计说明

- 六个工具都是**同步**的——`execute()` 等待完整响应；不使用后台运行，也不注入 `pi.sendMessage`。LLM 在正常的工具调用返回中看到结果。
- `details` 是可折叠摘要的唯一来源；`content` 是 LLM 上下文的唯一来源；二者有意互不推导。
- `truncateOutput`（format.ts）只在调用方传入 `maxBytes` 时裁剪 `content`；绝不静默去掉 LLM 需要的数据。
