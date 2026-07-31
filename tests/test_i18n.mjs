import assert from "node:assert/strict";
import test from "node:test";

import { MESSAGES, createTranslator, resolveLanguage } from "../js/i18n.js";

test("resolves ComfyUI Chinese and English locale variants", () => {
  assert.equal(resolveLanguage("zh"), "zh");
  assert.equal(resolveLanguage("zh-CN"), "zh");
  assert.equal(resolveLanguage("zh-TW"), "zh");
  assert.equal(resolveLanguage("en-US"), "en");
  assert.equal(resolveLanguage(["ja-JP", "zh-CN"]), "zh");
  assert.equal(resolveLanguage("ja-JP"), "en");
});

test("keeps both locale dictionaries in sync", () => {
  assert.deepEqual(Object.keys(MESSAGES.zh).sort(), Object.keys(MESSAGES.en).sort());
});

test("formats translated row labels", () => {
  assert.equal(createTranslator("en")("toggleRow", { index: 2 }), "Enable or disable LoRA 2");
  assert.equal(createTranslator("zh")("toggleRow", { index: 2 }), "启用或停用第 2 个 LoRA");
  assert.equal(createTranslator("en")("rowControl", { index: 3, label: "CLIP strength" }), "LoRA 3: CLIP strength");
});
