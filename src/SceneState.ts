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
  heroExit: number;
  workEntry: number;
  workExit: number;
  paleFlatten: number;
  portalTravel: number;
  portalReveal: number;
  workMediaProgress: number;
  finaleProgress: number;
  /** 0→1→0 bell while the big WORKS title passes between hero and cards. */
  worksTitle: number;
  /** 0→1 linear travel through the WORKS title window (drives its descent). */
  worksTravel: number;
  /** Slight R tilt as the vision chapter arrives (reference uVisionRotate). */
  visionRotate: number;
  /** R turns side-on and its side screen morphs to full frame. */
  serviceRotate: number;
  /** Side screen reveals the services scene through noise. */
  serviceScreenIn: number;
  /** Services sheet arrival (bend/swirl in). */
  serviceListIn: number;
  /** Local progress through the services chapters. */
  servicesProgress: number;
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
    heroExit: 0,
    workEntry: 0,
    workExit: 0,
    paleFlatten: 0,
    portalTravel: 0,
    portalReveal: 0,
    workMediaProgress: 0,
    finaleProgress: 0,
    worksTitle: 0,
    worksTravel: 0,
    servicesProgress: 0,
    visionRotate: 0,
    serviceRotate: 0,
    serviceScreenIn: 0,
    serviceListIn: 0,
  };
}
