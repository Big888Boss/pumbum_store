# Safety Boundary for new-store-v2

> **Historical document.** This file dates from the period when the V2 storefront was
> developed inside a `new-store-v2/` folder of the legacy monorepo. In this repository
> the V2 storefront *is* the root (`src/`, `content/`, `deploy/`, `Dockerfile`), so the
> `new-store-v2/` paths below no longer exist. It is kept for the audit trail only; see
> `README.md` and `docs/AGENT_CONTEXT.md` for the current layout and rules.

This folder is the only allowed workspace for the new parallel store project.

## Mandatory rule

- Do not touch, edit, rename, move, delete, reformat, or regenerate any legacy site files.
- Do not modify existing legacy directories such as `legacy_src/`, `src/`, `public/`, existing deployment files, existing catalog data, or existing documentation outside `new-store-v2/` unless a later explicit task requires it and passes review.
- All planning, drafts, prototypes, research notes, and future implementation files for the new storefront must live under `new-store-v2/`.
- The old plumbing store remains the production/legacy baseline and must stay unchanged while the new version is planned and built in parallel.

## Allowed in this stage

- Create and use `new-store-v2/`.
- Create and use `new-store-v2/docs/`.
- Add safety and planning documents inside `new-store-v2/` only.

## Review requirement

Every later stage must verify that legacy files were not changed before reporting completion.
