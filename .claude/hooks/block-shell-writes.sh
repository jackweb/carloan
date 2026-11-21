#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks shell commands that write files, so every change to
# the codebase goes through the Edit/Write tools and shows up as a reviewable diff
# in the editor (see CLAUDE.md, "Editing files").
#
# Exit 2 blocks the command and hands the message on stderr back to Claude.

set -u

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

# Drop heredoc bodies and quoted strings first, so their text (JSX, commit messages,
# grep patterns like '->' or "a > b") isn't mistaken for a redirect. The line holding
# the `<<` operator itself is kept, so `cat > file <<EOF` is still caught.
stripped=$(printf '%s' "$cmd" | perl -0777 -pe '
  s/(<<-?\s*["\x27]?(\w+)["\x27]?[^\n]*)\n.*?\n[ \t]*\2[ \t]*(?=\n|$)/$1/gs;
  s/"(?:\\.|[^"\\])*"/""/gs;
  s/\x27[^\x27]*\x27/\x27\x27/gs;
')

block() {
  cat >&2 <<EOF
Blocked by .claude/hooks/block-shell-writes.sh: $1.
Change files with the Edit or Write tool instead, so the change shows up as a diff
the user can accept or reject (see CLAUDE.md). If this command doesn't actually
write a file, rewrite it without the matched construct, or ask the user.
EOF
  exit 2
}

matches() { printf '%s' "$stripped" | grep -qP -- "$1"; }

# Inline Python: `python -c ...`, `python - <<EOF`, `... | python`.
# `python -m pytest`, `uv run pytest` and running a script file stay allowed.
matches '\bpython[0-9.]*\b[^\n;|&]*(\s-c\b|\s-(\s|$)|<<)' && block 'inline Python script'
matches '\|\s*(uv\s+run\s+)?python[0-9.]*\s*($|[;&|\n])' && block 'Python script piped from stdin'

# In-place editors.
matches '\bsed\b[^\n;|&]*?\s-(-in-place|[a-zA-Z]*i)' && block 'sed -i (in-place edit)'
matches '\bperl\b[^\n;|&]*?\s-[a-zA-Z]*i' && block 'perl -i (in-place edit)'
matches '\bg?awk\b[^\n;|&]*?\s-i\s*inplace' && block 'awk -i inplace'

# tee into a file (tee to /dev/null or /tmp is fine).
matches '\btee\s+(-\S+\s+)*(?!/dev/null\b|/tmp/)[^\s;|&)]' && block 'tee into a file'

# Output redirection into a file: `> f`, `>> f`, `&> f`, `2> f`.
# Allowed targets: fd duplication (`2>&1`), /dev/null, /dev/stdout|stderr, /tmp/...
matches '(^|[^<>=&\-0-9])[0-9]?(>>?|&>>?)\s*(?!&|/dev/null\b|/dev/std(out|err)\b|/tmp/)[^\s;|&()]' \
  && block 'output redirection into a file'

exit 0
