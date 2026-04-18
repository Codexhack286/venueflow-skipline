#!/usr/bin/env bash
# Render build script — installs uv and syncs dependencies.
# Set this as your Build Command in Render.

set -e

# Install uv if not present
if ! command -v uv &> /dev/null; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

# Sync dependencies
uv sync --frozen --no-dev
