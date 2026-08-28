#!/usr/bin/env bash
# 构建并实拷到 Tabby plugins; 同时禁用旧 tabby-save-output 避免双写
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PLUGINS_ROOT="${HOME}/Library/Application Support/tabby/plugins"
NM="${PLUGINS_ROOT}/node_modules"
NAME="tabby-session-log"
TARGET="${NM}/${NAME}"
LEGACY="${NM}/tabby-save-output"

npm install --prefix "$ROOT"
npm run build --prefix "$ROOT"

mkdir -p "$NM"
rm -rf "$TARGET"
mkdir -p "$TARGET/dist"
cp "$ROOT/package.json" "$TARGET/package.json"
cp "$ROOT/dist/index.js" "$TARGET/dist/index.js"
if [[ -f "$ROOT/dist/index.js.map" ]]; then
  cp "$ROOT/dist/index.js.map" "$TARGET/dist/index.js.map"
fi

# 移除旧插件, 避免双份日志
if [[ -e "$LEGACY" || -L "$LEGACY" ]]; then
  rm -rf "$LEGACY"
  echo "Removed legacy tabby-save-output"
fi

python3 - <<'PY'
import json, os
from pathlib import Path

pkg = Path.home() / "Library/Application Support/tabby/plugins/package.json"
data = {"dependencies": {}}
if pkg.exists():
    data = json.loads(pkg.read_text(encoding="utf-8"))
deps = data.setdefault("dependencies", {})
deps.pop("tabby-save-output", None)
deps["tabby-session-log"] = "file:node_modules/tabby-session-log"
pkg.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Updated", pkg)
print("deps:", deps)

# 迁移 config: saveOutput -> sessionLog
cfg = Path.home() / "Library/Application Support/tabby/config.yaml"
if cfg.exists():
    text = cfg.read_text(encoding="utf-8")
    if "sessionLog:" not in text:
        # 从旧段推断
        import re
        auto = "ssh"
        directory = None
        m = re.search(r"^saveOutput:\n(?:  .*\n)*", text, re.M)
        block = m.group(0) if m else ""
        am = re.search(r"autoSave:\s*(\S+)", block)
        if am:
            auto = am.group(1)
        dm = re.search(r"autoSaveDirectory:\s*(.+)", block)
        if dm:
            directory = dm.group(1).strip()
        # 关掉旧 saveOutput
        text2 = re.sub(
            r"(^saveOutput:\n(?:  .*\n)*)",
            "saveOutput:\n  autoSave: off\n  autoSaveDirectory: null\n",
            text,
            count=1,
            flags=re.M,
        )
        if text2 == text and "saveOutput:" in text:
            text2 = text
        dir_line = f"  directory: {directory}\n" if directory else "  directory: null\n"
        session = (
            "sessionLog:\n"
            f"  autoSave: {auto}\n"
            f"{dir_line}"
            "  filenamePattern: '%Y%M%D-%h%m%s-%S.txt'\n"
            "  append: true\n"
            "  stripControls: true\n"
            "  lineTimestamp: true\n"
        )
        bak = cfg.with_suffix(".yaml.bak-session-log")
        bak.write_text(text, encoding="utf-8")
        cfg.write_text(text2.rstrip() + "\n" + session, encoding="utf-8")
        print("Migrated sessionLog into config.yaml, backup", bak)
    else:
        # 确保 lineTimestamp 存在
        if "lineTimestamp:" not in text:
            text = text.replace("sessionLog:\n", "sessionLog:\n  lineTimestamp: true\n", 1)
            cfg.write_text(text, encoding="utf-8")
            print("Added lineTimestamp: true to sessionLog")
PY

echo "Installed (copy): $TARGET"
ls -la "$TARGET" "$TARGET/dist"
echo "Restart Tabby completely (Cmd+Q, then reopen)."
echo "Settings -> 会话日志"
