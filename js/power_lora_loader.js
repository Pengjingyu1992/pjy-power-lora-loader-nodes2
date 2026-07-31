import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { createTranslator, resolveLanguage } from "./i18n.js";

const NODE_ID = "PJYPowerLoraLoaderV2";
const OLD_NODE_ID = "Power Lora Loader (rgthree)";
const STATE_WIDGET_ID = "PJY_POWER_LORA_STATE";
const STATE_VERSION = 1;
const DEFAULT_STATE = Object.freeze({ version: STATE_VERSION, separate_strengths: false, loras: [] });
let widgetSequence = 0;
let cachedLoraNames = null;
let activeLanguage = "en";
let translate = createTranslator(activeLanguage);
const languageRenders = new Set();

function readComfyLanguage() {
  let stored;
  try {
    stored = app?.ui?.settings?.getSettingValue?.("Comfy.Locale")
      ?? app?.extensionManager?.setting?.get?.("Comfy.Locale");
  } catch {
    stored = undefined;
  }
  return resolveLanguage(stored || document.documentElement.lang || navigator.languages || navigator.language);
}

function syncLanguage() {
  const nextLanguage = readComfyLanguage();
  if (nextLanguage === activeLanguage) return false;
  activeLanguage = nextLanguage;
  translate = createTranslator(activeLanguage);
  return true;
}

function refreshLanguageWidgets() {
  if (!syncLanguage()) return;
  languageRenders.forEach((render) => render());
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeState(value) {
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = DEFAULT_STATE;
    }
  }
  if (!source || typeof source !== "object") source = DEFAULT_STATE;

  const loras = Array.isArray(source.loras) ? source.loras : [];
  return {
    version: STATE_VERSION,
    separate_strengths: Boolean(source.separate_strengths),
    loras: loras.map((row, index) => {
      const strengthModel = numberOr(row?.strength_model ?? row?.strength, 1);
      return {
        id: String(row?.id || `row_${index + 1}`),
        enabled: Boolean(row?.enabled ?? row?.on),
        file: String(row?.file ?? row?.lora ?? ""),
        strength_model: strengthModel,
        strength_clip: numberOr(row?.strength_clip ?? row?.strengthTwo, strengthModel),
      };
    }),
  };
}

function encodeState(state) {
  return JSON.stringify(normalizeState(state));
}

function stateFromRgthree(node) {
  const values = node.serialize?.().widgets_values ?? node.widgets_values ?? [];
  const rows = Array.isArray(values)
    ? values.filter((value) => value && typeof value === "object" && typeof value.lora === "string")
    : [];
  const separate = String(node.properties?.["Show Strengths"] || "").toLowerCase().includes("separate");
  return normalizeState({
    version: STATE_VERSION,
    separate_strengths: separate,
    loras: rows.map((row, index) => ({
      id: `row_${index + 1}`,
      enabled: Boolean(row.on),
      file: row.lora,
      strength_model: numberOr(row.strength, 1),
      strength_clip: numberOr(row.strengthTwo, numberOr(row.strength, 1)),
    })),
  });
}

async function loadLoraNames(force = false) {
  if (cachedLoraNames && !force) return cachedLoraNames;
  const response = await api.fetchApi("/object_info/LoraLoader");
  if (!response.ok) throw new Error(translate("loraListLoadFailed", { status: response.status }));
  const data = await response.json();
  const names = data?.LoraLoader?.input?.required?.lora_name?.[0];
  const locale = activeLanguage === "zh" ? "zh-CN" : "en";
  cachedLoraNames = Array.isArray(names) ? [...names].sort((a, b) => a.localeCompare(b, locale)) : [];
  return cachedLoraNames;
}

