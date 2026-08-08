# Universal Design

Golden Rule 2 — *seek universal usability* — spelled out for this codebase.

These are conventions, not principles: each one is a decision already taken,
with the reason attached so it does not get re-litigated or quietly undone.
Where a rule states a number, the number is checkable in a diff.

The target is **WCAG 2.2 Level AA**.

## Colour and contrast

**Thresholds.** 4.5:1 for text, 3:1 for non-text — UI borders, meaningful
icons, and the focus indicator (SC 1.4.11).

**Never hardcode a palette colour.** No `amber-600`, no `text-white` on a
filled control. Use the semantic tokens; they are declared three times over —
in `@theme`, in `:root` and in the dark-mode block — because a token declared
in only one of them silently stops switching themes (#279 found exactly that
in `--color-border-base`).

**One hue needs more than one token.** A colour used as a fill and the same
colour used as text have opposite contrast requirements, and neither value
works for the other:

| Token | Role |
| --- | --- |
| `--color-warning` | the bright accent behind tints and borders |
| `--color-warning-fill` / `-hover` | the solid fill under a button label |
| `--color-warning-text` | amber as text, or as a meaningful icon |
| `--color-text-on-warning` | the label on the fill |

**A border that identifies a control is not a hairline.** `--color-border-base`
separates surfaces and measures 1.4:1 against white — fine for that job, far
under the 3:1 SC 1.4.11 asks of anything marking a control. A button whose only
boundary is its border takes `--color-border-strong` instead: 4.2:1 on the
composited dialog glass in light mode, 5.2:1 in dark (#302). That is what turned
`.btn-quiet` from a transparent surface with a 3.5:1 label — no boundary, and
text under the threshold — into an outline button that still carries no fill and
so cannot outweigh the primary beside it.

**A filled button must not outweigh its neighbours.** Contrast alone is not
enough: at 50% lightness amber was 2.6× as bright as the primary fill, so the
risky choice drew the eye more than the recommended one whatever colour its
label was (#288). In light mode the warning fill therefore drops down the ramp
until it carries white like primary does; in dark mode, where primary is itself
light, it stays at full amber with a dark label. If you add a filled colour
role, check its weight against primary, not just its contrast.

**Colour is never the only carrier.** A finished timer says so in amber, in
the word "Done!", with a swapped-in bell icon, and through a `role="status"`
announcement. Any state that matters needs at least one non-colour channel.

## Focus

**One treatment for the entire app**: `2px solid var(--color-primary)` at 2px
offset, on `:focus-visible`, declared in `@layer base`.

- **Never write `focus:outline-none`.** Eleven components each had their own
  focus variant before #292; several were invisible (a 1.14:1 ring, a hue
  shift on a hairline border).
- **Never use `ring-offset`.** Tailwind's default offset colour is white,
  which drew a halo around every focused button in dark mode.
- `outline-color` is pinned unconditionally in the base layer. Tailwind v4
  animates it under `transition-colors`, so without the pin the ring fades in
  from `currentColor` — white on white on a filled button.
- **Prefer `transition-colors` over `transition-all`** on anything focusable;
  `transition-all` animates the outline's width and the ring lags behind fast
  tabbing.
- Elements that only receive focus programmatically — `[tabindex="-1"]`, the
  skip-link target, dialog panels holding a trap — get no ring. A ring around
  a whole panel reads as an error.
- Opting out is allowed where something else visibly carries the indicator
  (the language pill, the inset ring on flush list items). That is why the
  rule lives in `@layer base` rather than outside the layers: Tailwind's
  utilities sit in the later `@layer utilities` and can therefore override it.
  Unlayered, it would outrank every utility and no opt-out would be possible.

## Keyboard

- The **skip link is the document's first tab stop**, parked above the
  viewport until focused, and moves focus to `<main id="main-content">`.
- **Anything that reveals information on hover must also reveal it on focus,
  and must be focusable.** A `<span role="img">` is neither. On touch there is
  no hover at all, so hover-only content reaches nobody there (#293).
- Dialogs trap focus via `useFocusTrap`, restore focus on close, and close on
  Escape.
- Escape handlers on nested UI stop propagation for the first press, so
  dismissing a tooltip does not also close the dialog behind it.

## Accessible names

- **Always translated.** Add to the `a11y` group in all four language objects
  in `translations.ts`; never a hardcoded English literal. A screen-reader
  user running the app in German heard English control names before #295.
- **Name the object, not just the verb**: `` `${t.a11y.collapse}: ${title}` ``.
  Seven collapse buttons announced a bare "Collapse" with nothing to say which
  panel they meant.
- **Match the visible label** (SC 2.5.3). Where a heading and an accessible
  name quote the same words, give them one source — `appTitle` exists so the
  `<h1>` and the accessible name cannot drift apart.
- **Do not describe what is already announced.** Where a caller passes the
  same string as label and tooltip, skip `aria-describedby` or the screen
  reader reads it twice. Likewise drop a "(crossed off)" suffix when
  `aria-pressed` already carries the state.

## Live regions

Dynamic changes invisible to assistive technology are the easiest defect to
ship, and the fix has one trap in it:

**A region announces changes to text it already had.** A region created in the
same render that first fills it stays silent (#297). So:

- Render a **permanent** `<p className="sr-only" role="status">` and change its
  contents, rather than conditionally rendering the region.
- Derive the message **while rendering** from state; do not push it on a
  transition. This is also what keeps a per-second countdown out of the region.
- **Put the point first.** State leads; an instruction sentence follows only
  when it is needed to disambiguate.
- **One region per concern.** Duplicate announcements are worse than none.
- Report what is otherwise undiscoverable — the location search announces the
  *number* of hits, which a screen-reader user cannot see.

## Motion

`prefers-reduced-motion` is already handled globally, in two places. **Do not
add `useReducedMotion` per component.**

- **Framer Motion**: `<MotionConfig reducedMotion="user">` at the root in
  `main.tsx`. It covers every motion component present and future, drops
  transforms and layout animations, and keeps opacity so `AnimatePresence`
  still orchestrates enter and exit.
- **CSS**: one `@media (prefers-reduced-motion: reduce)` block in `index.css`.
  Durations collapse to a hair above zero rather than `animation: none`, so
  anything awaiting an animation event still gets it and nothing is stranded
  mid-keyframe.
- **Animations of explicit non-transform values are outside MotionConfig's
  reach** and must opt out themselves — `TimerTray` drops its height keys, or
  its ResizeObserver would republish `--timer-tray-height` on every frame.
- **Less motion must not mean less feedback.** The two documented exceptions
  are in the CSS block; extend that comment if you add a third.

## Type size and touch

- **12px (`text-xs`) is the floor.** No `text-[10px]`, no `text-[0.65rem]` —
  least of all on anything carrying functional state.
- `cursor: pointer` only where a click does something. Info icons use
  `cursor-help`; disabled controls use `disabled:cursor-not-allowed`, which
  works only because `button { cursor: pointer }` sits in `@layer base`.
- No `pointer-events-none` on a tooltip: SC 1.4.13 requires that the pointer
  can travel onto it without it vanishing, which matters under magnification.

## State on controls

Use the role that already exists before inventing markup:

| Control | Markup |
| --- | --- |
| Settings switch | `role="switch"` + `aria-checked` |
| Collapsible panel | `aria-expanded` on the trigger |
| Toggle button (mute, crossed-off) | `aria-pressed` |
| Switch that opens a dialog instead of committing | `aria-haspopup="dialog"` |
| Purely decorative icon beside a label | `aria-hidden="true"` |

## Before opening a pull request

- Tab through the change end to end. Every stop visibly ringed, nothing
  reachable that does nothing, nothing interactive skipped.
- Every new string in four languages, accessible names included.
- New colour pairing? State the measured ratio in the PR body, as #287, #288
  and #289 do.
- Switch the OS to reduced motion and confirm feedback survives.
- `<html lang>` follows the selected UI language — already wired; do not
  regress it.
