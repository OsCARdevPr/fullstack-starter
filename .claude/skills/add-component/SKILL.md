---
name: add-component
description: "Trigger: new component, UI element, widget, shadcn component or block, reusable UI. Choose shadcn primitive, shared or feature component; reuse globals."
license: Apache-2.0
metadata:
  author: "OsCARdevPr"
  version: "1.0"
---

## Activation Contract

Load before creating any React component in `apps/web`, or when the user asks for a shadcn component or block.

## Hard Rules

- Search before creating: `apps/web/src/components/ui/` already holds the full shadcn catalog; `components/{layout,feedback,data,form}` hold the app's shared components.
- Preview a shadcn component with `pnpm --dir apps/web exec shadcn add <name> --diff` (writes nothing), then apply it with `pnpm --dir apps/web exec shadcn add <name>`; NEVER pass `--overwrite`.
- Blocks (`dashboard-01`, `login-03`...) overwrite `ui/*`: preview with `--dry-run` or `--view`, then copy the parts you need into a feature folder.
- No business logic or API calls in `components/ui/`.
- Colors and radii come from theme tokens (`bg-primary`, `text-muted-foreground`); never hard-code colors. `src/styles/theme.css` is the only token file: move tokens that `shadcn add` writes to `globals.css` into it.
- Forms use `useZodForm` and the `Form*` fields from `@/components/form`.

## Decision Gates

| Component | Location |
|---|---|
| Generic primitive missing from `components/ui` | preview with `shadcn add <name> --diff`, apply with `shadcn add <name>` (the shadcn MCP in `.mcp.json` can search the registry) |
| Used by two or more features | `components/layout`, `feedback`, `data` or `form`; export it from that folder's `index.ts` |
| Used by one feature | `apps/web/src/features/<feature>/components/` |

Shared components already available: `PageHeader`, `DataTable`, `DataPagination`, `SearchInput`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `FormInput`, `FormTextarea`, `FormSelect`, `FormCheckbox`, `FormSwitch`, `FormDatePicker`, `FormCombobox`, `FormError`.

## Execution Steps

1. Check the decision table and reuse an existing component when one fits.
2. Create the component (kebab-case file, PascalCase export, typed props).
3. Add a Testing Library test next to it when it has behavior (see `components/feedback/confirm-dialog.test.tsx`).
4. `pnpm verify`.

## Output Contract

Return where the component lives and why, what it reuses, and the `pnpm verify` result.

## References

- `apps/web/components.json` — shadcn configuration.
- `apps/web/src/features/projects/components/` — feature-local components.
- `apps/web/src/components/form/index.ts` — form field API.
