#!/usr/bin/env bash
# リポジトリルートの .env をシェル起動時に環境変数として読み込むよう ~/.bashrc に登録する。
# Codespaces secrets はコンテナに環境変数として直接注入されるため、.env が無くても動く。
set -euo pipefail

PROJECT_ROOT="$(pwd)"
BASHRC="$HOME/.bashrc"
MARKER="# >>> ipj-internship2026-pretest: load .env >>>"

if grep -qF "$MARKER" "$BASHRC" 2>/dev/null; then
  exit 0
fi

cat >>"$BASHRC" <<EOF

$MARKER
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  . "$PROJECT_ROOT/.env"
  set +a
fi
# <<< ipj-internship2026-pretest: load .env <<<
EOF
