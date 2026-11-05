# Next changes (handoff, 6 November 2026)

Branch: `feat/alche-style-upgrade` (last pushed: `64ce480`). Reference site: alche.studio.
Alche's mechanisms (shader names, constants) are recorded in `ALCHE-AUDIT.md` and `SEQUENCE-AUDIT.md`;
their live bundle can be re-read for exact behaviour (re-implement, don't copy code).

## Done (6 November 2026)

Items 1–11 of the previous list are implemented: loader sentence scramble, CREATE pushed back
(scale .8), new clear-glass R material, ghost copy removed (R was double-sided without depth
write; wide bloom taps also drew offset copies), continuous ink ribbon with white tint,
services hold (~2.6 screens per service, centre plateau), frame closes right after full frame
and is centred with white plus marks, finale R docks onto the measured R slot of CREATE,
wall flattens with the R, mission/vision marker wipe and blur-out.

## Requested, not yet done

1. **Videos:** set up real project videos (MP4s preferred; they play in the 3D panels, wall,
    services and transitions). Also needs real titles, one-liners and years in `src/content.ts`.

## Working notes

- Run: `npm run dev` (Vite). Verify in a visible browser window; the hidden preview pane
  throttles animation and makes the intro take very long.
- The user wants changes committed and pushed when a batch is done, without asking.
