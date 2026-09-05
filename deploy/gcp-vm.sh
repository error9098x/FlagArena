#!/usr/bin/env bash
# Run interactively over SSH on a fresh Ubuntu 24.04 VM.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$script_dir/install.py" "$@"