function addStyles() {
  if (document.getElementById("pjy-power-lora-v2-style")) return;
  const style = document.createElement("style");
  style.id = "pjy-power-lora-v2-style";
  style.textContent = `
    .pjy-pl2 { width:100%; height:100%; min-height:64px; overflow:auto; overscroll-behavior:contain; box-sizing:border-box; color:var(--input-text,#ddd); font:11.5px/1.2 system-ui,-apple-system,sans-serif; user-select:none; }
    .pjy-pl2 * { box-sizing:border-box; }
    .pjy-pl2__toolbar { display:flex; align-items:center; gap:7px; min-height:24px; margin:0 1px 2px; }
    .pjy-pl2__toolbar label { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; color:var(--descrip-text,#aaa); }
    .pjy-pl2__status { flex:1; min-width:30px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--descrip-text,#999); font-variant-numeric:tabular-nums; }
    .pjy-pl2 button, .pjy-pl2 input { font:inherit; color:inherit; }
    .pjy-pl2 button { height:21px; border:0; border-radius:4px; background:transparent; cursor:pointer; padding:0 6px; color:var(--descrip-text,#aaa); }
    .pjy-pl2 button:hover { background:color-mix(in srgb,var(--comfy-input-bg,#242424) 78%,transparent); color:var(--input-text,#eee); }
    .pjy-pl2 button:active { transform:scale(.97); }
    .pjy-pl2 button:focus-visible, .pjy-pl2 input:focus-visible { outline:1px solid #5d9cff; outline-offset:1px; }
    .pjy-pl2 input[type="checkbox"] { margin:0; accent-color:#5d9cff; }
    .pjy-pl2__rows { display:flex; flex-direction:column; }
    .pjy-pl2__row { display:grid; grid-template-columns:13px 18px minmax(120px,1fr) 52px 20px; align-items:center; gap:3px; min-height:27px; padding:2px 1px; border-top:1px solid color-mix(in srgb,var(--border-color,#555) 44%,transparent); background:transparent; }
    .pjy-pl2--separate .pjy-pl2__row { grid-template-columns:13px 18px minmax(106px,1fr) 50px 50px 20px; }
    .pjy-pl2__row:hover { background:color-mix(in srgb,var(--comfy-input-bg,#242424) 42%,transparent); }
    .pjy-pl2__row[data-disabled="true"] .pjy-pl2__file, .pjy-pl2__row[data-disabled="true"] .pjy-pl2__strength { opacity:.5; }
    .pjy-pl2__drag { cursor:grab; text-align:center; color:var(--descrip-text,#999); opacity:.22; }
    .pjy-pl2__row:hover .pjy-pl2__drag { opacity:.7; }
    .pjy-pl2__file, .pjy-pl2__strength { width:100%; height:21px; min-width:0; border:1px solid transparent; border-radius:4px; background:transparent; padding:0 4px; outline:none; }
    .pjy-pl2__file:hover, .pjy-pl2__strength:hover { background:color-mix(in srgb,var(--comfy-input-bg,#181818) 72%,transparent); }
    .pjy-pl2__file:focus, .pjy-pl2__strength:focus { border-color:#5d9cff; background:var(--comfy-input-bg,#181818); }
    .pjy-pl2__file[data-missing="true"] { border-color:#e05252; color:#ff9a9a; }
    .pjy-pl2__icon { width:20px; padding:0!important; opacity:.32; }
    .pjy-pl2__row:hover .pjy-pl2__icon { opacity:.82; }
    .pjy-pl2__empty { padding:13px 5px; border-top:1px solid color-mix(in srgb,var(--border-color,#555) 44%,transparent); text-align:center; color:var(--descrip-text,#999); }
  `;
  document.head.appendChild(style);
}

