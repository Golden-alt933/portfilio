# R — Frame & Function

A portfolio for video editing and creative development, based on the rendering and interaction findings in the alche.studio audit. An original R sits inside a responsive WebGL scene, with refracted typography, pointer distortion and a diagonal track of curved project windows.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` runs TypeScript checking and creates a production build in `dist/`. `npm run preview` serves that build locally.

## Pages

- `/` — the immersive sequence: hero (glass R, news, live material panel), WORKS title and curved card track, mission, vision, three service chapters, and a CREATE finale that doubles as the footer.
- `/works` — the full, filterable project index (linked as "All works" / "Index").
- `/work/:slug` — individual case studies.

## Stack

React, TypeScript, Vite, Three.js, GSAP, Lenis and React Router. The R, background patterns, construction loader and sample posters are authored locally. Archived reference screenshots are documentation, not application assets.

The scene samples a background render target for eight-tap R refraction, adds a studio cube reflection, and bends the project posters across subdivided 3D panels. A small GPU velocity/pressure solve drives desktop pointer distortion. One application-level Lenis controller owns smooth scrolling with LERP and route positioning; reduced motion uses native scrolling and static artwork. GSAP ScrollTrigger scrubs the body palette and staggered text reveals. Continuous scene values connect the rising card exit, camera approach, rotating R, and pale background wipe.

The interface uses locally served IBM Plex Mono, Google Sans Code and Inter. Inter is a licensed substitute for the reference's Acumin headings. Hover scrambling, rolling contact labels, an SVG construction loader and a separate scene reveal reproduce the reference's interaction vocabulary with original content.

## Content status

The current identity is the temporary monogram R. Project concepts are explicitly marked as samples. Actual reels, coding projects, personal links and contact details must be supplied before publication. No website deployment has been made.

Edit `src/content.ts` to set the profile and project data, the hero's `updates` news lines and the three `services` chapters (each picks a project visual by slug). Projects can also carry `year` and a short `highlight` badge for the home track. Set `sample: false` only when a record describes actual work. Add `videoUrl` for MP4 playback or `instagramUrl` for click-to-load Instagram embeds. Add `posterUrl` for preview imagery and `repositoryUrl` / `demoUrl` for coding links. Reel URLs must be public and embedding must be allowed; actual Instagram availability is external to this application. Large video files should not be committed.

The hero has a motion toggle and respects the system's reduced-motion preference. A static R appears when motion is off or WebGL is unavailable. Case-study URLs work in Vite; a production static host needs an SPA fallback to `index.html`, or pre-rendered project routes, before release.

Instagram links can serve as outbound links or embeds when the post permits embedding. Original MP4s and poster images provide the most predictable presentation. Keep large media files outside Git; store them on a media host or supply a hosting plan before publishing.

## Reference audit

[Alche technical audit](docs/ALCHE-AUDIT.md) documents the deployed reference's shaders, pointer response, loader, scroll snapping, typography and hover interactions. Reference screenshots and asset hashes are stored in `docs/alche-reference/`. [Implementation status](docs/STATUS.md) records what this portfolio implements and what still needs real media or device validation.

[Motion refinement](docs/MOTION-REFINEMENT.md) records the live background and transition findings. [Build workflow](docs/BUILD-WORKFLOW.md) describes the bounded Luna workers and Sol integration review.

This is an adaptation of the reference's mechanisms and composition, with an original R and portfolio copy. It does not claim pixel-for-pixel parity with Alche's proprietary geometry, imagery, fonts or animation assets.
