#!/usr/bin/env bash
# Kompresja build/raw/<system>.glb → public/models/<system>.glb (Meshopt, bez łączenia węzłów).
# Użycie: pipeline/compress.sh [system ...]   (domyślnie wszystkie)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/models
SYSTEMS=("$@"); [ ${#SYSTEMS[@]} -eq 0 ] && SYSTEMS=(bones joints muscles vessels nerves organs)
# Dodatkowe uproszczenie dla warstw przekraczających budżet (cel: ≤ 20 MB, bones ≤ 8 MB).
declare -A RATIO=( [muscles]=0.5 [nerves]=0.6 )
for s in "${SYSTEMS[@]}"; do
  extra=()
  if [ -n "${RATIO[$s]:-}" ]; then extra=(--simplify-ratio "${RATIO[$s]}"); fi
  npx gltf-transform optimize "build/raw/$s.glb" "public/models/$s.glb" \
    --compress meshopt --join false --instance false --flatten false \
    --texture-compress false --palette false --simplify-error 0.0005 "${extra[@]}"
  ls -l "public/models/$s.glb"
done
