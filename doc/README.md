# pi-tinyfish 文档入口

本文件只做导航，不重复正文。每份文档各有一处权威副本。

## 从这里开始

| 我想知道 | 去哪读 |
|---|---|
| 怎么安装、怎么用、六个工具是什么 | [../README.md](../README.md) |
| 仓库里有哪些文档、该读哪一份 | 本文件 |
| 工程、安全与交付边界；改动的验证方式 | [../AGENTS.md](../AGENTS.md) |
| 源码结构与实现约定 | [../src/README.md](../src/README.md) |
| 每个工具的返回契约与三层结果模型字段级规格 | [../src/tools/README.md](../src/tools/README.md) |
| agent 侧使用指引 | [../skills/tinyfish/README.md](../skills/tinyfish/README.md) |
| 难逆转决策的刻碑 | [决策档案/README.md](./决策档案/README.md) |
| 上游版本影响评估等来源与历史记录 | [references/](./references/) |

根 `PLAN.md`（当前执行状态）：**无** —— 本项目无独立执行状态正文；当前状态以 `README.md`、`AGENTS.md` 与 Git 历史为准。

## 分层约定

- `README.md` 与 `src/README.md`、`src/tools/README.md`：现行机制与规格的正文，每项只有一处。
- `doc/决策档案/`：难逆转决策，修订以「后记」追加，不改写原文。
- `doc/references/`：只保存来源、验证记录与历史阶段材料，不作为现行权威，也不维护第二份正文。
- 本机原始现场（截图、抓包、原始日志）放仓库根 `.artifacts/`，已被 Git 忽略，不随仓库分发。

## 证据与历史（`doc/references/`）

| 文件 | 内容 |
|---|---|
| [Pi版本兼容性与影响分析.md](./references/Pi版本兼容性与影响分析.md) | 上游 Pi 2026-06-09 基线对本项目的影响评估与待办勾选项（历史评估，非现行机制） |
| [ISSUE-1-原始设计方案.md](./references/ISSUE-1-原始设计方案.md) | 早期完整设计方案原文（Git 历史 `1a44d06^` 的 `ISSUE-1.md` 恢复副本，仅作来源证据，非现行权威） |

## 维护规则

- 工具、参数、错误语义、登录方式或安装入口变化时同步 `README.md` 与相关 skill。
- 机制或规格变化 → 更新对应正文；难逆转决策 → 新增 ADR 并同步决策档案索引。
- 用户可感知的已完成变化 → `CHANGELOG.md`；动态运行结果与本机原始现场不写入正文。
