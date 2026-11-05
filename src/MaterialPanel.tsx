import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { TWEAK_DEFAULTS, hexToTint, sceneTweaks, tintToHex } from "./sceneTweaks";

type Vec3 = [number, number, number];

/** Rotate v by unit quaternion q = [x, y, z, w]. */
function rotate(q: [number, number, number, number], v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
}

const AXES: { v: Vec3; label: string; color: string }[] = [
  { v: [1, 0, 0], label: "X", color: "#ff3653" },
  { v: [0, 1, 0], label: "Y", color: "#8adb00" },
  { v: [0, 0, 1], label: "Z", color: "#2c8fff" },
];

function fmt(value: number) {
  const text = Math.abs(value) >= 0.995 ? value.toFixed(1) : value.toFixed(2);
  return text.replace(/^(-?)0\./, "$1.");
}

/** A small lil-gui style toggle used by both panels. */
function Toggle({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button className="gui-toggle" onClick={onClick} aria-expanded={open} aria-label={label}>
      <i />
      <i />
    </button>
  );
}

function QuaternionPanel() {
  const [open, setOpen] = useState(true);
  const [quat, setQuat] = useState(sceneTweaks.quaternion);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const element = canvas.current;
      const ctx = element?.getContext("2d");
      if (!element || !ctx) return;
      const size = element.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (element.width !== size * dpr) {
        element.width = size * dpr;
        element.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const c = size / 2;
      const radius = size * 0.36;
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1;
      for (const r of [size * 0.47, size * 0.43]) {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const q = sceneTweaks.quaternion;
      const ends = AXES.flatMap((axis) => {
        const p = rotate(q, axis.v);
        return [
          { x: p[0], y: p[1], z: p[2], label: axis.label, color: axis.color, positive: true },
          { x: -p[0], y: -p[1], z: -p[2], label: "", color: "#9a9a9a", positive: false },
        ];
      });
      ends.sort((a, b) => a.z - b.z);
      for (const end of ends) {
        const x = c + end.x * radius;
        const y = c - end.y * radius;
        if (end.positive) {
          ctx.strokeStyle = end.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c, c);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        const dot = (end.positive ? 6.5 : 5.5) * (0.9 + end.z * 0.12);
        ctx.fillStyle = end.color;
        ctx.globalAlpha = end.positive ? 1 : 0.85;
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (end.positive) {
          ctx.fillStyle = "#fff";
          ctx.font = "700 8px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(end.label, x, y + 0.5);
        }
      }
      if (now - last > 120) {
        last = now;
        setQuat([...q]);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rx: sceneTweaks.userRotX, ry: sceneTweaks.userRotY };
  };
  const onMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    if (!start) return;
    const clamp = (v: number) => Math.max(-1.4, Math.min(1.4, v));
    sceneTweaks.userRotY = clamp(start.ry + (event.clientX - start.x) * 0.02);
    sceneTweaks.userRotX = clamp(start.rx + (event.clientY - start.y) * 0.02);
  };

  return (
    <aside className="gui-panel gui-quaternion" aria-label="Logo orientation">
      <header>
        <span>MainLogo Quaternion</span>
        <Toggle open={open} onClick={() => setOpen(!open)} label="Toggle orientation panel" />
      </header>
      {open && (
        <>
          <div className="gui-quat-row">
            <b aria-hidden="true" />
            {quat.map((value, index) => (
              <code key={index}>{fmt(value)}</code>
            ))}
          </div>
          <canvas
            ref={canvas}
            className="gui-gizmo"
            role="slider"
            aria-label="Drag to rotate the R. Arrow keys also work."
            aria-valuetext={`yaw ${sceneTweaks.userRotY.toFixed(2)}, pitch ${sceneTweaks.userRotX.toFixed(2)}`}
            tabIndex={0}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(event) => {
              const step = 0.1;
              const map: Record<string, [number, number]> = {
                ArrowLeft: [0, -step],
                ArrowRight: [0, step],
                ArrowUp: [-step, 0],
                ArrowDown: [step, 0],
              };
              const delta = map[event.key];
              if (!delta) return;
              event.preventDefault();
              sceneTweaks.userRotX = Math.max(-1.4, Math.min(1.4, sceneTweaks.userRotX + delta[0]));
              sceneTweaks.userRotY = Math.max(-1.4, Math.min(1.4, sceneTweaks.userRotY + delta[1]));
            }}
          />
          <button
            className="gui-reset"
            onClick={() => {
              sceneTweaks.userRotX = 0;
              sceneTweaks.userRotY = 0;
            }}
          >
            Reset Quaternion
          </button>
        </>
      )}
    </aside>
  );
}

type SliderKey = "roughness" | "noiseScale";
const sliders: { key: SliderKey; min: number; max: number; step: number; digits: number }[] = [
  { key: "roughness", min: 0, max: 0.5, step: 0.01, digits: 2 },
  { key: "noiseScale", min: 1, max: 20, step: 0.5, digits: 1 },
];

function MaterialControls() {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState({
    roughness: sceneTweaks.roughness,
    noiseScale: sceneTweaks.noiseScale,
    tint: tintToHex(sceneTweaks.tint),
  });
  const rgb = sceneTweaks.tint.map((c) => Math.round(c * 255));
  return (
    <aside className="gui-panel gui-material" aria-label="Logo material">
      <header>
        <span>MainLogo Material</span>
        <Toggle open={open} onClick={() => setOpen(!open)} label="Toggle material panel" />
      </header>
      {open && (
        <div className="gui-rows">
          {sliders.map((slider) => {
            const value = values[slider.key];
            const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
            return (
              <label key={slider.key}>
                <span>{slider.key}</span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={value}
                  style={{ "--fill": `${percent}%` } as CSSProperties}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    sceneTweaks[slider.key] = next;
                    setValues((current) => ({ ...current, [slider.key]: next }));
                  }}
                />
                <output>{value.toFixed(slider.digits)}</output>
              </label>
            );
          })}
          <label>
            <span>color</span>
            <input
              type="color"
              value={values.tint}
              onChange={(event) => {
                sceneTweaks.tint = hexToTint(event.target.value);
                setValues((current) => ({ ...current, tint: event.target.value }));
              }}
            />
            <output className="gui-color-text">
              {`{r: ${rgb[0]}, g: ${rgb[1]}, b: ${rgb[2]}}`}
            </output>
          </label>
          <button
            className="gui-reset gui-reset--inline"
            onClick={() => {
              Object.assign(sceneTweaks, {
                roughness: TWEAK_DEFAULTS.roughness,
                noiseScale: TWEAK_DEFAULTS.noiseScale,
                tint: [...TWEAK_DEFAULTS.tint],
              });
              setValues({
                roughness: TWEAK_DEFAULTS.roughness,
                noiseScale: TWEAK_DEFAULTS.noiseScale,
                tint: tintToHex(TWEAK_DEFAULTS.tint),
              });
            }}
          >
            reset
          </button>
        </div>
      )}
    </aside>
  );
}

/** Live controls for the glass R, styled after a lil-gui debug overlay. */
export default function MaterialPanel() {
  return (
    <>
      <QuaternionPanel />
      <MaterialControls />
    </>
  );
}
