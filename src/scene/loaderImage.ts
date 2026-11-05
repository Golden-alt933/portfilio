/**
 * Raster copy of the intro's construction drawing. The final composite blends
 * it with the scene and pushes both outward as the reveal front expands, so
 * the drawing itself bursts open into the 3D scene (after the reference's
 * loading-image handoff). Geometry matches IntroLoader: a 240-unit stage
 * centred on the viewport.
 */
const R_PATH =
  "M-1.42 -2.05V2.05H0.08C1.2 2.05 1.62 1.5 1.62 0.76C1.62 0.16 1.28 -0.27 0.72 -0.49L1.72 -2.05H0.58L-0.24 -0.73H-0.57V-2.05ZM-0.57 1.22V0.18H0.06C0.79 0.18 0.86 1.22 0.06 1.22Z";

export function drawLoaderImage(canvas: HTMLCanvasElement, width: number, height: number) {
  const scale = Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const mobile = width <= 600;
  const stage = Math.max(
    220,
    mobile ? Math.min(width * 1.08, height * 0.78) : Math.min(Math.min(width, height) * 0.94, 690),
  );
  const unit = stage / 240;
  const centreY = mobile ? height * 0.45 : height / 2;
  ctx.save();
  ctx.translate(width / 2, centreY);
  ctx.scale(unit, unit);
  ctx.translate(-120, -120);
  ctx.lineWidth = 0.85 / unit;
  ctx.strokeStyle = "rgba(160,160,160,0.75)";

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  for (const y of [-40, 40, 80, 120, 160, 200, 280]) line(-1400, y, 1640, y);
  for (const x of [-120, 40, 80, 120, 160, 200, 360]) line(x, -900, x, 1140);
  for (const [deg, offsets] of [
    [30, [0, 5, 10]],
    [-30, [0, 5]],
  ] as const) {
    const r = (deg * Math.PI) / 180;
    const dx = Math.cos(r) * 1400;
    const dy = -Math.sin(r) * 1400;
    for (const offset of offsets) {
      const cx = 120 + Math.sin(r) * offset;
      const cy = 120 + Math.cos(r) * offset;
      line(cx - dx, cy - dy, cx + dx, cy + dy);
    }
  }
  for (const radius of [86, 118]) {
    ctx.beginPath();
    ctx.arc(120, 120, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(83,96,96,0.9)";
  ctx.strokeRect(39, 39, 162, 162);

  ctx.save();
  ctx.translate(120, 120);
  ctx.scale(37, -37);
  ctx.translate(-0.15, 0);
  const letter = new Path2D(R_PATH);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill(letter, "evenodd");
  ctx.lineWidth = 1.3 / (unit * 37);
  ctx.strokeStyle = "#fff";
  ctx.stroke(letter);
  ctx.restore();
  ctx.restore();

  // Horizontal edge fade, as on the DOM loader.
  const fade = ctx.createLinearGradient(0, 0, width, 0);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.09, "rgba(0,0,0,0)");
  fade.addColorStop(0.91, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);
}
