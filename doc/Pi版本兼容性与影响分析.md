# Pi 版本兼容性与影响分析

> 记录上游 Pi 更新对本项目的直接影响和可改进点，供维护决策参考。

---

## 适用范围

本文档跟踪的 Pi 更新基线：**2026-06-09 发布版**

核心变更：
- RPC extension UI request/response 类型正式导出（#5455）
- Package asset path helpers 正式导出（#5415）
- Project trust（项目信任门控）
- 其他 TUI / 输入处理修复

---

## 影响评估：✅ 正向机会 — RPC UI 类型导出强化类型安全

### 变更详情

> Exported RPC extension UI request and response types from the public API (#5455)

### 当前代码状态

`extensions/index.ts` 使用了 `ctx.ui` 的多种交互方法：

```ts
// 当前已有 UI 交互
ctx.ui.confirm(...)      // 登录确认
ctx.ui.notify(...)       // 通知消息
```

工具层（`tools/*.ts`）目前主要返回结构化数据，不直接调用 `ctx.ui`。

### 影响

| 维度 | 说明 |
|------|------|
| 当前类型安全 | ✅ `confirm` / `notify` 等基础方法已有类型约束 |
| RPC 模式兼容性 | 如果未来 tinyfish 需要 RPC 远程模式（如通过 ACP/编辑器插件使用），UI request/response 类型的官方导出可以保证协议兼容 |
| Asset path helpers | 如果 tinyfish 需要定位自身包内的资源文件（如默认配置模板），helpers 可简化路径解析 |

### 建议

1. **[ ] 升级验证** 下次升级 `@earendil-works/pi-coding-agent` peerDep 时，检查新增的公开导出：
   - RPC UI request / response 类型
   - Asset path helpers
2. **[ ] 可选** 如果新增了 `ExtensionUIRequest` / `ExtensionUIResponse` 等类型，考虑在工具层的 TypeScript 类型注解中使用
3. **[ ] 可选** 如果 `getPackageAssetPath()` 等 helper 存在，用于替代硬编码路径拼接

### 优先级

🟢 **低优先级，随版本迭代顺手做** — 当前功能完全正常，类型导出是锦上添花。

---

## 次要关联

| 变更项 | 影响 | 说明 |
|--------|------|------|
| Project Trust | 🔵 无 | tinyfish 作为全局扩展安装，不依赖项目本地资源 |
| Compaction prompt | 🔵 无 | tinyfish 不参与 compaction 流程 |
| Skill prompt 间距 | ⚠️ 微小利好 | tinyfish 同时包含 skills/ 目录，skill 包装的 prompt 间距已修复 |
| TUI / 输入修复 | 🔵 无 | tinyfish 工具不涉及 TUI 输入组件 |
| 包导出 ./hooks 清理 | 🔵 无 | tinyfish 的 `files` 字段只包含 `extensions/`、`skills/`、README 等 |

---

## 版本记录

| 日期 | Pi 基线 | 变更 |
|------|---------|------|
| 2026-06-09 | 2026-06-09 发布版 | 初版创建；标记 RPC UI 类型导出为正向机会 |
