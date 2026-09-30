import asyncio
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import tomllib
import unittest
from unittest import mock


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
COMFYUI_ROOT = PLUGIN_ROOT.parents[1]
sys.path.insert(0, str(COMFYUI_ROOT))
SPEC = importlib.util.spec_from_file_location("pjy_power_lora_loader", PLUGIN_ROOT / "__init__.py")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)

MIGRATION_SPEC = importlib.util.spec_from_file_location(
    "pjy_power_lora_migration",
    PLUGIN_ROOT / "scripts" / "migrate_workflow.py",
)
MIGRATION = importlib.util.module_from_spec(MIGRATION_SPEC)
sys.modules[MIGRATION_SPEC.name] = MIGRATION
MIGRATION_SPEC.loader.exec_module(MIGRATION)


class FakeLoraLoader:
    calls = []

    def load_lora(self, model, clip, name, strength_model, strength_clip):
        self.calls.append((name, strength_model, strength_clip))
        return (f"{model}>{name}", f"{clip}>{name}")


class PowerLoraLoaderTests(unittest.TestCase):
    def setUp(self):
        FakeLoraLoader.calls = []

    def test_decode_accepts_canonical_state(self):
        rows = MODULE.decode_lora_state(json.dumps({
            "version": 1,
            "loras": [{
                "enabled": True,
                "file": "folder/test.safetensors",
                "strength_model": 0.7,
                "strength_clip": 0.4,
            }],
        }))
        self.assertEqual(rows, [(True, "folder/test.safetensors", 0.7, 0.4)])

    def test_execute_applies_enabled_rows_in_order(self):
        state = json.dumps({
            "version": 1,
            "loras": [
                {"enabled": False, "file": "skip.safetensors", "strength_model": 1, "strength_clip": 1},
                {"enabled": True, "file": "first.safetensors", "strength_model": 0.6, "strength_clip": 0.3},
                {"enabled": True, "file": "second.safetensors", "strength_model": 0.8, "strength_clip": 0.9},
            ],
        })
        with mock.patch.object(MODULE, "LoraLoader", FakeLoraLoader):
            output = MODULE.PJYPowerLoraLoaderV2.execute(state, model="model", clip="clip")
        self.assertEqual(FakeLoraLoader.calls, [
            ("first.safetensors", 0.6, 0.3),
            ("second.safetensors", 0.8, 0.9),
        ])
        self.assertEqual(output.result, ("model>first.safetensors>second.safetensors", "clip>first.safetensors>second.safetensors"))

    def test_invalid_number_is_rejected(self):
        state = json.dumps({"loras": [{"enabled": True, "file": "x", "strength_model": "bad"}]})
        with self.assertRaisesRegex(ValueError, "模型强度"):
            MODULE.decode_lora_state(state)

    def test_unsupported_state_version_is_rejected(self):
        state = json.dumps({"version": 2, "loras": []})
        with self.assertRaisesRegex(ValueError, "不支持的 LoRA 配置版本"):
            MODULE.decode_lora_state(state)

    def test_decode_preserves_platform_specific_and_unicode_lora_names(self):
        state = json.dumps({
            "version": 1,
            "loras": [
                {"enabled": True, "file": "人物/写真.safetensors", "strength_model": 1, "strength_clip": 1},
                {"enabled": True, "file": "characters\\portrait.safetensors", "strength_model": 1, "strength_clip": 1},
            ],
        })
        rows = MODULE.decode_lora_state(state)
        self.assertEqual(rows[0][1], "人物/写真.safetensors")
        self.assertEqual(rows[1][1], "characters\\portrait.safetensors")

    def test_schema_is_v3_and_keeps_connections_optional(self):
        schema = MODULE.PJYPowerLoraLoaderV2.define_schema()
        self.assertEqual(schema.node_id, "PJYPowerLoraLoaderV2")
        self.assertTrue(schema.inputs[0].optional)
        self.assertTrue(schema.inputs[1].optional)
        self.assertEqual(schema.inputs[2].get_io_type(), "PJY_POWER_LORA_STATE")
        self.assertEqual([output.io_type for output in schema.outputs], ["MODEL", "CLIP"])

    def test_locale_files_cover_the_node_definition(self):
        expected_names = {
            "en": "Power LoRA Loader 2.0",
            "zh": "权重 LoRA 加载器 2.0",
        }
        for language, expected_name in expected_names.items():
            locale_file = PLUGIN_ROOT / "locales" / language / "nodeDefs.json"
            node_definition = json.loads(locale_file.read_text(encoding="utf-8"))["PJYPowerLoraLoaderV2"]
            self.assertEqual(node_definition["display_name"], expected_name)
            self.assertEqual(set(node_definition["inputs"]), {"model", "clip", "lora_state"})
            self.assertEqual(set(node_definition["outputs"]), {"0", "1"})

    def test_release_version_is_documented(self):
        metadata = tomllib.loads((PLUGIN_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        version = metadata["project"]["version"]
        self.assertEqual(version, "0.2.1")
        self.assertIn(f"当前版本：`{version}`", (PLUGIN_ROOT / "README.md").read_text(encoding="utf-8"))
        self.assertIn(f"## {version} - ", (PLUGIN_ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))

    def test_v3_entrypoint_registers_only_the_expected_node(self):
        extension = asyncio.run(MODULE.comfy_entrypoint())
        node_list = asyncio.run(extension.get_node_list())
        self.assertEqual(node_list, [MODULE.PJYPowerLoraLoaderV2])

    def test_workflow_migration_preserves_graph_and_converts_state(self):
        workflow = {
            "nodes": [{
                "id": 7,
                "type": "Power Lora Loader (rgthree)",
                "size": [320, 200],
                "properties": {"Show Strengths": "Separate Model & Clip"},
                "widgets_values": [{
                    "on": True,
                    "lora": "folder/test.safetensors",
                    "strength": 0.7,
                    "strengthTwo": 0.4,
                }],
            }],
            "links": [[1, 2, 0, 7, 0, "MODEL"]],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "source.json"
            destination = Path(temp_dir) / "nested" / "result.json"
            source.write_text(json.dumps(workflow), encoding="utf-8")
            count = MIGRATION.migrate_workflow(source, destination)
            migrated = json.loads(destination.read_text(encoding="utf-8"))

        self.assertEqual(count, 1)
        self.assertEqual(migrated["links"], workflow["links"])
        node = migrated["nodes"][0]
        self.assertEqual(node["type"], "PJYPowerLoraLoaderV2")
        self.assertEqual(node["size"], [500.0, 113.0])
        state = json.loads(node["widgets_values"][0])
        self.assertTrue(state["separate_strengths"])
        self.assertEqual(state["loras"][0]["strength_clip"], 0.4)

    def test_workflow_migration_rejects_non_finite_strength(self):
        with self.assertRaisesRegex(ValueError, "必须是有限数字"):
            MIGRATION._row({"lora": "bad.safetensors", "strength": "nan"}, 0)


if __name__ == "__main__":
    unittest.main()
