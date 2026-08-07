## What

<!-- What changes, and why. Prose, not a bullet dump. -->

## Design & UX

<!-- User-facing changes only: the decisions taken and the alternatives
     rejected. Cite the Eight Golden Rules by number where they applied
     (InterfaceDesign.md), and UniversalDesign.md for accessibility. -->

## Details

<!-- Migration and persistence, prompt changes, new network targets (CSP),
     anything a reviewer would otherwise have to reconstruct from the diff. -->

## Testing

<!-- What was actually run, and what was not. Include measured contrast
     ratios for any new colour pairing. -->

---

- [ ] New strings added to all four languages (en, de, es, fr) — accessible names included
- [ ] New controls: focus visible, reachable by keyboard, state not carried by colour alone — and new motion checked under `prefers-reduced-motion`
- [ ] New panels are collapsible, state persisted to localStorage
- [ ] `npm run lint` and `npm run build` pass
- [ ] Version bumped in `package.json`, `package-lock.json` and `AGENTS.md` — or deliberately not
