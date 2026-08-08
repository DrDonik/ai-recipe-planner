# The Eight Golden Rules of Interface Design

Shneiderman's eight rules, each followed by what it has come to mean in this
codebase. The rule is the shared vocabulary; the note under it is the
commitment already made and the artifact that carries it.

Cite them by number in pull requests. A rule with nothing concrete under it is
not yet a commitment — add the artifact rather than the aspiration.

## 1. Strive for consistency

Identical sequences for identical situations, one term per concept, one visual
treatment per role.

**Here:** one focus ring for the whole app, declared once in `@layer base`.
`PanelHeader` for every panel, `Toggle` for every setting row, `.btn-primary` /
`.btn-warning` / `.btn-quiet` for every dialog button. When a pattern exists,
extend it instead of adding a variant beside it — #292 replaced eleven
per-component focus treatments with one, and #291 collapsed three differently
shaped settings controls onto a single row. Export and import stay icon
buttons precisely because they are actions, not settings, and must not look
like the switches.

A dialog's close **X** follows one rule: dialogs holding a task or a form get
one — `ApiKeyDialog`, `GistSyncDialog`, `CopyPasteDialog`, `ReplaceRecipeDialog`
— and single-question dialogs do not, because their buttons already answer them
and a third way to say no is noise. Every X is `.btn-icon`, and every one is
named `t.a11y.close`; three separate keys said "close" before #302.

The neutral exit is worded the same way everywhere: **Cancel**, from `t.cancel`,
never "Close". Six per-dialog keys spelled that one word and `GistSyncDialog`
called its neutral button "Close", which read as a fourth outcome in a dialog
whose other two buttons decide the credential's fate. Closing is what the **X**
does; the button that decides nothing says so.

## 2. Seek universal usability

Novice and expert, age ranges, disabilities, international variation,
technological diversity.

**Here:** the accessibility conventions this repo is bound to are large enough
to live in their own file — see @UniversalDesign.md. Beyond those: every
visible string and every accessible name goes through `translations.ts` in all
four languages, and recipe generation offers both a Copy-Paste route that needs
no account and an API-key route for users who want one.

## 3. Offer informative feedback

Every action gets a response, scaled to the weight of the action.

**Here:** an asynchronous operation gets a visually hidden `role="status"`
region beside its visible indicator, so the spinner is not the only channel —
generation, the timers and the location search have one (#297). Known gap:
`CopyPasteDialog` still announces a finished copy only by relabelling the
button, which is disabled in the same moment. Feedback outranks motion
reduction: under `prefers-reduced-motion` the spinner
keeps turning at 1.5s, because at several call sites the spinner *is* the
entire message and a frozen one reads as a hang. `animate-pulse` may stop —
what it marks is also said in words, in colour and in an announcement.

## 4. Design dialogs to yield closure

Beginning, middle, end, with the end stated.

**Here:** the three consent dialogs share one shape — a declarative title
naming what happens, what is stored or sent, a short list of consequences, then
what the credential or photo is actually used for (#289). Consent is recorded
on accept only; dismissing a dialog closes nothing out (#290).

## 5. Prevent errors

Make the serious mistake hard to make, and recovery specific when it happens.

**Here:** dialog buttons are coloured by *exposure*, not by destructiveness
(#289) — `btn-warning` puts data somewhere it can be read, `btn-primary` ends
an exposure already running, `btn-quiet` changes nothing at all. Clearing an
API key destroys something and is still green, because it ends the exposure the
dialog is about. Red is reserved for irreversible loss of user content, which
is why no dialog currently uses it. Where the emphasised button is the risky
one, no button is a default: `useFocusTrap(onClose, true)` focuses the dialog
itself and Enter does nothing until the user picks.

Switching a credential off has one shape wherever it appears (#302). The toggle
commits nothing; the dialog does, through three exits — delete the credential
(`btn-primary`, the exposure ends), keep it (`btn-warning`, the exposure runs
on), or cancel (`btn-quiet`, nothing moves, and Escape lands here). Before that,
both of `ClearApiKeyDialog`'s buttons *and* its Escape switched to Copy & Paste:
the dialog posed a question the flip had already answered, and no exit led back
to API-key mode. A switch that a dialog gates may only be moved by an exit that
decided something. The mirror image is just as binding — with the credential
already stored, flipping the switch back on asks nothing at all.

## 6. Permit easy reversal of actions

**Here:** `UndoToast` with an action, rather than a confirmation dialog in
front of the deed. A confirmation taxes every correct action to catch the rare
wrong one; an undo charges only the user who was actually wrong. Reserve
dialogs for what an undo cannot walk back — data that has already left the
device.

Two credentials, two contracts, and the difference is admitted rather than
hidden: clearing the API key keeps its five-second undo, while deleting the
Gist token has none, because `handleDisable` reloads the page to reset the sync
hook and no toast survives a reload. That path says so in words instead — the
dialog states the deletion is final (#302). Where an undo is impossible, the
dialog owes the user that sentence.

## 7. Keep users in control

No surprises, no changes to familiar behaviour, no tedious sequences.

**Here:** every setting persists to localStorage, so nothing is asked twice.
Escape closes any dialog. A tooltip's first Escape dismisses the tooltip only
and is swallowed before it can close the dialog behind it; a second press gets
through (#293). Nothing leaves the device without a switch having been flipped
for it.

## 8. Reduce short-term memory load

Roughly seven plus or minus two chunks; never make users carry information
between displays.

**Here:** panels collapse with their state persisted, and the pantry stays on
screen while a recipe is generated. Credentials are entered once and never
re-asked. Accessible names carry their object — "Collapse: Diet", not
"Collapse" — so a control is intelligible without remembering which heading it
sat beneath.

---

Source: Ben Shneiderman, *Designing the User Interface*. The rules are quoted
in condensed form; the commentary is this project's own.
