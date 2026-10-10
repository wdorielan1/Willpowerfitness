#!/usr/bin/env bash
# Downloads each photo listed in /tmp/lib-images.txt (made by build-library.py) and shrinks it for phones.
# Usage: scripts/fetch-library-images.sh   (run from the repo root; skips photos already present)
set -u
BASE=https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises
mkdir -p public/ex
fetch_one() {
  src="$1"; out="public/ex/$2"
  [ -s "$out" ] && return 0
  tmp=$(mktemp --suffix=.jpg)
  if curl -sS -m 40 -f "$BASE/$src" -o "$tmp"; then
    convert "$tmp" -resize '480x>' -strip -quality 68 -interlace Plane "$out" 2>/dev/null || echo "FAILED convert $src"
  else echo "FAILED fetch $src"; fi
  rm -f "$tmp"
}
export -f fetch_one; export BASE
awk -F'\t' '{print $1"\t"$2}' /tmp/lib-images.txt | xargs -P 8 -d '\n' -I{} bash -c 'IFS=$'"'"'\t'"'"' read -r a b <<< "{}"; fetch_one "$a" "$b"'
