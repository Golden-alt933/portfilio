# Motion refinement — 5 October 2026

This pass studies [Alche's live homepage](https://alche.studio/) and its public deployed application. The implementation uses original R geometry, shaders, and sample posters. Source mechanisms inform the choreography; the portfolio does not reuse Alche's letter mesh or media.

## What creates the changing dark background

The archived [application bundle](https://alche.studio/_astro/index.astro_astro_type_script_index_0_lang.Cn_goiN_.js) contains `noiseFrag$1`, `BGQuadTree`, `BGQuadTreePatterns`, `StableFluids`, and `topSceneMixerFrag`. Animated simplex noise supplies a low resolution procedural texture; recursively subdivided panels switch between noise, stripes, and violet/cyan/orange patterns. Individual UV shifts and blackout events produce the glitch-like changes. A curved grid, fine dot texture, darkening, vignette, and fluid velocity distortion connect the layers.

The live homepage inspected today exposed three canvases and no video elements. Its hero visibly changed from near-black diagonal stripes to muted violet, blue, and orange patches. This supports the source evidence that the hero background is procedural, rather than a looping background video. Project panels can of course contain separate imagery.

The stable UI palette is black `#000000`, white `#FFFFFF`, acid accent `#D7FF00`, and secondary grays. Animated scene colors are shader mixtures, not a single CSS background swatch. See the [existing color and typography audit](ALCHE-AUDIT.md).

## Loader handoff

The [loading construction JSON](https://alche.studio/common/loading/logo/data.json) animates a flat SVG drawing. `LoadingUIController` then fades the overlay for 0.8 seconds; `GL.onLoadingComplete()` animates `uLoaded` over three seconds. `finalCompositeFrag` applies a radial reveal and lens warp. These are separate overlay and WebGL layers; the source does not establish a topology-changing A morph.

For this original R, the handoff overlaps the SVG exit with a radial shader ripple, progressive depth, and increasing reflective lighting. Rendering readiness gates the reveal. Reduced motion bypasses the animated sequence, and a timeout preserves access if GPU initialization fails.

## Continuous scroll choreography

The source uses Lenis with an application animation loop, ScrollTrigger section progress, persistent scene buffers, and long section spacers. `works_outro` suppresses pointer camera drift while `mission_in` supplies the mission composite wipe. Separately, during `service_in`, `mainLogoVert` mixes perspective coordinates with fullscreen coordinates via `uServiceRotate`; `uServiceIn` reveals the side screen with noise. These are different transitions. The requested camera approach into the R is an original adaptation of the connected scene treatment.

The portfolio uses one global Lenis provider, GSAP ScrollTrigger scrubbed section timelines, and a shared continuous scene contract. Work visibility, pale-scene blend, service blend, contact blend, and portal travel are explicit normalized values. Cards rise away while the R rotates and the camera approaches its side. The pale chapter follows that movement instead of appearing at a binary chapter boundary. Text reveals use translate-y and stagger; reversing scroll reverses the same timelines.

## Evidence limits

The live source is minified and can change after deployment. The symbol inventory and detailed constants are archived in [ALCHE-AUDIT.md](ALCHE-AUDIT.md). An original procedural approximation can reproduce the design mechanism without guaranteeing identical frames: randomized mosaics, the different letter geometry, and the eventual portfolio media all change the composition. Browser validation is recorded separately in [STATUS.md](STATUS.md).
