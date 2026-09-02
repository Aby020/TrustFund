# TrustFund styles

The design system lives here as plain CSS custom properties (design tokens)
plus global base rules.

## Files

| File            | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `tokens.css`    | The design system source of truth. Three token layers below.   |
| `base.css`      | Reset, typographic rhythm, hover/focus conventions, reduced-motion. |
| `utilities.css` | A tiny set of layout + a11y utilities (`.container`, `.sr-only`, skip link). |

## Token layers

1. **Primitive** — raw values: `--emerald-600`, `--space-4`, `--shadow-md`,
   `--duration-fast`, `--radius-md`. Change rarely.
2. **Semantic** — purpose aliases: `--color-primary`, `--color-text-muted`,
   `--color-surface`, `--color-success-soft`. Theme switching swaps these.
3. **Component** — component-specific mappings: `--button-radius`,
   `--input-height-md`, `--dialog-max-width`.

## Rules

- **Components never reference a raw hex or primitive directly.** Use the
  semantic token (e.g. `var(--color-primary)`) or, for a deliberate exception,
  a value from a primitive scale via a named semantic token.
- **No `!important`** outside the reduced-motion override in `base.css`.
- **No magic numbers.** Spacing/radius/duration/shadows come from the scales.
- **One component = one `<kebab-name>.css` file** next to its component.

## Motion conventions

Use the tokenized durations and easings:

```css
transition: background-color var(--duration-fast) var(--ease-standard),
            color var(--duration-fast) var(--ease-standard);
```

Micro-interactions: 120–160ms for state changes, 200–240ms for elevation and
entrances. Everything honors `prefers-reduced-motion` globally (see `base.css`).

## Dark mode

Semantic tokens are re-mapped inside a `prefers-color-scheme: dark` block.
The app is **theme-ready but does not force dark mode**. To make a component
dark-safe, only reference semantic tokens — never hard-code a surface color.