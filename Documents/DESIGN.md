---
version: alpha
name: Ajaia Docs
description: A narrow Google-Docs-style editor — calm desk, paper page, green ink for actions, one rust mark for "shared".
colors:
  canvas: "#F6F4EF"
  surface: "#FFFFFF"
  on-surface: "#1C1F23"
  muted: "#5B616B"
  line: "#E3DFD6"
  primary: "#2E5E4E"
  primary-hover: "#244B3E"
  primary-soft: "#E6EFEA"
  accent: "#B4532A"
  accent-soft: "#FBEDE6"
  accent-text: "#A94E27"
  danger: "#B42318"
  warning: "#A15C07"
colors-dark:
  canvas: "#15171A"
  surface: "#1E2125"
  on-surface: "#E8E6E1"
  muted: "#A3A9B2"
  line: "#2E3238"
  primary: "#7FB89F"
  primary-hover: "#95C7B0"
  on-primary: "#10241C"
  primary-soft: "#1F3029"
  accent: "#E08A62"
  accent-soft: "#3A251B"
  accent-text: "#E08A62"
  danger: "#F0857A"
  warning: "#E2A65A"
typography:
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  doc-body:
    fontFamily: Source Serif 4
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.7
  doc-h1:
    fontFamily: Source Serif 4
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.25
  doc-h2:
    fontFamily: Source Serif 4
    fontSize: 23px
    fontWeight: 600
    lineHeight: 1.3
  doc-h3:
    fontFamily: Source Serif 4
    fontSize: 19px
    fontWeight: 600
    lineHeight: 1.35
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  page-width: 816px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  badge-owner:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-shared:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  toolbar-button-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    size: 32px
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.doc-body}"
    rounded: "{rounded.lg}"
    width: 816px
    padding: 64px 72px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
    width: 440px
  save-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  save-chip-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  conflict-banner:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.warning}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  divider:
    backgroundColor: "{colors.line}"
    height: 1px
motion:
  duration-fast: 150ms
  duration-base: 180ms
  duration-slow: 220ms
  easing: cubic-bezier(0.2, 0, 0, 1)
  list-stagger: 30ms
---

# Ajaia Docs — DESIGN.md

## Overview

A well-kept ledger notebook on a library desk: warm off-white paper, deep green ink for actions, one rust accent for "shared" marks. The desk ({colors.canvas}) is quiet and slightly warm; the page ({colors.surface}) is where the work is and is the brightest thing on screen. Green means "you can act here". Rust means "someone else is involved", and nothing else uses it.

The app chrome is set in Inter: small, neutral, out of the way. The document is set in Source Serif 4 because people are writing prose, and a serif page reads as a document, not a form. Density is moderate: a reviewer should take in the whole dashboard without scrolling and never hunt for the save state.

## Colors

| Token | Hex | Role |
|---|---|---|
| `canvas` | #F6F4EF | App background ("the desk"), save-chip fill |
| `surface` | #FFFFFF | Page, dialogs, inputs, cards |
| `on-surface` | #1C1F23 | Primary text (ink) |
| `muted` | #5B616B | Secondary text: timestamps, owner names, hints |
| `line` | #E3DFD6 | 1px borders, dividers, input outlines |
| `primary` | #2E5E4E | Primary actions, links, focus ring, active toolbar icon |
| `primary-hover` | #244B3E | Hover/pressed state of primary |
| `primary-soft` | #E6EFEA | Owner badge, active toolbar button, selected row |
| `accent` | #B4532A | "Shared" marks only (text) |
| `accent-soft` | #FBEDE6 | "Shared" badge fill |
| `danger` | #B42318 | Destructive actions, save errors, field errors |
| `warning` | #A15C07 | Version conflict banner, "Not saved" state |

**Measured contrast (WCAG 2.x relative luminance):**

| Pair | Ratio | AA body (4.5) |
|---|---|---|
| `primary` on `surface` (button text inverse, links) | 7.43:1 | Pass |
| `surface` on `primary-hover` | 9.76:1 | Pass |
| `primary` on `primary-soft` (owner badge, active tool) | 6.33:1 | Pass |
| `on-surface` on `canvas` / `surface` | 15.05 / 16.54:1 | Pass |
| `muted` on `canvas` | 5.67:1 | Pass |
| `muted` on `surface` | 6.24:1 | Pass |
| `danger` on `surface` | 6.57:1 | Pass |
| `warning` on `surface` / `canvas` | 5.19 / 4.72:1 | Pass |
| `accent` on `surface` | 4.99:1 | Pass |
| `accent` on `accent-soft` | 4.36:1 | Fails — not used for text |
| `accent-text` on `accent-soft` (shared badge) | 4.82:1 | Pass |

