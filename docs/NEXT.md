# Next changes (handoff, 6 November 2026)

Branch: `feat/alche-style-upgrade` (last pushed: `64ce480`). Reference site: alche.studio.
Alche's mechanisms (shader names, constants) are recorded in `ALCHE-AUDIT.md` and `SEQUENCE-AUDIT.md`;
their live bundle can be re-read for exact behaviour (re-implement, don't copy code).

## Requested, not yet done

1. **Loader:** make the tagline animation behave like Alche's sentence on the loader
   ("Cut with feeling. Build with purpose." currently just fades in; Alche scrambles it in
   character by character, 40 ms per character after 300 ms).
2. **CREATE:** push the wordmark a little further back (smaller / deeper behind the R).
   The user likes the new heavier, glowing CREATE.
3. **3D R texture:** too much glow on the R now; the glow is not the issue, the glass
   texture is. Alche's A looks far more premium. Rework the material, and reduce the bloom on the R.
4. **Remove the extra layer** visible on both CREATE and the R (a doubled, offset ghost copy;
   see the finale where a second R/CREATE sits behind, and the hero). Likely the DOM fallback
   `.immersive-wordmark` or the loader image showing through; find and remove it.
5. **Ink:** make it flow; right now it reads as a dotted trail (pointer events arrive
   faster than frames, so interpolate splats between pointer samples). Add a slight white tint
   so it is visible on dark areas.
6. **Services carousel pacing:** a panel moves right-to-left in a single scroll. Make each panel
   hold in the middle; roughly 3 scrolls per service.
7. **After the last service goes full screen:** too much scroll before the grid frame starts
   closing. Start the frame immediately after full frame. Make the frame look better: use the
   site's plus marks, in white.
8. **Finale R:** the R should move up properly into the CREATE slot (it sits low and doubled).
9. **R going 3D → 2D (first pale transition):** on Alche, the curved background also flattens
   to 2D as the logo flattens, so it feels smooth. Implement the same (flatten the curved
   wall/grid together with the R).
10. **Mission / Vision text like Alche:** when Mission arrives the white text is highlighted
    with black blocks; when Vision arrives the previous statement blurs and disappears, and the
    same blur-out happens before the zoom into the R.
11. **Frame position:** grid frame size is fine but not centred; adjust it and the surrounding
    elements so nothing overlaps.
12. **Videos:** set up real project videos (MP4s preferred; they play in the 3D panels, wall,
    services and transitions). Also needs real titles, one-liners and years in `src/content.ts`.

## Working notes

- Run: `npm run dev` (Vite). Verify in a visible browser window; the hidden preview pane
  throttles animation and makes the intro take very long.
- The user wants changes committed and pushed when a batch is done, without asking.