function createPowerLoraWidget(node, inputName, inputData) {
  if (node.__pjyPowerLoraMounted) return { widget: node.__pjyPowerLoraWidget };
  node.__pjyPowerLoraMounted = true;

  let state = normalizeState(inputData?.[1]?.default ?? DEFAULT_STATE);
  let loraNames = cachedLoraNames || [];
  let draggedIndex = -1;
  let lastLayoutKey = "";
  const listId = `pjy-pl2-list-${++widgetSequence}`;
  const root = document.createElement("div");
  root.className = "pjy-pl2";
  const datalist = document.createElement("datalist");
  datalist.id = listId;
  root.appendChild(datalist);

  const syncWidget = () => {
    node.graph?.change?.();
  };

  const updateDatalist = () => {
    datalist.replaceChildren(...loraNames.map((name) => {
      const option = document.createElement("option");
      option.value = name;
      return option;
    }));
  };

  const resizeNode = () => {
    const layoutKey = `${state.loras.length}:${state.separate_strengths}`;
    if (lastLayoutKey === layoutKey) return;
    lastLayoutKey = layoutKey;
    const currentWidth = Number(node.size?.[0]) || 0;
    const currentHeight = Number(node.size?.[1]) || 0;
    const width = Math.max(currentWidth, state.separate_strengths ? 480 : 390);
    const height = Math.max(112, 84 + state.loras.length * 29);
    if (Math.abs(currentWidth - width) > 0.5 || Math.abs(currentHeight - height) > 0.5) {
      node.setSize?.([width, height]);
    }
  };

  const render = () => {
    syncLanguage();
    root.querySelectorAll(":scope > :not(datalist)").forEach((element) => element.remove());
    root.classList.toggle("pjy-pl2--separate", state.separate_strengths);

    const toolbar = document.createElement("div");
    toolbar.className = "pjy-pl2__toolbar";

    const allLabel = document.createElement("label");
    const allToggle = document.createElement("input");
    allToggle.type = "checkbox";
    allToggle.setAttribute("aria-label", translate("toggleAll"));
    const enabledCount = state.loras.filter((row) => row.enabled).length;
    allToggle.checked = state.loras.length > 0 && enabledCount === state.loras.length;
    allToggle.indeterminate = enabledCount > 0 && enabledCount < state.loras.length;
    allToggle.addEventListener("change", () => {
      state.loras.forEach((row) => { row.enabled = allToggle.checked; });
      syncWidget();
      render();
    });
    allLabel.append(allToggle, translate("selectAll"));

    const mergeButton = state.separate_strengths ? document.createElement("button") : null;
    if (mergeButton) {
      mergeButton.type = "button";
      mergeButton.title = translate("mergeStrengthsTitle");
      mergeButton.textContent = translate("mergeStrengths");
      mergeButton.addEventListener("click", () => {
        state.loras.forEach((row) => { row.strength_clip = row.strength_model; });
        state.separate_strengths = false;
        syncWidget();
        render();
      });
    }

    const status = document.createElement("span");
    status.className = "pjy-pl2__status";
    status.title = translate("enabledCount");
    status.setAttribute("aria-live", "polite");
    status.textContent = `${enabledCount}/${state.loras.length}`;

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.title = translate("refreshList");
    refreshButton.setAttribute("aria-label", translate("refreshList"));
    refreshButton.textContent = "↻";
    refreshButton.addEventListener("click", async () => {
      refreshButton.disabled = true;
      status.textContent = translate("refreshing");
      try {
        loraNames = await loadLoraNames(true);
        updateDatalist();
        render();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        refreshButton.disabled = false;
      }
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+ LoRA";
    addButton.setAttribute("aria-label", translate("addLora"));
    addButton.addEventListener("click", () => {
      const next = state.loras.length + 1;
      state.loras.push({
        id: `row_${Date.now()}_${next}`,
        enabled: true,
        file: "",
        strength_model: 1,
        strength_clip: 1,
      });
      syncWidget();
      render();
      root.querySelector(".pjy-pl2__row:last-child .pjy-pl2__file")?.focus();
    });

    toolbar.appendChild(allLabel);
    if (mergeButton) toolbar.appendChild(mergeButton);
    toolbar.append(status, refreshButton, addButton);
    root.appendChild(toolbar);

    const rows = document.createElement("div");
    rows.className = "pjy-pl2__rows";
    if (!state.loras.length) {
      const empty = document.createElement("div");
      empty.className = "pjy-pl2__empty";
      empty.textContent = translate("emptyList");
      rows.appendChild(empty);
    }

    state.loras.forEach((row, index) => {
      const rowElement = document.createElement("div");
      rowElement.className = "pjy-pl2__row";
      rowElement.dataset.disabled = String(!row.enabled);
      rowElement.addEventListener("dragover", (event) => event.preventDefault());
      rowElement.addEventListener("drop", (event) => {
        event.preventDefault();
        if (draggedIndex < 0 || draggedIndex === index) return;
        const [moved] = state.loras.splice(draggedIndex, 1);
        state.loras.splice(index, 0, moved);
        draggedIndex = -1;
        syncWidget();
        render();
      });

      const drag = document.createElement("span");
      drag.className = "pjy-pl2__drag";
      drag.title = translate("dragToReorder");
      drag.textContent = "⠿";
      drag.draggable = true;
      drag.setAttribute("role", "button");
      drag.setAttribute("aria-label", translate("dragToReorder"));
      drag.addEventListener("dragstart", (event) => {
        draggedIndex = index;
        event.dataTransfer?.setData("text/plain", row.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });
      drag.addEventListener("dragend", () => { draggedIndex = -1; });

      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.checked = row.enabled;
      enabled.title = translate("toggleEnabled");
      enabled.setAttribute("aria-label", translate("toggleRow", { index: index + 1 }));
      enabled.addEventListener("change", () => {
        row.enabled = enabled.checked;
        syncWidget();
        render();
      });

      const file = document.createElement("input");
      file.className = "pjy-pl2__file";
      file.type = "text";
      file.value = row.file;
      file.setAttribute("list", listId);
      file.placeholder = translate("filePlaceholder");
      file.autocomplete = "off";
      file.spellcheck = false;
      file.setAttribute("aria-label", translate("fileRow", { index: index + 1 }));
      const updateMissing = () => {
        const missing = Boolean(file.value) && loraNames.length > 0 && !loraNames.includes(file.value);
        file.dataset.missing = String(missing);
        file.title = missing ? translate("missingFile") : file.value;
      };
      updateMissing();
      file.addEventListener("input", () => {
        row.file = file.value;
        updateMissing();
        syncWidget();
      });

      const makeStrength = (key, title) => {
        const input = document.createElement("input");
        input.className = "pjy-pl2__strength";
        input.type = "number";
        input.min = "-100";
        input.max = "100";
        input.step = "0.05";
        input.value = String(row[key]);
        input.title = title;
        input.setAttribute("aria-label", translate("rowControl", { index: index + 1, label: title }));
        input.addEventListener("input", () => {
          if (!Number.isFinite(input.valueAsNumber)) return;
          row[key] = input.valueAsNumber;
          if (!state.separate_strengths && key === "strength_model") row.strength_clip = row.strength_model;
          syncWidget();
        });
        input.addEventListener("change", () => {
          if (!Number.isFinite(input.valueAsNumber)) input.value = String(row[key]);
        });
        return input;
      };

      const modelStrength = makeStrength(
        "strength_model",
        translate(state.separate_strengths ? "modelStrength" : "unifiedStrength"),
      );
      const clipStrength = state.separate_strengths
        ? makeStrength("strength_clip", translate("clipStrength"))
        : null;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "pjy-pl2__icon";
      remove.title = translate("remove");
      remove.textContent = "×";
      remove.setAttribute("aria-label", translate("removeRow", { index: index + 1 }));
      remove.addEventListener("click", () => {
        state.loras.splice(index, 1);
        syncWidget();
        render();
      });

      rowElement.append(drag, enabled, file, modelStrength);
      if (clipStrength) rowElement.appendChild(clipStrength);
      rowElement.appendChild(remove);
      rows.appendChild(rowElement);
    });

    root.appendChild(rows);
    resizeNode();
  };

  const domWidget = node.addDOMWidget(inputName, STATE_WIDGET_ID, root, {
    getMinHeight: () => 64,
    hideOnZoom: false,
    getValue: () => encodeState(state),
    setValue: (value) => {
      state = normalizeState(value);
      render();
    },
  });
  domWidget.element.style.pointerEvents = "auto";
  node.__pjyPowerLoraWidget = domWidget;
  languageRenders.add(render);

  const originalConfigure = node.onConfigure;
  node.onConfigure = function (info) {
    originalConfigure?.call(this, info);
    lastLayoutKey = "";
    render();
  };

  const originalRemoved = node.onRemoved;
  node.onRemoved = function () {
    languageRenders.delete(render);
    originalRemoved?.apply(this, arguments);
  };

  node.__pjyPowerLoraSetState = (value) => {
    state = normalizeState(value);
    syncWidget();
    render();
  };

  updateDatalist();
  render();
  loadLoraNames().then((names) => {
    loraNames = names;
    updateDatalist();
    render();
  }).catch(() => {});

  return { widget: domWidget, minWidth: 390, minHeight: 112 };
}

function migrateRgthreeNode(node) {
  const graph = node.graph || app.graph;
  const liteGraph = globalThis.LiteGraph;
  if (!graph || !liteGraph?.createNode) return;

  const incoming = (node.inputs || []).map((input, targetSlot) => {
    const link = input.link == null ? null : graph.links?.[input.link];
    return link ? { originId: link.origin_id, originSlot: link.origin_slot, targetSlot } : null;
  }).filter(Boolean);
  const outgoing = [];
  (node.outputs || []).forEach((output, originSlot) => {
    for (const linkId of output.links || []) {
      const link = graph.links?.[linkId];
      if (link) outgoing.push({ originSlot, targetId: link.target_id, targetSlot: link.target_slot });
    }
  });

  graph.beforeChange?.();
  try {
    const replacement = liteGraph.createNode(NODE_ID);
    if (!replacement) throw new Error(translate("migrationCreateFailed"));
    graph.add(replacement);
    replacement.pos = [node.pos[0] + node.size[0] + 60, node.pos[1]];
    replacement.color = node.color;
    replacement.bgcolor = node.bgcolor;
    replacement.__pjyPowerLoraSetState?.(stateFromRgthree(node));

    for (const link of incoming) {
      graph.getNodeById(link.originId)?.connect(link.originSlot, replacement, link.targetSlot);
    }
    for (const link of outgoing) {
      replacement.connect(link.originSlot, graph.getNodeById(link.targetId), link.targetSlot);
    }
    node.mode = 4;
    node.title = `${node.title || OLD_NODE_ID}${translate("migratedSuffix")}`;
    graph.change?.();
    app.canvas?.selectNode?.(replacement);
    app.canvas?.setDirty?.(true, true);
  } finally {
    graph.afterChange?.();
  }
}

addStyles();

syncLanguage();
window.addEventListener("languagechange", refreshLanguageWidgets);
new MutationObserver(refreshLanguageWidgets).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

app.registerExtension({
  name: "pjy.power-lora-loader.nodes2",

  getCustomWidgets() {
    return {
      [STATE_WIDGET_ID]: (node, inputName, inputData) => createPowerLoraWidget(node, inputName, inputData),
    };
  },

  getNodeMenuItems(node) {
    if (node.comfyClass !== OLD_NODE_ID && node.type !== OLD_NODE_ID) return [];
    return [
      null,
      {
        content: translate("migrateMenu"),
        callback: () => migrateRgthreeNode(node),
      },
    ];
  },
});
