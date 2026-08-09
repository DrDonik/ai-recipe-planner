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

A settings row has two icon slots and each holds one role: the leading icon is
what the row *is* — its glyph, and its state where the row has one the switch
cannot show — and the trailing icon is what can be *done* about it. Sync used to
end its line with the status cloud, which was also the only way into the sync
dialog: an indicator that silently doubled as a button, and the one place in the
app where a state and the control acting on it were the same pixel. The state
moved to the front and the trailing column now says on sync what it says on the
key's row — a pencil where a credential is stored, an ⓘ where none is (#311).
Only sync's leading icon carries state, because only sync has state to carry:
pulling, pushing, pending, error and a token kept past a switch-off are five
things "on" and "off" cannot say. Give the leading slot a state when the row has
one that outruns its switch, not to decorate it.

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
four languages, and meal-plan generation offers both a Copy-Paste route that
needs no account and a direct route for users who want one. The two are a choice
about that one step, not two tiers of the app: a stored key powers photo
recognition, storage tips, images, replacement and chat on either route.

## 3. Offer informative feedback

Every action gets a response, scaled to the weight of the action.

**Here:** an asynchronous operation gets a visually hidden `role="status"`
region beside its visible indicator, so the spinner is not the only channel —
generation, the timers and the location search have one (#297), and so does the
copy in `CopyPasteDialog`, which used to announce a finished copy only by
relabelling the button it disabled in the same moment (#302). Sync was the last
one without: it runs unasked in the background, and it spoke only through a
colour and a tooltip that had to be tabbed onto to be read (#311). Where an action
can end two ways, both ends share the region — a copy that succeeded and a copy
that failed are one concern, and two regions for them would talk over each
other. Feedback outranks motion
reduction: under `prefers-reduced-motion` the spinner
keeps turning at 1.5s, because at several call sites the spinner *is* the
entire message and a frozen one reads as a hang. `animate-pulse` may stop —
what it marks is also said in words, in colour and in an announcement.

## 4. Design dialogs to yield closure

Beginning, middle, end, with the end stated.

**Here:** the four consent dialogs share one shape — a declarative title
naming what happens, what is stored or sent, a short list of consequences, then
what the credential, photo or generated image is actually used for (#289).
Consent is recorded on accept only; dismissing a dialog closes nothing out
(#290).

One dialog per new *kind* of exposure or cost, not one per feature. A stored
API key powers six things — meal plans, photo recognition, storage tips,
recipe images, replacement and the cooking chat — and only two of them ask
anything beyond the key's own storage warning: the photo, because an image
leaves the device, and image generation, because it is billed per call.
Replacement, tips and chat send the same kind of text the key was entered for,
so they ask nothing. A fourth dialog in front of them would tax the capability
without telling the user something new.

## 5. Prevent errors

Make the serious mistake hard to make, and recovery specific when it happens.

**Here:** dialog buttons are coloured by *exposure*, not by destructiveness
(#289) — `btn-warning` puts data somewhere it can be read, `btn-primary` ends
an exposure already running, `btn-quiet` changes nothing at all. Clearing an
API key destroys something and is still green, because it ends the exposure the
dialog is about. Where the emphasised button is the risky
one, no button is a default: `useFocusTrap(onClose, true)` focuses the dialog
itself and Enter does nothing until the user picks.

**Red says what went wrong or what removes something; it does not fill a
button.** #289 reserved red for irreversible loss of user content and noted that
no dialog used it — but thirty call sites already spoke red as error text and as
the remove affordance, so the reservation could only hold by leaving all thirty
untokenised. It now holds where it does work: the `danger` tokens carry errors
and removal, and there is no `-fill` pair for a button label to sit on, so the
red button that rule forbids cannot be built without adding one deliberately
(#302). A button that destroys still follows the exposure axis — clearing the
API key is green because it ends an exposure.

Switching a credential off has one shape wherever it appears (#302, #305). The
toggle commits nothing; the dialog does, through three exits — delete the
credential (`btn-primary`, the exposure ends), keep it (`btn-warning`, the
exposure runs on), or cancel (`btn-quiet`, nothing moves, and Escape lands
here). A switch that a dialog gates may only be moved by an exit that decided
something. The mirror image is just as binding — with the credential already
stored, flipping the switch back on asks nothing at all. Sync is where that
shape lives; the API key no longer has a switch to gate.

**A switch may not gate a credential it does not own.** The Gemini API key was
tied to the generation route, so turning direct generation off asked what should
become of the key — a question the flip has no business asking now that the key
also drives photo recognition, storage tips, images, replacement and chat. The
route switch therefore commits in both directions, and the key's deletion moved
into the key's own dialog: `ApiKeyDialog` offers it (`btn-primary`, the exposure
ends) beside saving (`btn-warning`, the exposure begins), and hands the decision
to `ClearApiKeyDialog`, which steps in rather than stacking. Two states
disappeared with the coupling: a key that outlived its feature, and the red flag
that used to mark it. A stored key is always in use, so there is nothing left to
warn about that its own icon does not already say.

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
through (#293). Nothing leaves the device unasked: a credential is entered
deliberately, every request that uses it starts with a click, and the two that
expose something the key's own warning did not cover ask once before the first
one.

**A control that vanishes is a surprise; a control that cannot act is a dead
end.** Image generation was a header switch that only existed with a key in
API mode, so it appeared and disappeared as other settings moved. Disabling it
instead would have been worse — a `disabled` switch is not focusable, so it
cannot carry the tooltip that would explain itself, and UniversalDesign.md's
"nothing reachable that does nothing" rules it out either way. The switch is
gone: the capability shows up wherever it is used, and the question it was
really asking — *do you know this costs money?* — is asked at the button that
spends it.

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
