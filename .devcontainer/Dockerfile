FROM mcr.microsoft.com/devcontainers/base:debian

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

USER vscode
ENV PATH=/home/vscode/.local/bin:$PATH

# uv (Snowflake CLI を管理する Python ツールチェイン)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Snowflake CLI (snow)
RUN uv tool install snowflake-cli

# Cortex Code (cortex)
RUN curl -LsS https://ai.snowflake.com/static/cc-scripts/install.sh | sh
