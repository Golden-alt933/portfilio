/**
 * Live material controls for the hero R. The panel UI writes here and the
 * renderer reads it every frame, so no React render is involved per frame.
 */
export interface SceneTweaks {
  roughness: number;
  noiseScale: number;
  dispersion: number;
  tint: [number, number, number];
  /** User rotation offset (radians) from the orientation gizmo. */
  userRotX: number;
  userRotY: number;
  /** Renderer writes the letter's current orientation for the readout. */
  quaternion: [number, number, number, number];
}

export const TWEAK_DEFAULTS = {
  roughness: 0.14,
  noiseScale: 9,
  dispersion: 0.03,
  tint: [1, 1, 1] as [number, number, number],
};

export const sceneTweaks: SceneTweaks = {
  ...TWEAK_DEFAULTS,
  tint: [...TWEAK_DEFAULTS.tint],
  userRotX: 0,
  userRotY: 0,
  quaternion: [0, 0, 0, 1],
};

export function hexToTint(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

export function tintToHex([r, g, b]: [number, number, number]) {
  return (
    "#" +
    [r, g, b]
      .map((channel) =>
        Math.round(channel * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
