/** Original geometric CREATE artwork, shared by the scene texture and outro. */
export const CREATE_HEIGHT = 250;
export const CREATE_WIDTH = 1282;
export const CREATE_GLYPHS = [
  { letter: "C", x: 0, path: "M204 70H160C146 47 126 37 101 37C61 37 40 65 40 125C40 185 61 213 101 213C126 213 145 201 160 179H204C185 227 150 250 101 250C37 250 0 206 0 125C0 44 37 0 101 0C150 0 185 23 204 70Z" },
  { letter: "R", x: 224, path: "M0 250V0H102C163 0 195 29 195 78C195 116 177 140 145 150L200 250H153L103 157H41V250ZM41 37V120H99C134 120 153 106 153 78C153 50 134 37 99 37Z" },
  { letter: "E", x: 444, path: "M0 0H174V38H41V102H161V140H41V212H174V250H0Z" },
  { letter: "A", x: 638, path: "M0 250L113 0H117L230 250H185L165 204H65L45 250ZM81 167H149L115 88Z" },
  { letter: "T", x: 888, path: "M0 0H200V38H121V250H79V38H0Z" },
  { letter: "E", x: 1108, path: "M0 0H174V38H41V102H161V140H41V212H174V250H0Z" },
] as const;

export function drawCreateWordmark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const scale = Math.min((width * 0.94) / CREATE_WIDTH, (height * 0.8) / CREATE_HEIGHT);
  ctx.save();
  ctx.translate((width - CREATE_WIDTH * scale) / 2, (height - CREATE_HEIGHT * scale) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  for (const glyph of CREATE_GLYPHS) {
    ctx.save();
    ctx.translate(glyph.x, 0);
    ctx.fill(new Path2D(glyph.path), "evenodd");
    ctx.restore();
  }
  ctx.restore();
}
