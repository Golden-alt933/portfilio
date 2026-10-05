# Audit implementation workflow

The initial plan favored a small Sol-led build. The later instruction explicitly requested parallel GPT-6 Luna workers and GPT-6.1 Sol integration supervision. This milestone follows that instruction.

| Owner                    | Bounded responsibility                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| GPT-6 Luna: scene        | Original R geometry, refraction/reflection shaders, background field, fluid solve, curved work panels and resource disposal |
| GPT-6 Luna: home         | Section composition, shared scroll-state contract, project stops, responsive layout and static content                      |
| GPT-6 Luna: motion       | Original construction loader, hover scrambling, rolling labels and motion cleanup                                           |
| GPT-6.1 Sol: integration | Review shared interfaces, fix scroll/lifecycle defects, correct visual layering and finish renderer persistence             |
| Main integration agent   | Shared shell, fonts, routing integration, production-browser verification, documentation and Git milestone                  |

The 5 October refinement uses two bounded GPT-6 Luna workers: one for the global scroll provider and semantic section timelines, one for the GPU scene and loader. GPT-6.1 Sol reviews their contract, route restoration, readiness, resource cleanup, and source evidence while they work. The main agent studies the live reference and validates the assembled browser result. This keeps the coupled animation work in a small team instead of adding another delegation tier.

Workers had separate file ownership. When Luna handed a component over, Sol could edit it; simultaneous edits to the same component were avoided. The final browser review used the complete production build rather than accepting component reports as proof.

## Architecture

- `SceneHost.tsx` owns the renderer lifetime, readiness and shared motion preference. The scene survives project-route changes and pauses while hidden.
- `ScrollProvider.tsx` owns the single application-scoped Lenis controller and route positioning. GSAP's ticker advances Lenis and its scroll event updates ScrollTrigger.
- `ImmersiveHome.tsx` writes chapter/work progress and continuous scene mixes to `SceneState.ts`. ScrollTrigger timelines animate the body palette and section text; the renderer reads the same scroll contract.
- `HeroScene.tsx` owns GPU geometry, materials, render targets and pointer raycasts. `scene/FluidField.ts` owns the desktop velocity/pressure field.
- `MotionUI.tsx` owns loader and text effects. Accessible names remain stable while visual characters change.
- `content.ts` owns portfolio records and later media URLs. Project templates and the index use the same records.

## Usage discipline

The workers received bounded tasks and returned compact handoffs. Sol took over the coupled rendering and lifecycle corrections after the first integration review. No extra agent tier or paid service was introduced. This run does not have a reliable aggregate token counter; no exact token cost or savings is claimed.

See [implementation status](STATUS.md) for observed browser checks and remaining release work. Real project media, physical-phone measurements and production-host checks remain separate from source/build verification.

The new source observations and the distinction between the mission wipe and service-side projection are recorded in [motion refinement](MOTION-REFINEMENT.md).
