# R — Frame & Function

A portfolio for video editing and creative development, inspired by the spatial presentation of alche.studio. Uses an original extruded R, restrained chrome materials, responsive typography and motion.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` runs TypeScript checking and creates a production build in `dist/`. `npm run preview` serves that build locally.

## Stack

React, TypeScript, Vite, Three.js, GSAP and React Router. The procedural R and environment are authored in code; there are no copied Alche assets.

## Content status

The current identity is the temporary monogram R. Project concepts are explicitly marked as samples. Actual reels, coding projects, personal links and contact details must be supplied before publication. No website deployment has been made.

Edit `src/content.ts` to set the profile and project data. Set `sample: false` only when a record describes actual work. Add `videoUrl` for MP4 playback or `instagramUrl` for click-to-load Instagram embeds. Add `posterUrl` for preview imagery and `repositoryUrl` / `demoUrl` for coding links. Reel URLs must be public and embedding must be allowed; actual Instagram availability is external to this application. Large video files should not be committed.

The hero has a motion toggle and respects the system's reduced-motion preference. A static R appears when motion is off or WebGL is unavailable. Case-study URLs work in Vite; a production static host needs an SPA fallback to `index.html`, or pre-rendered project routes, before release.

Instagram links can serve as outbound links or embeds when the post permits embedding. Original MP4s and poster images provide the most predictable presentation. Keep large media files outside Git; store them on a media host or supply a hosting plan before publishing.
