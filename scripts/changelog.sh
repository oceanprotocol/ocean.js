#!/usr/bin/env bash
# Adds the section for the current package.json version on top of CHANGELOG.md,
# leaving every existing section untouched.
#
# A plain `auto-changelog -p` rebuilds the whole file from ALL local tags, so
# pre-release tags from unmerged branches (e.g. v9.3.0-next.*) end up in the
# compare link, steal commits and rewrite old sections. Here only tags merged
# into HEAD are considered and only the new section is kept.
set -euo pipefail

file="${1:-CHANGELOG.md}"
version=$(node -p "require('./package.json').version")
heading="#### [v${version}]"

# meant to run after release-it bumps the version; an already tagged version
# means it was run by hand and would overwrite a released section
if git rev-parse -q --verify "refs/tags/v${version}" > /dev/null; then
  echo "changelog: v${version} is already tagged, bump the version first (npm run release)" >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

npx auto-changelog -p --append-git-tag "--merged HEAD" -o "$tmp/full.md" > /dev/null

# keep only the new version's section
awk -v h="$heading" '
  index($0, h) == 1 { keep = 1; print; next }
  keep && /^#### \[v/ { exit }
  keep
' "$tmp/full.md" > "$tmp/section.md"

if [ ! -s "$tmp/section.md" ]; then
  echo "changelog: no section generated for v${version}" >&2
  exit 1
fi

# drop a previous section for the same version (re-runs), then insert the new
# one before the first existing release heading
awk -v h="$heading" -v section="$tmp/section.md" '
  index($0, h) == 1 { skip = 1; next }
  skip && /^#### \[v/ { skip = 0 }
  skip { next }
  !done && /^#### \[v/ {
    while ((getline line < section) > 0) print line
    done = 1
  }
  { print }
  END {
    if (!done) while ((getline line < section) > 0) print line
  }
' "$file" > "$tmp/out.md"

mv "$tmp/out.md" "$file"
echo "changelog: added v${version} to ${file}"
