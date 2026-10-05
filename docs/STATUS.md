# Implementation status — 5 October 2026

## Built

- Original beveled R with scene-buffer chromatic refraction, studio reflections, pointer response, and scroll-linked rotation.
- Dark procedural background with slowly cycling contour, blue/lilac, and violet/cyan/orange tile patterns, staggered UV shifts and blackouts, curved grid, and desktop GPU velocity distortion.
- Construction loader using the same R contour as the mesh; readiness gate, scroll lock, overlapping radial lens reveal, progressive depth, and bounded fallback.
- One global Lenis provider with LERP .08, driven by GSAP's ticker. It owns anchor movement, menu locking, route positioning, and history restoration.
- GSAP ScrollTrigger progress and scrubbed translate-y text staggers; one body palette timeline uses the same continuous light mix as the GPU scene.
- Six curved project cards on a diagonal 3D track. The last card remains visible at its stop; cards rise and recede while the camera approaches the R and the pale scene wipes upward. Reverse scroll reverses these values.
- Pale mission/vision scenes with a white outline R and readable dark navigation; service portal and dark contact transition.
- Hover scrambling, rolling labels, mobile menu, static fallback, filters, and typed case-study pages.
- MP4 playback and click-to-load Instagram support in the existing media components, ready for supplied content.

## Browser verification

The original motion pass used `index-DGbmBQHr.js` and `HeroScene-Zc2PnsyY.js`. The subsequent ink/pointer refinement builds as `index-DAwQraF8.js` and `HeroScene-BHO-FFwH.js`.

- TypeScript checking and Vite production build pass; new shaders compile in the browser with renderer status ready and no captured console errors.
- Construction SVG draws a complete R contour. Loader releases its scroll lock and reveals one active canvas.
- Desktop project controls reach all six stops. At the last stop, work visibility remains 1.
- A real canvas click on the fifth foreground panel opens Interactive experiment. Browser Back restores progress .800 at y=3600; Forward and the in-app Back to work link also restore that card.
- The renderer stays mounted and pauses on project routes; returning home keeps one canvas and does not repeat the loader.
- Intermediate transition values were observed at y=4644: work visibility .575, pale mix .232, body RGB(57,60,59), and mission title translate-y 23.04px. Reverse scrolling produces intermediate values again rather than jumping to a chapter flag.
- Mission reaches pale mix 1 at y=5040, with black header navigation. Services reaches service mix 1 and pale mix 0 at its start.
- The 390px mobile hero fits without horizontal overflow. Menu opening, Escape dismissal, restored scrolling, motion-off, and motion-on work.
- Motion-off removes the canvas and restores visible mission/vision headings. All / Video / Code filters show 6 / 3 / 3 records.
- An editing case study loads after direct URL reload without initializing the GPU scene. Its title and sample content are correct.

Screenshots were saved in the workspace's `work/portfolio-validation` directory. These checks verify behavior and composition, not a measured frame-rate budget or pixel-identical reproduction.

### Ink and pointer follow-up

- Sustained mouse-position tilt now supplements the movement impulse. Desktop browser observations at opposite horizontal positions showed yaw about -.483 and +.476 radians, with visible changes to the R's side faces and reflections.
- A separate low-resolution pigment field adds a seeded, irregular intro splatter and movement-driven desktop color trails. Blue-black tiled patterns, asynchronous stripe/UV glitches, localized cyan/violet glow, and cooler reflections refine the palette. The existing pale scene remains a separate continuous blend.
- The three-second depth/reveal sequence precedes the surrounding text. A captured frame at reveal .355 showed the R and ink while hero paragraph opacity and header opacity were both 0; after completion they reached 1. The motion control now follows the same delayed metadata gate.
- The final production bundle renders with one ready canvas and no captured shader errors. The 390px viewport has no horizontal overflow; the menu opens, Escape closes it, and motion-off removes the canvas while exposing all text immediately. Re-enabling motion returns one ready canvas without replaying the intro.
- The final Motion study route opens from the work scene. Back to work restores y=720 / progress .000 with one canvas, reveal 1, and no loader.
- Luna 6 handled pigment transport and reveal staging in separate files; Sol 6.1 reviewed bindings, bounded input, missed-intro handling, reduced motion, and resource cleanup. Root performed the live browser checks.

The browser connection intermittently stalled during this pass and recovered; this is not a frame-rate measurement. Physical-device performance remains to be measured.

## Content and release work

- Display name, contact email, chosen social profiles, real editing media, and actual coding projects are still needed.
- Instagram availability and actual MP4 playback must be checked after media is supplied. Public reel links can be embedded when allowed; original MP4s give more control over presentation.
- Physical-phone performance, WebGL context-loss recovery, production-host routing, crawler metadata, and social previews remain unverified.
- Vite reports a 515.9 kB Three.js vendor chunk. The scene loads dynamically; optimize further against measured device performance.

The preview is local and no website has been published. The private GitHub repository stores the implementation. The new source evidence is in [motion refinement](MOTION-REFINEMENT.md), and the larger archive is in [Alche audit](ALCHE-AUDIT.md). The portfolio uses original assets and an Inter substitute for the reference's Acumin headings; it does not claim exact parity with Alche's geometry, media, or randomized frames.
