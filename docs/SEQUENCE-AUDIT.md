# Full sequence audit — 5 October 2026

This note records the public Alche sequence for the next R refinement. Source mechanisms and constants below are verified; adaptation choices are identified separately. It supplements [ALCHE-AUDIT.md](ALCHE-AUDIT.md), rather than replacing its broader inventory.

## Primary sources and freshness

The live [homepage](https://alche.studio/) still references the archived [APP bundle](https://alche.studio/_astro/index.astro_astro_type_script_index_0_lang.Cn_goiN_.js). A direct public HTTP read on 5 October returned 200 and exactly matched the archived decoded text: **1,831,212 characters**. Locations below are zero-based .NET character offsets in `work/alche-audit/index.astro_astro_type_script_index_0_lang.Cn_goiN_.js`; symbol names are the more durable locator.

Other primary sources: [shared CSS](https://alche.studio/_astro/about.DKIoZJhT.css), [homepage CSS](https://alche.studio/_astro/index.CQ0ApTUm.css), [loader background JSON](https://alche.studio/common/loading/bg/data.json), [loader logo JSON](https://alche.studio/common/loading/logo/data.json), [outro JSON](https://alche.studio/top/outro/data.json), [footer logo SVG](https://alche.studio/common/alche_logo.svg), and the archived homepage HTML / scene GLTF manifest. The outro JSON and footer SVG were read directly over public HTTP for this pass; neither was imported into the portfolio.

## Typography: font roles versus artwork

| Surface | Confirmed implementation | Consequence for R |
|---|---|---|
| Main hero ALCHE | `AlcheLogo2D` @1,016,717 loads `/top/logo.png`; plane width28, height `28*250/1204`, double-sided, no depth write; visibility changes over .5s by section | It is raster artwork, not an identified font. A new CREATE wordmark needs intentionally drawn/tuned proportions, not a claim that Acumin reproduces ALCHE. |
| Header ALCHE | Inline SVG, viewBox `0 0 1000 209`, white filled paths | Path artwork, not live text. |
| Footer ALCHE | `/common/alche_logo.svg`, same 1000×209 viewBox; five paths, zero text elements | Static vector wordmark. The separate preceding outline animation must not be confused with this footer image. |
| Header links / loader slogan | IBM Plex Mono; navigation14px400 with .1em tracking; slogan .7vmax300, portrait12px | Match the monospaced role. Shared CSS includes Latin400 face `/_astro/ibm-plex-mono-latin-400-normal.Dm_PoFIZ.woff2`. |
| Work title / date | Acumin Pro40px500; Google Sans Code12px300 with .2em tracking | Different title and technical metadata roles. |
| Services | Acumin Pro Wide500 title, Acumin Pro300 item headings; title container `max(70px,5vw)` desktop | A generic bold display sans is not an exact font match. |
| Mission/vision headings | Inline SVG paths; `stroke:#333`, 1px; desktop widths30% /32.62295%, mobile80% /65.2459% | Drawn headings are distinct from the **white 3D letter outline**. |

The application loads Adobe kit [ukr2yqt](https://use.typekit.net/ukr2yqt.js). The above are declared CSS faces, not proof of a font origin for the logo artwork. New R/CREATE paths and any substituted fonts remain original assets. Sources: APP `AlcheLogo2D`, archived homepage SVG/HTML, shared CSS, homepage CSS.

## 1. Loader: moving construction lines, then letter, then GL reveal

`LoadingUIController` @1,812,105 creates **two SVG Lottie layers**, with autoplay/loop disabled and `xMidYMid slice` fitting. Shared CSS makes the overlay black, fixed, full width and100lvh, z-index9999. The drawing container is desktop80% width, full height, centered, with transparent-to-black masking over the outer10% edges; mobile is100% width and unmasked. Logo path strokes are forced to `#BBB` by CSS.

Both loader JSON assets are2304×2304, 29.9700012fps, frames0–90.0000037, approximately3.003s long. Background JSON has30 shape layers: circles, horizontal/vertical lines and diagonal construction shapes. Nested shapes include26 trim-path operators,27 strokes and four gradient fills. Logo JSON has one outline layer, four path groups, four strokes and one trim-path operator. These are animated drafting artwork, not an ordinary stationary grid with a percentage label. Sources: loader JSON and shared CSS.

The app **scrubs cropped ranges**, rather than playing both entire files:

- Background time targets45% of its asset duration, limited by real loading progress and a1s minimum. Current time approaches target by .1 per update. Homepage completion also requires real progress and elapsed fraction≥.999 and target error<.01s.
- Slogan starts after400ms. Nonspace characters resolve after an additional300ms plus40ms per character; unresolved characters redraw every32ms using the ALCHE character set.
- Letter phase is1.8s on homepage /1s on subpages, scrubbing normalized logo progress .144→.5215 with the app's cubic Bézier easing.
- Overlay hide is .8s `power2.out`. In the initial bootstrap, **the code awaits that hide before** `GL.onLoadingComplete()` @1,122,956 animates loaded0→1 over3s; `data-gl_loading_end` follows800ms after GL reveal starts.

`finalCompositeFrag` @600,832 then blends the rasterized `/common/loading.svg` texture with the rendered scene/thumbnail buffer. Radius is aspect-corrected; the front grows with loaded×1.4, with a smoothing interval growing .2→.9. Scene UV scale expands .5→1, and both scene and loading UVs shift radially by a sine envelope with maximum .1. The loading image flips vertically; desktop fitting uses .8 scale and horizontal edge fade. At loaded≥.999 the shader resolves directly to the scene. This is **a sampled-image handoff and lens warp**, not evidence of a topology morph of the A.

**Original R choice:** an800ms overlap of loader exit with GL reveal, depth extrusion, dye plumes, delayed CREATE/text, and bounded readiness timeout. Preserve those user-requested choices, but label the overlap and dye as adaptations; they are not the exact source ordering.

## 2. Hero: coherent procedural layers

`MainLogo` @1,007,638 uses the named GLTF A, outline and side-screen meshes. The main letter refracts an already-rendered surrounding buffer; the background is not a hero movie. `BGQuadTree` @1,035,918 uses four random recursive panel layouts. The patterns switch among channel-noise blue/lilac, high-contrast noise contours and violet/cyan/orange. UV offsets and blackouts run asynchronously; geometry changes every4s in kv. A curved64×64 grid and81 cross instances connect the scene. See the existing audit for complete shader constants.

Pointer channels differ: letter rotation uses center-weighted **velocity**, while `CameraController` @1,040,507 follows normalized absolute pointer position with range .5 and damping3. Source restoring force in kv is2. The stronger held R tilt and transported color dye requested in the previous pass are original additions, not evidence of a source density solver. Source `StableFluids` stores velocity/pressure/divergence.

## 3. Works entrance, track, snapping and exit

`TopScrollManager` @1,412,736 separates `works_intro`, `works`, `works_progress` and `works_outro`. CSS gives intro20vh, each project100lvh and outro150lvh. `works_progress` spans section-top/viewport-bottom through section-bottom/viewport-top, while the snap trigger spans top/top through bottom/bottom. Snap stops are nearest `1/(N-1)`, duration1s, directional:false; continuous Lenis motion remains active between stops. The source is not a universal wheel-to-next-fullpage controller.

`WorksThumbnails` @635,734 computes progress×(N+1), rounds it, blends40% of the remaining distance toward the continuous index, then damps that value again. For card-relative offset x:

| Property | Source constant/formula |
|---|---|
| Position | `(sin(x)*11, -x, cos(x)*5-6)` |
| Yaw | `.6*x` |
| Scale | `.9 + .1*mobileWeight + .2*(1-min(1,abs(x)))` |
| Visibility | `1-smoothstep(abs(x),.8,2.5)`, multiplied by start/end gates |
| Parent layout | y .8, scale .6 |

`WorksThumbnail` @634,085 uses the GLTF `ThumbnailScreen`, not a flat CSS window. Its fallback is a box8×4.5×.1 with16×16 subdivisions. `worksThumbnailVert` @631,344 compresses depth .2 and adds a cosine bow: `cos(pos.x/4*PI/2*.5)*1.5-1`. Cover UVs preserve image aspect. Fragment @632,486 takes four lens samples per RGB channel with small spectral differences, normal-based offsets, edge vignette and subtle reflection. The declared box-distance/rounding helper functions are **unused**: no exact corner radius follows from them. Mesh bevel/corner fidelity must come from original geometry or a deliberate approximation; the archived GLTF manifest alone does not establish a numeric radius.

Work titles enter over .7s with .01s character stagger and10px rise, then exit over .4s with10px lift. Mouse hover changes the cursor, with no verified card scale/tilt tween. Click uses a real ray hit with the same mesh on down/up. `works_outro` reduces camera pointer drift; it does not itself provide the services fullscreen projection. Sources: APP `WorksItemController`, `EasyRaycaster`, `CameraController` and homepage CSS.

## 4. Mission/vision: neutral pale grid and separate drawing systems

`TopPageMissionVisionScene` @1,110,545 sets background **#D7DBDC**, camera z8/fov60, and a flat dark grid. Ordinary line alpha is .1×.2=.02; crosses use .2 alpha. The main letter's `mainLogoOutlineFrag` @652,814 outputs pure white. The transparent base color also matches #D7DBDC. Actual composite frames include fluid and vignette modulation, so the background may not sample to one uniform hex at every pixel.

Mission scene blend uses `topSceneMixerFrag` @598,319: a vertical moving front, widened/curved by velocity-like transition blur, not a hard body background switch. `mission_in` spans top/bottom→top/top. `vision` has its own trigger, and mobile boundaries differ.

`_BaseMissionVisionController` uses heading stroke length500; raw and rounded path progress damp at .4/.4. Lines rise8px with `power3.out`; line window .1 and marker window .5 are **normalized progress**, not elapsed seconds. Markers fill black behind white statement text. Desktop exit opacity is `max(0,1-2*outProgress)` and blur reaches10px; mobile skips this blur. Source: APP controller and homepage CSS. A white R outline, gray drawn heading, and marker-backed white statement are three separate elements.

## 5. Service portal and movie panels

`mainLogoVert` @651,638 rotates the letter's side toward view and interpolates projected perspective coordinates with screen coordinates using `uServiceRotate`. The source service trigger begins unusually early: top/bottom+=150%→top/center. `mainLogoScreenFrag` @653,064 samples a **separate service scene**, shifts geometry UV toward screen UV with progress to the .2 power, uses five RGB lens taps, and reveals the screen through animated noise. This is a connected portal/projection transition, not just placing a turquoise box beside the letter.

`ServiceList` @1,055,299 uses warped grid/cross/title/panel geometry. The depth wave amplitude is4×serviceIn, attenuated by stellla progression; the bend evolves with scroll instead of being static. Service items occupy170lvh, with separate snap/progress/event triggers.

It loads `/top/service/uefn.mp4`, `/top/service/ue.mp4`, `/top/service/stellla.mp4`. `ServiceThumbnail` @1,051,384 creates **detached** muted, looping, autoplay, playsInline video elements, produces sRGB `VideoTexture` on canplaythrough, and retries blocked autoplay on first pointerdown. Thus observing zero video elements in the DOM does **not** establish that services have no video textures. Hero procedural-background evidence remains valid. Portfolio sample imagery or generated motion must be called original media, not these source movies.

## 6. Closing: framed content, separate procedural glow, outline wordmark, footer

`StelllaSectionController` @1,236,938 derives opacity `min(1,progress*1.5)` and updates the frame. CSS frame inset derives from -100→100px desktop /-20→20px mobile; stellla spacer150lvh. This precedes a separate outro wrapper: desktop200vh with sticky100vh screen, mobile aspect ratio1.7.

`OutroController` @1,802,635 loads `/top/outro/data.json`, loop/autoplay false, SVG `xMidYMid slice`. Its trigger spans wrapper-top/viewport-bottom through300px/viewport-bottom. After reaching the threshold it:

1. Reveals `OutroGL` over1s.
2. Moves the separate **filled A SVG** from left50% to17.1% over1s, `power2.inOut`; CSS size20.4% of wrapper width.
3. Starts the Lottie drawing after100ms.

The directly inspected outro JSON is1100×1100,29.9700012fps, frames0–119.0000048 (**3.971s**),28 shape layers, no assets. It includes construction lines/circles and two named outline-logo layers, the second starting frame57 (~1.902s). This supports a deliberate multi-stage line/wordmark drawing, rather than a simple final text opacity fade.

`OutroGL` @1,799,875 renders a separate procedural noise glow. Its `planeFrag` @1,797,253 weights RGB .3/.5/1, adds a radial falloff and .3 brightness factor, with mild random grain. It is not a background video. On leave-back, the controller stops/resets Lottie to frame0, hides GL over1s and moves A back to50%. After this animation, the footer displays the **static five-path ALCHE SVG** plus links/copyright.

**Original R contract:** keep an R in place of the source A; draw a new CREATE/portfolio outline from original paths, retain reversible progress/timeline cleanup, and preserve accessible DOM links. Source constants can guide the rhythm without reusing the proprietary wordmark, mesh or movies. Do not claim a source font, exact mesh corner radius, or frame-identical procedural art that has not been established.

## Integration review boundaries

- Root: loader/moving-line overlay, original wordmark geometry, font roles and final visual QA.
- Scene worker: GPU geometry/materials, neutral pale scene, curved panels and service portal sampling.
- Scroll worker: normalized scene channels, measured section boundaries, project snap pacing and reversible DOM stages.
- Reviewer: this document only during research, followed by read-only source/build/runtime integration review. One Lenis provider and one authoritative reveal/state writer remain required. Reduced motion must reveal content immediately; all new targets, listeners and timelines must dispose.
