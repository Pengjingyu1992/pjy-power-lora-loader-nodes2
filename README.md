# PJY Power LoRA Loader for Nodes 2.0

A compact multi-LoRA loader built for ComfyUI Nodes 2.0. It does not modify or depend on rgthree.

为 ComfyUI Nodes 2.0 设计的简洁多 LoRA 加载器，不修改、也不依赖 rgthree。

Current version / 当前版本：`0.2.1`

## What's new in 0.2.1 / 0.2.1 更新说明

### English

- Reopening an existing LoRA field shows the full installed list, so you can switch files without deleting the row.
- Leaving the field without choosing a replacement keeps the saved LoRA. Replacing a file preserves the row's strengths and enabled state.
- Verified the switching behavior on macOS with Comfy Desktop 1.1.3.

### 中文

- 重新打开已选 LoRA 的输入框时显示完整安装列表，可以直接切换文件，无需删除该行。
- 未选择替代文件就离开输入框时保留原 LoRA；替换文件时保留该行强度和启用状态。
- 已在 macOS、Comfy Desktop 1.1.3 中验证切换行为。

## Features / 功能

- Enable or disable each LoRA independently / 逐行启用或停用 LoRA
- One strength control by default / 默认使用单一强度
- Preserves separate MODEL and CLIP strengths migrated from older workflows / 兼容旧工作流中的 MODEL、CLIP 双强度
- Search or type LoRA filenames / 搜索或输入 LoRA 文件名
- Drag to reorder, delete, select all, and refresh / 拖动排序、删除、全选和刷新
- Node height follows the number of rows / 节点高度随 LoRA 数量自动调整
- Workflow save, clone, copy/paste, and API serialization / 支持工作流保存、克隆、复制粘贴和 API 序列化
- Optional migration from `Power Lora Loader (rgthree)` / 可选迁移 rgthree 的旧节点
- Follows ComfyUI's Chinese or English language setting / 跟随 ComfyUI 的中文或英文语言设置

Node name / 节点名称：`Power LoRA Loader 2.0` / `权重 LoRA 加载器 2.0`
Node ID / 内部类型：`PJYPowerLoraLoaderV2`  
Category / 分类：`loaders/LoRA`

## Requirements / 环境要求

- ComfyUI `0.29.0` or newer
- ComfyUI frontend `1.47.11` or newer
- Nodes 2.0 enabled
- No additional Python or frontend dependencies

The current release's LoRA switching behavior was verified on macOS with Comfy Desktop `1.1.3`. The code contains no OS-specific paths or APIs and is intended to work on Windows and Linux, but those systems have not yet been verified by the maintainer. Please report platform-specific problems with the information listed in [Contributing](CONTRIBUTING.md).

当前版本的 LoRA 切换行为已在 macOS、Comfy Desktop `1.1.3` 上验证。代码不包含操作系统专用路径或 API，设计上可用于 Windows 和 Linux，但维护者尚未在这两个系统上实测。遇到平台问题，请按 [参与测试](CONTRIBUTING.md) 中的格式反馈。

## Installation / 安装

### Git clone

Open a terminal in `ComfyUI/custom_nodes` and run / 在 `ComfyUI/custom_nodes` 中打开终端并运行：

```bash
git clone https://github.com/Pengjingyu1992/pjy-power-lora-loader-nodes2.git
```

Restart ComfyUI after installation / 安装后重启 ComfyUI。

### ZIP download

1. Download the source ZIP from GitHub Releases.
2. Extract it into `ComfyUI/custom_nodes`.
3. Make sure the final folder is named `pjy-power-lora-loader-nodes2` and directly contains `__init__.py`.
4. Restart ComfyUI.

1. 从 GitHub Releases 下载源码 ZIP。
2. 解压到 `ComfyUI/custom_nodes`。
3. 确认最终目录名为 `pjy-power-lora-loader-nodes2`，且目录内直接包含 `__init__.py`。
4. 重启 ComfyUI。

## Usage / 使用

1. Add `Power LoRA Loader 2.0` / `权重 LoRA 加载器 2.0` from `loaders/LoRA`.
2. Connect MODEL and/or CLIP.
3. Select `+ LoRA`, choose a file, set its strength, and enable the row.
4. LoRAs are applied from top to bottom.

默认只显示一个统一强度。只有从旧工作流迁移来的独立 MODEL/CLIP 强度才会显示双强度；可点击“合并强度”恢复简洁界面。

排序只能从每行左侧拖拽柄开始，因此编辑文件名或强度时不会误触拖动。

The node reads ComfyUI's `Comfy.Locale` setting and provides a complete English and Chinese UI. `zh-*` locale variants use the Chinese fallback. If the node is already open when you change the language, reload the ComfyUI page once.

节点读取 ComfyUI 的 `Comfy.Locale` 设置，提供完整中英文界面；`zh-*` 语言变体使用中文回退。如果切换语言时节点已经打开，请重新加载一次 ComfyUI 页面。

## Migrating from rgthree / 从 rgthree 迁移

Right-click an existing `Power Lora Loader (rgthree)` node and choose `迁移为：权重 LoRA 加载器 2.0`. The extension creates and reconnects the new node, then bypasses the old one.

For offline workflow-file migration, always write to a new output file first:

```bash
python scripts/migrate_workflow.py input_workflow.json migrated_workflow.json
```

迁移脚本使用 Python 标准库和跨平台 `pathlib` 路径，不要求 ComfyUI 正在运行。请先输出到新文件并检查结果，不要直接覆盖唯一的工作流副本。

## Privacy and network access / 隐私与网络

This node contains no API key, telemetry, analytics, update checker, model downloader, or external network request. The refresh button only requests the local ComfyUI `/object_info/LoraLoader` endpoint to read the installed LoRA list.

本节点不包含 API Key、遥测、统计、更新检查、模型下载或外部网络请求。刷新按钮只访问本地 ComfyUI 的 `/object_info/LoraLoader` 接口，用来读取已经安装的 LoRA 列表。

## Development / 开发检查

Run tests inside a compatible ComfyUI Python environment:

```bash
python -m unittest discover -s tests -v
node --check js/power_lora_loader.js
node --test tests/test_i18n.mjs
```

## License

[MIT](LICENSE)
