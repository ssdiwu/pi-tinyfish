# pi-tinyfish — Agent 规范

## 文件职责与阅读顺序

- 本文件只记录 Pi 扩展长期工程、安全和交付边界；工具清单、安装和配置以 `README.md` 与当前注册实现为准。
- 修改前依次读取 `README.md` / `README-zh.md`、`package.json`、目标源码和测试，不把本文件中的示例当作完整 API 清单。
- `doc/README.md` 是文档导航入口；文档正文分布见其表格，`doc/决策档案/` 存放难逆转决策，`doc/references/` 只放来源与历史材料。根 `PLAN.md` 不存在，当前执行状态以 `README.md`、本文件与 Git 历史为准。

## 项目边界

- 本包通过 TinyFish API 提供搜索、页面提取、浏览器自动化以及运行状态管理；公开工具名称、参数和返回契约必须与注册实现、类型和 README 同步。
- search、fetch、agent run、run get、run list、run cancel 六类当前公开能力都属于兼容面；变更时检查对应测试和文档，不能只验证前三类。
- API Key 只通过 `/tinyfish-login` 或受支持的环境配置进入运行时，不硬编码、不写日志、不放测试夹具。
- URL、页面内容、Agent goal 和远端返回均视为不可信输入；显式处理超时、取消、限流、网络错误和异常 payload。
- 取消远端运行属于外部副作用，必须保持确认和错误反馈语义，不以本地状态猜测远端已取消。
- 不为单一 API 路径提前抽象；新增依赖前先核实现有 SDK、标准库和维护成本。

## 验证

```bash
npm test
```

- 工具注册、鉴权或传输改动还需从当前仓库临时加载扩展，核对六类公开工具可发现，并对受影响路径做定向烟测。
- 真实 API 测试必须使用授权凭据和最小请求；不得在输出中暴露 Key 或敏感页面内容。
- 未执行联网验证时明确区分本地测试与真实 TinyFish 服务状态。

## 文档语言与发布记录

- 对外 README 以英文 `README.md` 为默认入口，配套完整中文 `README-zh.md`；顶部互链，安装、配置、命令、开发、测试与公开契约入口同步到两种语言，链接只指向仓库内真实文件。
- `doc/README.md` 顶部保留简短英文贡献导航，中文导航正文继续维护；公开贡献说明（两份 README 与 `doc/README.md`）同步更新。`AGENTS.md`、ADR、规格与历史材料按主要读者决定语言，内部资料可中文；工具名、命令、配置键、环境变量和 API 字段保持原样。
- 两份变更日志都在本 GitHub 仓库维护：`CHANGELOG.md` 是英文发布记录，`CHANGELOG-zh.md` 是中文日常记录；两份只写用户可感知事实，不写验证日志、内部过程或纯文档整理。
- 日常用中文把已完成的用户可感知变化写入 `CHANGELOG-zh.md`；准备发布（release）时按版本把同一版本的用户可感知条目同步进英文 `CHANGELOG.md`，两份都保留该版本记录，并核对版本、日期与 issue 链接。
- `README.md` 是英文默认版（npm 默认展示），`README-zh.md` 是同包附带的中文版；两份 README 与两份 changelog 都随 npm 包发布。发布前用 `npm pack --dry-run --ignore-scripts --json` 核对清单包含 `README.md`、`README-zh.md`、`CHANGELOG.md`、`CHANGELOG-zh.md`。

## 文档与 Git

- 工具、参数、错误语义、登录方式或安装入口变化时同步 `README.md`、`README-zh.md` 和相关 skill；动态运行结果不写进项目规范。
- 现行机制与规格只保留一份正文（`README.md`、`src/README.md`、`src/tools/README.md` 各管一段）；新增来源或历史材料放 `doc/references/`，本机原始现场放 `.artifacts/`（Git 忽略），不把它们当成并行权威。
- 用户可感知变化按上方「文档语言与发布记录」处理：发布时整理进英文 `CHANGELOG.md`，日常记录留在内部中文 changelog。
- 未经用户明确要求，不执行 commit、push、tag、npm publish 或远端运行取消。
