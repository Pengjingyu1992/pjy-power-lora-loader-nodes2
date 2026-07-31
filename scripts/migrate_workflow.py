#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path


OLD_TYPE = "Power Lora Loader (rgthree)"
NEW_TYPE = "PJYPowerLoraLoaderV2"
STATE_VERSION = 1


def _number(value, field, index):
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"LoRA 第 {index + 1} 行的{field}不是有效数字") from exc
    if not math.isfinite(result):
        raise ValueError(f"LoRA 第 {index + 1} 行的{field}必须是有限数字")
    return result


def _row(value, index):
    strength_model = _number(value.get("strength", 1.0), "模型强度", index)
    strength_clip = value.get("strengthTwo")
    return {
        "id": f"row_{index + 1}",
        "enabled": bool(value.get("on", False)),
        "file": str(value.get("lora", "")),
        "strength_model": strength_model,
        "strength_clip": strength_model if strength_clip is None else _number(strength_clip, "CLIP 强度", index),
    }


def migrate_node(node):
    values = node.get("widgets_values") or []
    rows = [_row(value, index) for index, value in enumerate(
        value for value in values
        if isinstance(value, dict) and isinstance(value.get("lora"), str)
    )]
    show_strengths = str(node.get("properties", {}).get("Show Strengths", ""))
    state = {
        "version": STATE_VERSION,
        "separate_strengths": "separate" in show_strengths.lower(),
        "loras": rows,
    }
    node["type"] = NEW_TYPE
    node["title"] = "权重 LoRA 加载器 2.0"
    node["widgets_values"] = [json.dumps(state, ensure_ascii=False, separators=(",", ":"))]
    properties = node.setdefault("properties", {})
    properties.clear()
    properties.update({
        "Node name for S&R": NEW_TYPE,
        "pjy_migrated_from": OLD_TYPE,
    })
    node["size"][0] = 500.0 if state["separate_strengths"] else 410.0
    node["size"][1] = max(112.0, 84.0 + len(rows) * 29.0)


def migrate_workflow(source, destination):
    data = json.loads(source.read_text(encoding="utf-8"))
    count = 0
    for node in data.get("nodes", []):
        if node.get("type") == OLD_TYPE:
            migrate_node(node)
            count += 1
    if count == 0:
        raise ValueError("没有找到 Power Lora Loader (rgthree) 节点")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )
    return count


def main():
    parser = argparse.ArgumentParser(description="把 rgthree Power LoRA Loader 迁移到 PJY Nodes 2.0 节点")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        count = migrate_workflow(args.source, args.destination)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    print(f"已迁移 {count} 个节点：{args.destination}")


if __name__ == "__main__":
    main()
