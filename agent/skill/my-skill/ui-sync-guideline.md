# UI Sync Guideline (Team Frontend)

## 1) Single Source of Truth
- Colors, spacing, radius, typography: only from `constants/theme.ts`.
- Reusable primitives: only from `components/ui/` (`button`, `card`, `input`, ...).
- Do not hardcode random color/size in screen files unless approved by team.

## 2) Screen Rules
- Every screen must use semantic colors (`background`, `surface`, `text`, `textMuted`, `border`).
- Main container spacing: use `Spacing.lg` or `Spacing.xl`.
- Card corners: `Radius.lg` or `Radius.xl`.
- Shadows: `Elevation.card` (content) and `Elevation.floating` (FAB).

## 3) Team Workflow
- If someone needs a new UI pattern (e.g. `chip`, `section-header`, `fab-button`):
  1. Add component in `components/ui/`.
  2. Reuse tokens from `constants/theme.ts`.
  3. Open small PR named `ui/<component-name>`.
- Feature PRs should reuse existing UI components first.

## 4) Code Review Checklist (UI)
- No hardcoded hex (except temporary prototype).
- No custom spacing scale outside `Spacing`.
- Buttons/inputs/cards should not be duplicated per screen.
- Light mode must match Figma first, then adapt dark mode.

## 5) Suggested Ownership
- Ha: auth/profile screens must use `Input` + `Button`.
- Hung: itinerary cards must reuse `Card` + spacing tokens.
- Huy: budget/stat cards and list rows should follow `Card`/`Typography`.
- Dat: chatbot bubbles/actions should use same radius/spacing scale.
