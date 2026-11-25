# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的基本格式。带 tag 的发布以 Git tag 为版本号；已发布版本由发布负责人负责维护英文 `CHANGELOG.md`，本文件是对应版本的中文镜像。两份日志只记录用户可感知事实，日常用中文记录，准备发布（release）时按版本同步到英文，并都随 npm 包发布。

新发布使用 `## [x.y.z] - YYYY-MM-DD` 格式的标题；条目可唯一对应 GitHub issue 时，在末尾附 `(#xx)`。历史条目保留原有标题格式。

## [Unreleased]

## [0.2.3] - 2026-11-25

### Changed

- 六个 TinyFish 工具均可在 Pi 1.6.0 中加载。`tinyfish_fetch` 会将 `imageLinks` 传给服务端，按请求提取图片链接。

## [0.2.2] - 2026-07-16

### Changed

- **可读的工具结果投影**：TinyFish 事件与运行结果现在展示完整文本字段树；默认显示摘要，展开后不再显示原始 JSON。
