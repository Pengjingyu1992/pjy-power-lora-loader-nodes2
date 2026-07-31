# Contributing and platform feedback

Windows and Linux testing is welcome. Please do not include workflows, prompts, model files, screenshots, or logs that contain private information unless they are necessary and have been sanitized.

When reporting a problem, include:

- Operating system and version
- ComfyUI version or commit
- ComfyUI frontend version
- Desktop or portable installation
- Nodes 2.0 enabled or disabled
- Exact steps to reproduce
- The complete error message with API keys, usernames, and local paths removed

Before submitting a change, run:

```bash
python -m unittest discover -s tests -v
node --check js/power_lora_loader.js
```

Keep the stable node ID `PJYPowerLoraLoaderV2` and serialized state contract compatible with existing workflows.
