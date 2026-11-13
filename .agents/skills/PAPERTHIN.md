# Paperthin (vendored)

Pinned from [lilmgenius/paperthin](https://github.com/lilmgenius/paperthin).

| | |
|---|---|
| Source | https://github.com/lilmgenius/paperthin |
| Pin | `61143228dae8549f4ebc3e9f3d8d65cb4bbe7764` |
| License | MIT. Copyright (c) 2026 LilMGenius. Full text: [`LICENSE`](./LICENSE) |
| Notice | [`NOTICE`](./NOTICE). That notice also covers [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, Copyright (c) 2026 Matt Pocock). |

`debloat` is the single standard cleanup skill. The copy is `skills/depth/debloat/` from the pin, flattened to `.agents/skills/debloat/`. The official installer, `npx skills`, and `schedule.mjs` were not used.

This repository does not use `.cursor/skills/`, so nothing was mirrored there.

## Never vendor

Do not add these, on this pin or a later one:

- `re0-upgrade` and `schedule.mjs`. They fetch the catalog from GitHub and register a daily job that runs `npx skills`.
- `re0-squash`. It deletes the GitHub repository and recreates it so old commits stop being reachable.
- `re0-work` and `re0-git`. They force-push or rewrite history (`re0-work` prints `git push --force-with-lease` to replace `main`; `re0-git` rewrites commits and tells the operator to lease-push).
- `re0-readme`'s `audit.mjs`. It calls `gh api` and downloads a social preview with `curl`.

The rest of the Paperthin catalog is not part of this rollout. Do not copy another skill in without changing this file first.

## Update the pin by hand

1. Fetch the repository and check out the new commit. Do not run the installer, `npx skills`, or `schedule.mjs`.
2. Replace `.agents/skills/debloat/` with `skills/depth/debloat/` from that commit. Copy nothing else from `skills/`.
3. Copy `LICENSE` and `NOTICE` again if they changed.
4. Read the new `debloat` folder. If it gained a script that fetches from the network, installs packages, schedules a job, or force-pushes, leave that script out and say so here.
5. Replace the pin SHA in the table above with the commit you actually copied.
6. Commit the result. Do not deploy it.
