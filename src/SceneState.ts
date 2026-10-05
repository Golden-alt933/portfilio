export type SceneChapter =
  | "hero"
  | "works"
  | "mission"
  | "vision"
  | "services"
  | "contact";

/** The homepage is the sole writer; the persistent renderer only reads this ref. */
export interface SceneState {
  chapter: SceneChapter;
  chapterProgress: number;
  workProgress: number;
  scrollVelocity: number;
  reveal: number;
  workVisibility: number;
  lightMix: number;
  servicesMix: number;
  contactMix: number;
  portalProgress: number;
}

export function initialSceneState(): SceneState {
  return {
    chapter: "hero",
    chapterProgress: 0,
    workProgress: 0,
    scrollVelocity: 0,
    reveal: 0,
    workVisibility: 0,
    lightMix: 0,
    servicesMix: 0,
    contactMix: 0,
    portalProgress: 0,
  };
}
