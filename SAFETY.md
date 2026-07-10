# Safety Boundary for new-store-v2

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
