import json
import math

from comfy_api.latest import ComfyExtension, io
from nodes import LoraLoader
from typing_extensions import override


WEB_DIRECTORY = "./js"
LORA_STATE_WIDGET = "PJY_POWER_LORA_STATE"
LORA_STATE_VERSION = 1
DEFAULT_LORA_STATE = '{"version":1,"separate_strengths":false,"loras":[]}'


def _number(value, field, row_index):
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"LoRA 第 {row_index + 1} 行的 {field} 不是有效数字") from exc
    if not math.isfinite(result):
        raise ValueError(f"LoRA 第 {row_index + 1} 行的 {field} 必须是有限数字")
    return result


def decode_lora_state(lora_state):
    try:
        state = json.loads(lora_state)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("LoRA 配置 JSON 无效，请在节点中重新选择或编辑 LoRA") from exc

    if not isinstance(state, dict) or not isinstance(state.get("loras", []), list):
        raise ValueError("LoRA 配置格式无效：缺少 loras 列表")
    if state.get("version", LORA_STATE_VERSION) != LORA_STATE_VERSION:
        raise ValueError(f"不支持的 LoRA 配置版本：{state.get('version')}")

    rows = []
    for index, item in enumerate(state.get("loras", [])):
        if not isinstance(item, dict):
            raise ValueError(f"LoRA 第 {index + 1} 行格式无效")

        enabled = bool(item.get("enabled", item.get("on", False)))
        name = item.get("file", item.get("lora", ""))
        name = "" if name is None else str(name).strip()
        strength_model = _number(
            item.get("strength_model", item.get("strength", 1.0)),
            "模型强度",
            index,
        )
        strength_clip = _number(
            item.get("strength_clip", item.get("strengthTwo", strength_model)),
            "CLIP 强度",
            index,
        )
        rows.append((enabled, name, strength_model, strength_clip))
    return rows


class PJYPowerLoraLoaderV2(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        lora_state = io.String.Input(
            "lora_state",
            display_name="LoRA 配置",
            default=DEFAULT_LORA_STATE,
            multiline=False,
            socketless=True,
        )
        lora_state.widget_type = LORA_STATE_WIDGET
        return io.Schema(
            node_id="PJYPowerLoraLoaderV2",
            display_name="权重 LoRA 加载器 2.0",
            category="loaders/LoRA",
            description="为 Nodes 2.0 设计的多 LoRA 加载器。按列表顺序应用已启用的 LoRA。",
            search_aliases=["Power LoRA Loader", "权重Lora加载器", "LoRA Loader 2.0"],
            inputs=[
                io.Model.Input("model", display_name="模型", optional=True),
                io.Clip.Input("clip", display_name="CLIP", optional=True),
                lora_state,
            ],
            outputs=[
                io.Model.Output(display_name="模型"),
                io.Clip.Output(display_name="CLIP"),
            ],
        )

    @classmethod
    def execute(cls, lora_state, model=None, clip=None):
        loader = LoraLoader()
        for enabled, name, strength_model, strength_clip in decode_lora_state(lora_state):
            if not enabled or not name:
                continue
            model, clip = loader.load_lora(
                model,
                clip,
                name,
                strength_model if model is not None else 0.0,
                strength_clip if clip is not None else 0.0,
            )
        return io.NodeOutput(model, clip)

    @classmethod
    def validate_inputs(cls, lora_state, **_kwargs):
        try:
            decode_lora_state(lora_state)
        except ValueError as exc:
            return str(exc)
        return True


class PJYPowerLoraExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [PJYPowerLoraLoaderV2]


async def comfy_entrypoint() -> PJYPowerLoraExtension:
    return PJYPowerLoraExtension()


__all__ = ["PJYPowerLoraLoaderV2", "comfy_entrypoint", "WEB_DIRECTORY"]
