# Changelog

## 0.2.0 - 2026-08-01

### English

- Add complete English and Chinese UI translations based on ComfyUI's `Comfy.Locale` setting.
- Add official `locales/en` and `locales/zh` node-definition translations.
- Localize buttons, tooltips, errors, placeholders, migration actions, and accessibility labels.
- Add automated tests for locale selection, translation coverage, and formatted labels.
- Verify Chinese and English UI behavior on macOS with Comfy Desktop 1.0.34.

### 中文

- 根据 ComfyUI 的 `Comfy.Locale` 设置自动切换完整的中文或英文界面。
- 使用官方 `locales/en`、`locales/zh` 机制翻译节点名称、说明和端口名称。
- 翻译按钮、工具提示、错误、占位符、迁移操作和无障碍标签。
- 增加语言选择、翻译完整性和格式化标签的自动化测试。
- 已在 macOS、Comfy Desktop 1.0.34 中完成中英文界面验证。

## 0.1.0 - 2026-08-01

- Add a native ComfyUI Nodes 2.0 multi-LoRA widget.
- Support per-row enable, unified strength, ordering, deletion, select all, and local list refresh.
- Preserve workflow serialization and optional MODEL/CLIP connections.
- Add migration from `Power Lora Loader (rgthree)` nodes.
- Add validation, migration tests, documentation, and MIT licensing.
