import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  TWEAK_DEFAULTS,
  hexToTint,
  sceneTweaks,
  tintToHex,
} from "./sceneTweaks";

const GIZMO_RANGE = 0.9; // radians at the edge of the gizmo

type Slider = {
  key: "roughness" | "noiseScale" | "dispersion";
  label: string;
  min: number;
  max: number;
  step: number;
};

const sliders: Slider[] = [
  { key: "roughness", label: "roughness", min: 0, max: 0.5, step: 0.01 },
  { key: "noiseScale", label: "noiseScale", min: 1, max: 20, step: 0.5 },
  { key: "dispersion", label: "dispersion", min: 0, max: 0.12, step: 0.005 },
];

/**
 * Live controls for the glass R, in the spirit of a lil-gui debug panel.
 * Writes straight into `sceneTweaks`, which the renderer reads each frame.
 */
export default function MaterialPanel() {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState({
    roughness: sceneTweaks.roughness,
    noiseScale: sceneTweaks.noiseScale,
    dispersion: sceneTweaks.dispersion,
    tint: tintToHex(sceneTweaks.tint),
  });
  const [handle, setHandle] = useState({ x: 0, y: 0 });
  const [quat, setQuat] = useState(sceneTweaks.quaternion);
  const dragging = useRef(false);
  const gizmo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setQuat([...sceneTweaks.quaternion]), 120);
    return () => window.clearInterval(id);
  }, [open]);

  const setSlider = (key: Slider["key"], value: number) => {
    sceneTweaks[key] = value;
    setValues((current) => ({ ...current, [key]: value }));
  };

  const moveHandle = (event: PointerEvent<HTMLDivElement>) => {
    const rect = gizmo.current!.getBoundingClientRect();
    let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    let y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    setHandle({ x, y });
    sceneTweaks.userRotY = x * GIZMO_RANGE;
    sceneTweaks.userRotX = y * GIZMO_RANGE;
  };

  const reset = () => {
    Object.assign(sceneTweaks, {
      ...TWEAK_DEFAULTS,
      tint: [...TWEAK_DEFAULTS.tint],
      userRotX: 0,
      userRotY: 0,
    });
    setValues({
      roughness: TWEAK_DEFAULTS.roughness,
      noiseScale: TWEAK_DEFAULTS.noiseScale,
      dispersion: TWEAK_DEFAULTS.dispersion,
      tint: tintToHex(TWEAK_DEFAULTS.tint),
    });
    setHandle({ x: 0, y: 0 });
  };

  return (
    <aside
      className={`material-panel${open ? "" : " is-collapsed"}`}
      aria-label="Glass R material controls"
    >
      <header>
        <span>R / Material</span>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Collapse material controls" : "Expand material controls"}
        >
          {open ? <Minus size={12} /> : <Plus size={12} />}
        </button>
      </header>
      {open && (
        <div className="material-panel__body">
          <div className="material-panel__rows">
            {sliders.map((slider) => (
              <label key={slider.key}>
                <span>{slider.label}</span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={values[slider.key]}
                  onChange={(event) =>
                    setSlider(slider.key, Number(event.target.value))
                  }
                />
                <output>
                  {values[slider.key].toFixed(slider.step < 0.01 ? 3 : 2)}
                </output>
              </label>
            ))}
            <label>
              <span>tint</span>
              <input
                type="color"
                value={values.tint}
                onChange={(event) => {
                  sceneTweaks.tint = hexToTint(event.target.value);
                  setValues((current) => ({ ...current, tint: event.target.value }));
                }}
              />
              <output>{values.tint}</output>
            </label>
          </div>
          <div className="material-panel__orient">
            <div
              ref={gizmo}
              className="material-gizmo"
              role="slider"
              aria-label="Rotate the R. Drag, or use arrow keys."
              aria-valuetext={`x ${handle.x.toFixed(2)}, y ${handle.y.toFixed(2)}`}
              tabIndex={0}
              onPointerDown={(event) => {
                dragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                moveHandle(event);
              }}
              onPointerMove={(event) => dragging.current && moveHandle(event)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
              onKeyDown={(event) => {
                const step = 0.12;
                const delta =
                  event.key === "ArrowLeft" ? [-step, 0]
                  : event.key === "ArrowRight" ? [step, 0]
                  : event.key === "ArrowUp" ? [0, -step]
                  : event.key === "ArrowDown" ? [0, step]
                  : null;
                if (!delta) return;
                event.preventDefault();
                const x = Math.max(-1, Math.min(1, handle.x + delta[0]));
                const y = Math.max(-1, Math.min(1, handle.y + delta[1]));
                setHandle({ x, y });
                sceneTweaks.userRotY = x * GIZMO_RANGE;
                sceneTweaks.userRotX = y * GIZMO_RANGE;
              }}
            >
              <i className="axis axis-x" />
              <i className="axis axis-y" />
              <b
                style={{
                  transform: `translate(${handle.x * 34}px, ${handle.y * 34}px)`,
                }}
              />
            </div>
            <div className="material-panel__quat">
              <span>quaternion</span>
              <code>
                {quat.map((value) => value.toFixed(2)).join("  ")}
              </code>
              <button onClick={reset}>
                <RotateCcw size={11} /> reset
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
