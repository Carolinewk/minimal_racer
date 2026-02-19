#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/.." && pwd)"
entry_path="${1:-$root_dir/src/Client.ts}"

bun "$script_dir/complexity.ts" "$entry_path"
