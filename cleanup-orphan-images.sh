#!/usr/bin/env bash
# CoinGyaan · safe orphan-image cleanup.
# Lists (and optionally removes with git rm) image files that NO code references.
# Run from anywhere inside the repo. Requires git and bash (Git Bash on Windows).
#
# It is deliberately conservative:
#   - It only considers images that are meant to be referenced by URL.
#   - It EXCLUDES build-input and permanent assets that are not linked by URL:
#         assets/images/brand/**     (permanent brand assets, kept by policy)
#         assets/logos/**            (official logo library, read by build_news.mjs)
#         assets/images/articles/*.svg (per-article source, rendered to .png at build)
#         news/_content/**           (article bodies, not images anyway)
#   - It errs toward KEEPING a file if the filename appears anywhere in code.
#
# Nothing is deleted until you confirm.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

is_excluded() {
  case "$1" in
    assets/images/brand/*) return 0 ;;
    assets/logos/*) return 0 ;;
    assets/images/articles/*.svg) return 0 ;;
    news/_content/*) return 0 ;;
    *) return 1 ;;
  esac
}

echo "Scanning tracked images for orphans (files nothing references)..."
orphans=()
while IFS= read -r img; do
  is_excluded "$img" && continue
  base="$(basename "$img")"
  if ! grep -rqI \
      --include='*.html' --include='*.js' --include='*.mjs' --include='*.css' \
      --include='*.json' --include='*.xml' --include='*.webmanifest' --include='*.md' \
      -- "$base" . ; then
    orphans+=("$img")
  fi
done < <(git ls-files '*.png' '*.jpg' '*.jpeg' '*.svg' '*.webp' '*.ico' '*.gif')

if [ "${#orphans[@]}" -eq 0 ]; then
  echo "No orphaned images found. Repo is clean."
  exit 0
fi

echo
echo "These images are referenced by nothing and are safe to remove:"
printf '  %s\n' "${orphans[@]}"
echo
read -r -p "Delete all of the above with 'git rm'? [y/N] " ans
if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
  git rm "${orphans[@]}"
  echo
  echo "Done. Review with 'git status', then:"
  echo "  git commit -m \"Remove orphaned images (asset library cleanup)\" && git push"
else
  echo "Aborted. Nothing deleted."
fi
