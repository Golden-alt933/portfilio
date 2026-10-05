/** Scroll geometry shared by the homepage choreography and route restoration. */
export const WORK_ENTRY_SCREENS = 1.2;
export const WORK_CARD_STEP_SCREENS = 1.6;
export const WORK_EXIT_SCREENS = 1.5;

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function smooth01(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** Distance the works section must scroll, in viewport-height units. */
export function workTravelScreens(count: number) {
  const transitions = Math.max(0, count - 1);
  return WORK_ENTRY_SCREENS +
    transitions * WORK_CARD_STEP_SCREENS +
    WORK_EXIT_SCREENS;
}

/** Total section height includes one viewport for its sticky scene. */
export function workTrackScreens(count: number) {
  return 1 + workTravelScreens(count);
}

/** Exact document-relative scroll offset for a card's dwell point. */
export function workCardOffset(index: number, sectionTop: number, viewport: number, count: number) {
  const card = Math.max(0, Math.min(Math.max(0, count - 1), index));
  return sectionTop + (WORK_ENTRY_SCREENS + card * WORK_CARD_STEP_SCREENS) * viewport;
}

/**
 * Converts physical travel between the first and last card stops into a
 * smoothed carousel progress. Values pin at 0/1 through the entry/exit zones.
 */
export function workProgressAtOffset(offset: number, viewport: number, count: number) {
  if (count <= 1) return offset < WORK_ENTRY_SCREENS * viewport ? 0 : 1;
  const raw = (offset / viewport - WORK_ENTRY_SCREENS) /
    (WORK_CARD_STEP_SCREENS * (count - 1));
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  const scaled = raw * (count - 1);
  const segment = Math.min(count - 2, Math.floor(scaled));
  const local = smooth01(scaled - segment);
  return (segment + local) / (count - 1);
}

/** Inverse of workProgressAtOffset, used to restore a selected card. */
export function workOffsetAtProgress(progress: number, viewport: number, count: number) {
  if (count <= 1) return WORK_ENTRY_SCREENS * viewport;
  const p = clamp01(progress);
  const scaled = p * (count - 1);
  const segment = Math.min(count - 2, Math.floor(scaled));
  const wanted = scaled - segment;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 18; i += 1) {
    const middle = (low + high) / 2;
    if (smooth01(middle) < wanted) low = middle;
    else high = middle;
  }
  const easedLocal = p >= 1 ? 1 : (low + high) / 2;
  return (WORK_ENTRY_SCREENS + (segment + easedLocal) * WORK_CARD_STEP_SCREENS) * viewport;
}

/** Absolute end of the final card dwell before the cards leave left. */
export function workLastStopOffset(sectionTop: number, viewport: number, count: number) {
  return sectionTop + (WORK_ENTRY_SCREENS + Math.max(0, count - 1) * WORK_CARD_STEP_SCREENS) * viewport;
}
