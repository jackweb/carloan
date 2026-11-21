# CLAUDE.md

## Editing files

Change files in this repository only with the Edit and Write tools, so every change
appears as a diff in the editor that I can accept or reject.

Never change, create or delete files from a shell command. This includes:

- `python3` / `python` scripts or one-liners (`python3 -c ...`, `open(...).write(...)`)
- `sed -i`, `awk`, `perl -i`
- shell redirection: `cat > file`, `cat >> file <<EOF`, `echo ... > file`, `tee`
- `cp`, `mv` or `rm` used to swap in new file contents

This applies to source code, tests, config and docs alike, including bulk changes:
make several Edit calls (or use `replace_all`) rather than one script.

Shell commands are fine for things that don't change tracked files: running tests,
type checks, linters, builds, `git status`/`git diff`, and installing dependencies
(`npm install` may update `package.json` and `package-lock.json`).

If a change really can't be made with Edit/Write (for example a binary file), ask first.
