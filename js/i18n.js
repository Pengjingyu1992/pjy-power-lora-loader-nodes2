export const MESSAGES = Object.freeze({
  en: Object.freeze({
    loraListLoadFailed: "Failed to load the LoRA list ({status})",
    toggleAll: "Enable or disable all LoRAs",
    selectAll: "All",
    mergeStrengthsTitle: "Merge MODEL and CLIP strengths into one value",
    mergeStrengths: "Merge strengths",
    enabledCount: "Enabled / total",
    refreshList: "Refresh the LoRA list",
    refreshing: "Refreshing…",
    addLora: "Add LoRA",
    emptyList: "Add a LoRA",
    dragToReorder: "Drag to reorder",
    toggleEnabled: "Enable / disable",
    toggleRow: "Enable or disable LoRA {index}",
    fileRow: "LoRA file {index}",
    filePlaceholder: "Type or select a LoRA…",
    missingFile: "This LoRA file was not found",
    modelStrength: "MODEL strength",
    unifiedStrength: "Strength",
    clipStrength: "CLIP strength",
    rowControl: "LoRA {index}: {label}",
    remove: "Remove",
    removeRow: "Remove LoRA {index}",
    migrationCreateFailed: "Could not create Power LoRA Loader 2.0",
    migratedSuffix: " (migrated / bypassed)",
    migrateMenu: "Migrate to: Power LoRA Loader 2.0",
  }),
  zh: Object.freeze({
    loraListLoadFailed: "LoRA 列表读取失败（{status}）",
    toggleAll: "全部启用或停用",
    selectAll: "全选",
    mergeStrengthsTitle: "把模型与 CLIP 强度合并为统一强度",
    mergeStrengths: "合并强度",
    enabledCount: "已启用 / 总数",
    refreshList: "刷新 LoRA 列表",
    refreshing: "正在刷新…",
    addLora: "添加 LoRA",
    emptyList: "添加一个 LoRA",
    dragToReorder: "拖动排序",
    toggleEnabled: "启用 / 停用",
    toggleRow: "启用或停用第 {index} 个 LoRA",
    fileRow: "第 {index} 个 LoRA 文件",
    filePlaceholder: "输入或选择 LoRA…",
    missingFile: "未找到这个 LoRA 文件",
    modelStrength: "模型强度",
    unifiedStrength: "统一强度",
    clipStrength: "CLIP 强度",
    rowControl: "第 {index} 个 LoRA：{label}",
    remove: "删除",
    removeRow: "删除第 {index} 个 LoRA",
    migrationCreateFailed: "无法创建权重 LoRA 加载器 2.0",
    migratedSuffix: "（已迁移 / 旁路）",
    migrateMenu: "迁移为：权重 LoRA 加载器 2.0",
  }),
});

export function resolveLanguage(value, fallback = "en") {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    const locale = String(candidate ?? "").trim().toLowerCase();
    if (locale.startsWith("zh")) return "zh";
    if (locale.startsWith("en")) return "en";
  }
  return fallback === "zh" ? "zh" : "en";
}

export function createTranslator(language) {
  const locale = resolveLanguage(language);
  return (key, values = {}) => {
    const template = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
    ));
  };
}
