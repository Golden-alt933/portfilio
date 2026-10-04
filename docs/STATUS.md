# Implementation status — 4 October 2026

## Built

- Original beveled 3D R, procedural chrome surface, desktop pointer response and scroll rotation.
- Dark grid environment, editorial typography and responsive hero.
- Scroll transition into a featured project and section reveals.
- All / Video editing / Coding filters with live result announcements.
- Six typed sample records and individual case-study URLs, with next-project navigation.
- MP4 playback, click-to-load Instagram embed support and optional showreel dialog.
- Responsive navigation, profile/contact configuration and page-specific titles/descriptions.
- Reduced-motion support, visitor motion toggle and static R fallback.

## Verified

- TypeScript checking and Vite production build passed.
- Browser rendered one active Three.js canvas and the 3D R.
- No horizontal overflow at 390px, 768px and 1440px in browser viewport checks.
- Coding and video filters each returned three matching projects.
- Mobile menu opened, navigation worked and the menu closed on route change.
- Coding and editing case-study links opened their own records.
- An editing case study loaded after direct URL reload.
- Browser Back/Forward restored the expected routes.
- Motion-off removed the canvas and showed the static R; motion-on restored rendering.

## Still needed

- Display name, contact email and chosen social profiles.
- Real editing media and coding projects, including contribution and tools.
- Actual Instagram embed availability and actual MP4 playback checks after media is supplied.
- Physical phone performance, measured performance budgets and production-host routing checks.
- Production origin, sitemap and pre-rendering for reliable crawler/social metadata before release.

The preview is local. No website has been published. The private GitHub repository stores the source and milestone commits. A Three.js chunk-size notice remains in production output; the scene is loaded dynamically, and further optimization should be guided by measured device performance.

## Reference fidelity audit

[The deployed Alche audit](ALCHE-AUDIT.md) and twelve reference screenshots are archived. Source evidence confirms a custom scene-buffer refraction shader, GPU fluid velocity distortion, curved 3D project panels, and Lenis plus ScrollTrigger snapping. The current R implementation uses a simpler material and scroll treatment. Those deeper mechanisms remain implementation work; this documentation milestone does not claim visual or behavioral parity.
