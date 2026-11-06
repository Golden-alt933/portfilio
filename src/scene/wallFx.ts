import * as THREE from "three";

/**
 * Wall looks, in shader order:
 * 0 electric-blue noise, 1 black/white contour stripes, 2 violet/ice/orange
 * glow, 3 an edit timeline, 4 a scrolling code listing.
 * Each look carries its own glitch rates: how many tiles black out and how
 * many sample a shifted part of the picture.
 */
const LOOKS = [
  { blackOut: 0, blackRand: 0, shift: 0, shiftEvery: 0.2, shiftRand: 0.5 },
  { blackOut: 0, blackRand: 0.5, shift: 0.5, shiftEvery: 0.1, shiftRand: 5 },
  { blackOut: 0, blackRand: 0.5, shift: 0.5, shiftEvery: 0.1, shiftRand: 5 },
  { blackOut: 0, blackRand: 0.25, shift: 0.15, shiftEvery: 0.4, shiftRand: 3 },
  { blackOut: 0, blackRand: 0.25, shift: 0.15, shiftEvery: 0.4, shiftRand: 3 },
];

export type WallUniforms = {
  uPatCur: { value: number };
  uPatNext: { value: number };
  uPatSel: { value: number };
  uPatType: { value: number };
  uBlackOut: { value: number };
  uBlackHash: { value: number };
  uShift: { value: number };
  uShiftPower: { value: number };
  uShiftHash: { value: number };
  uGlyphMode: { value: number };
};

export function wallUniforms(): WallUniforms {
  return {
    uPatCur: { value: 0 },
    uPatNext: { value: 0 },
    uPatSel: { value: 1 },
    uPatType: { value: 0 },
    uBlackOut: { value: 0 },
    uBlackHash: { value: 0 },
    uShift: { value: 0 },
    uShiftPower: { value: 0 },
    uShiftHash: { value: 0 },
    uGlyphMode: { value: 0 },
  };
}

/**
 * Drives the video wall: the whole wall swaps to a new look every 1-2 s plus
 * the transition, by a hard cut, a 0.3 s scatter or a 3 s flip sweep, while
 * tiles black out and jump on their own short clocks.
 */
export class WallDirector {
  private next = 0;
  private start = 0;
  private duration = 0;
  private nextChange = 1.5;
  private nextBlack = 0;
  private nextShift = 0;
  private shiftTarget = 0;

  constructor(private u: WallUniforms) {}

  update(t: number, dt: number, still: boolean) {
    const u = this.u;
    if (still) {
      u.uPatSel.value = 1;
      u.uBlackOut.value = 0;
      u.uShift.value = 0;
      return;
    }
    if (t >= this.nextChange) {
      let pick = Math.floor(Math.random() * LOOKS.length);
      if (pick === this.next) pick = (pick + 1) % LOOKS.length;
      u.uPatCur.value = this.next;
      u.uPatNext.value = pick;
      this.next = pick;
      const type = Math.floor(Math.random() * 3);
      u.uPatType.value = type;
      this.duration = [0, 0.3, 3][type];
      this.start = t;
      this.nextChange = t + Math.random() + this.duration + 1;
    }
    u.uPatSel.value = this.duration
      ? Math.min(1, (t - this.start) / this.duration)
      : 1;

    const look = LOOKS[this.next];
    if (t >= this.nextBlack) {
      u.uBlackOut.value = look.blackOut + Math.random() * look.blackRand;
      u.uBlackHash.value = Math.random();
      u.uGlyphMode.value = Math.floor(Math.random() * 3);
      this.nextBlack = t + 1;
    }
    if (t >= this.nextShift) {
      u.uShift.value = look.shift;
      u.uShiftHash.value = Math.random();
      this.shiftTarget = Math.random();
      this.nextShift = t + look.shiftEvery + look.shiftRand * Math.random();
    }
    u.uShiftPower.value +=
      (this.shiftTarget - u.uShiftPower.value) * Math.min(1, dt * 4);
  }
}

const FACE = "Barlow, Inter, Arial, sans-serif";

/** Four small marks for the tiles: the R, a play head, a code tag, a record dot. */
export function paintWallGlyphs(canvas: HTMLCanvasElement) {
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 210px ${FACE}`;
  ctx.fillText("R", 128, 138);
  ctx.beginPath();
  ctx.moveTo(320 + 18, 48);
  ctx.lineTo(320 + 18, 208);
  ctx.lineTo(320 + 158, 128);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 120px ${FACE}`;
  ctx.fillText("</>", 640, 134);
  ctx.beginPath();
  ctx.arc(896, 128, 70, 0, Math.PI * 2);
  ctx.fill();
}

/** The wordmark strip that tiles across the wall in rows. */
export function paintWallMarquee(canvas: HTMLCanvasElement) {
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, 2048, 256);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `800 150px ${FACE}`;
  ctx.fillText("R STUDIO  —  FRAME & FUNCTION  —", 1024, 134, 2000);
}

export function makeWallTexture(canvas: HTMLCanvasElement, repeat: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
