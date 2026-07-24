#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

echo "== smoke: War of the Three Kingdoms =="

test -f index.html
test -f public/.nojekyll || test -f docs/.nojekyll || test -f .nojekyll
test -f src/version.ts
grep -q 'APP_VERSION' src/version.ts
grep -q 'app-version\|APP_VERSION' src/ui/app.ts src/version.ts

if [[ -f docs/index.html ]]; then
  grep -q '單機三國殺\|War-of-the-Three-Kingdoms' docs/index.html || true
  test -f docs/assets/social-preview.jpg || test -f public/assets/social-preview.jpg || test -f assets/social-preview.jpg
fi

if [[ -f public/assets/social-preview.jpg ]]; then
  SIZE=$(wc -c < public/assets/social-preview.jpg | tr -d ' ')
  if [[ "$SIZE" -gt 1000000 ]]; then
    echo "WARN: social-preview.jpg is >1MB ($SIZE bytes)"
  fi
fi

echo "OK: basic smoke checks passed"