Badge text uses `accent-text` (#A94E27); `accent` (#B4532A) is for icons and borders only.

### Dark theme

The app follows the OS setting (`prefers-color-scheme`) by default; a header toggle cycles **System → Light → Dark** and the choice is remembered (`next-themes`, class on `<html>`, no flash on load). Every colour is a CSS variable, so components never branch on theme.

| Token | Light | Dark | Note |
|---|---|---|---|
| `canvas` | #F6F4EF | #15171A | The desk at night |
| `surface` | #FFFFFF | #1E2125 | Page, dialogs, inputs |
| `on-surface` | #1C1F23 | #E8E6E1 | Warm off-white, not pure white |
| `muted` | #5B616B | #A3A9B2 | |
| `line` | #E3DFD6 | #2E3238 | |
| `primary` | #2E5E4E | #7FB89F | Green lifts for contrast on dark |
| `on-primary` | #FFFFFF | #10241C | Text on primary buttons |
| `primary-soft` | #E6EFEA | #1F3029 | |
| `accent` / `accent-text` | #B4532A / #A94E27 | #E08A62 | |
| `accent-soft` | #FBEDE6 | #3A251B | |
| `danger` | #B42318 | #F0857A | |
| `warning` | #A15C07 | #E2A65A | |

Measured (dark), all pass AA: `on-surface`/`canvas` 14.40, `muted`/`surface` 6.83, `primary`/`surface` 7.13, `on-primary`/`primary` 7.17, `primary`/`primary-soft` 6.12, `accent`/`accent-soft` 5.47, `danger`/`surface` 6.42, `warning`/`surface` 7.57.

Dark rules: no pure black or pure white; page shadow becomes `0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .35)`; `color-scheme: dark` so native controls and scrollbars match.

**Theme switch animation:** a circular reveal expanding from the toggle (View Transitions API, ~400ms ease-out). Browsers without it get a 200ms colour crossfade. With `prefers-reduced-motion: reduce` the switch is instant. The toggle icon (Monitor / Sun / Moon) swaps with a 180ms rotate + fade.

## Typography

| Token | Family | Size / weight / line-height | Use |
|---|---|---|---|
| `label-md` | Inter | 14px / 500 / 1.4 | Buttons, badges, tabs, save chip, toolbar tooltips |
| `body-md` | Inter | 15px / 400 / 1.5 | Dashboard rows, dialog copy, inputs |
| `headline-md` | Inter | 20px / 600 / 1.3 | Dashboard section titles, dialog titles, doc title input |
| `doc-body` | Source Serif 4 | 17px / 400 / 1.7 | Paragraphs and lists inside the page |
| `doc-h1` | Source Serif 4 | 30px / 700 / 1.25 | Heading 1 in the editor |
| `doc-h2` | Source Serif 4 | 23px / 600 / 1.3 | Heading 2 |
| `doc-h3` | Source Serif 4 | 19px / 600 / 1.35 | Heading 3 |

- Load both fonts through `next/font` (self-hosted, `display: swap`). No third-party font requests at runtime.
- Serif type appears only inside `page`. The chrome never uses serif; the page never uses Inter.
- Use tabular numerals (`font-variant-numeric: tabular-nums`) for timestamps in lists.

## Layout

| Token | Value | Typical use |
|---|---|---|
| `xs` | 4px | Icon-to-label gap |
| `sm` | 8px | Inside badges, between toolbar buttons |
| `md` | 12px | Input padding, row gap |
| `lg` | 16px | Card padding, mobile gutter |
| `xl` | 24px | Dialog padding, section gap |
| `2xl` | 32px | Page-level vertical rhythm |
| `page-width` | 816px | Editor page (US Letter at 96 dpi) |

- **Dashboard:** single column, max-width 960px, centred. Header (user + Log out), action row (New document, Import file), then two sections, "My documents" and "Shared with me". Rows show title, badge and last edited.
- **Editor:** sticky header (back, title, badge, save chip, Share), sticky toolbar below it, then the 816px page centred on `canvas` with `2xl` above.
- Below 880px the page goes full width with a 16px gutter. No horizontal scroll at 360px.

## Elevation & Depth

The app is flat paper on a desk, so depth comes from the canvas/surface contrast and `line` borders, not shadows.

| Level | Treatment | Used by |
|---|---|---|
| 0 | No border, no shadow | Canvas |
| 1 | 1px `line` border | Cards, inputs, dashboard rows, page |
| 2 | `0 1px 2px rgb(28 31 35 / 0.06)` + 1px `line` | Sticky header and toolbar once scrolled |
| 3 | `0 12px 32px rgb(28 31 35 / 0.16)` + scrim `rgb(28 31 35 / 0.35)` | Dialogs, toasts |

## Shapes

| Token | Value | Used by |
|---|---|---|
| `sm` | 6px | Toolbar buttons, tooltips |
| `md` | 10px | Buttons, inputs, rows |
| `lg` | 14px | Page, dialogs |
| `full` | 9999px | Badges, save chip, avatars |

Nested radii shrink inward. Never put an `md` element flush inside an `sm` container.

## Components

| Component | Spec | States |
|---|---|---|
| `button-primary` | `primary` fill, `surface` text, `label-md`, `md` radius, 8px 14px | Hover → `primary-hover`; focus → 2px `primary` ring at 2px offset; disabled → 50% opacity, no hover |
| `button-ghost` | `surface` fill, `on-surface` text, 1px `line` border | Hover → `canvas` fill |
| `button-danger` | `danger` fill, `surface` text (6.57:1) | Only inside a confirm dialog |
| `conflict-banner` | `canvas` fill, `warning` text (4.72:1), `body-md` | 409 only: "This document changed elsewhere" with Reload latest / Overwrite |
| `divider` | 1px `line` | Between rows and dashboard sections |
| `badge-owner` | `primary-soft` / `primary`, text "Owner" | Static |
| `badge-shared` | `accent-soft` / `accent-text`, text "Shared by {name}" | Static |
| `alert-modal` | Radix AlertDialog, `dialog` sizing, lucide icon (CheckCircle2 `primary` / XCircle `danger`), title, one-line message, 1–2 buttons | Success, error (with Retry), confirm (danger tone for Delete); focus trapped; Esc closes. Replaces every native `alert`/`confirm` |
| `tooltip` | Radix Tooltip, `on-surface` fill, `surface` text, `label-md`, `sm` radius | Every icon button: label + shortcut ("Bold  Ctrl+B") |
| `help-hint` | lucide `HelpCircle` 14px, `muted`, opens a tooltip | Next to Import, Share roles and the save chip |
| `theme-toggle` | 32px icon button, Monitor / Sun / Moon, name "Theme: {current}" | Cycles System → Light → Dark; icon swap animated |
| `toolbar-button-active` | 32px square, `primary-soft` / `primary`, `sm` radius | Inactive → transparent with `on-surface` icon; `aria-pressed` mirrors active state |
| `page` | `surface`, 1px `line`, `lg` radius, 816px, 64px 72px padding, `doc-*` type | Read-only (viewer) → toolbar hidden, caret hidden |
| `input` | 40px, `line` border, `md` radius, `body-md` | Focus → `primary` border + ring; error → `danger` border + inline message below |
| `dialog` | Radix Dialog, 440px, `lg` radius, `xl` padding, level 3 | Focus trapped; Esc closes; focus returns to the trigger |
| `save-chip` / `save-chip-error` | `canvas` fill, `muted` text, `full` radius; error variant `surface` / `danger` | "Saving…" (`muted`), "Saved" (`primary` check), "Not saved — Retry" (`warning`), "Error" (`danger`) |

Icons come from `lucide-react`: 16px in buttons, 18px in the toolbar, stroke 1.75. Every icon-only button has an `aria-label` and a tooltip.

## Motion

`motion` is a custom token group. The linter warns that exporters ignore it, which is expected; the web app reads these values from CSS variables.

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 150ms | Hover, toolbar active state, save-chip text swap |
| `duration-base` | 180ms | Dialog and toast enter/exit, row insert |
| `duration-slow` | 220ms | Page fade-in on open |
| `easing` | `cubic-bezier(0.2, 0, 0, 1)` (ease-out) | Everything |
| `list-stagger` | 30ms | Dashboard rows on first load, capped at 8 rows |

- Library: `motion` (`motion/react`) for enter/exit and list stagger. Radix Dialog for overlays, `sonner` for toasts, `lucide-react` for icons.
- Animate only `opacity` and `transform`. No springs, bounce or overshoot.
- Honour `prefers-reduced-motion: reduce`: drop transforms, keep opacity fades at 0–100ms (`useReducedMotion` in motion).
- Nothing animates while the user types in the page.

## Do's and Don'ts

- **Do** keep one primary (green) action per surface: "New document" on the dashboard, "Share" in the editor, the submit button in a dialog.
- **Do** show the save status in the editor at all times. It is never hidden, never a toast.
- **Do** keep text at 4.5:1 or better in both themes. Measured (light): `primary` on `surface` 7.43, `muted` on `canvas` 5.67, `accent-text` on `accent-soft` 4.82.
- **Do** design every surface in light and dark; use tokens, never raw hex in components.
- **Do** use rust (`accent`) only for "shared" marks.
- **Do** keep keyboard parity: every toolbar action has a shortcut and a visible focus ring.
- **Don't** use gradients, emoji, glassmorphism or drop shadows on the page.
- **Don't** use native `alert`/`confirm`. Results and confirmations use `alert-modal`; field errors stay inline under the input, validated live with zod.
- **Don't** look generated: no purple/indigo, glows, sparkles, oversized rounded cards, marketing heroes or filler copy ("Welcome back!"). The reference is a restrained productivity tool — table-like lists, hairline borders, precise alignment.
- **Do** give every icon button a tooltip and an `aria-label`; put a `help-hint` wherever a rule isn't obvious (file limits, roles, autosave).
- **Don't** use `danger` red for anything that is not destructive or a failure.
- **Don't** add fonts, colours or sizes outside these tokens. If one is missing, add it here first.
- **Don't** show Share, Delete or the toolbar to users whose `access` does not allow them. Hiding them is UX only; the API still enforces access.
