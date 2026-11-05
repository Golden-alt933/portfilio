import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import "./motion-ui.css";

type ScrambleTextProps = {
  text: string;
  className?: string;
  as?: "span" | "strong";
};

const SCRAMBLE_CHARS = "R/CREATE";

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setReduced(
        query.matches ||
          document.documentElement.dataset.portfolioMotion === "reduced",
      );
    update();
    query.addEventListener("change", update);
    window.addEventListener("portfolio:motion-change", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("portfolio:motion-change", update);
    };
  }, []);

  return reduced;
}

function getScrambledText(text: string, startedAt: number, now: number) {
  const chars = Array.from(text);
  const visibleIndices = chars.flatMap((char, index) =>
    /\s/.test(char) ? [] : [index],
  );
  const elapsed = now - startedAt;
  const resolutionWindow = 200;
  const frame = Math.floor(elapsed / 28);
  return chars
    .map((char, index) => {
      if (/\s/.test(char)) return char;
      const position = visibleIndices.indexOf(index);
      const resolveAt =
        (position / Math.max(1, visibleIndices.length)) * resolutionWindow;
      if (elapsed >= resolveAt + resolutionWindow * 0.35) return char;
      return SCRAMBLE_CHARS[(frame * 3 + index * 5) % SCRAMBLE_CHARS.length];
    })
    .join("");
}

/** Scrambles for 400ms on pointer or keyboard focus, then restores the source text. */
export function ScrambleText({
  text,
  className,
  as = "span",
}: ScrambleTextProps) {
  const Tag = as as ElementType;
  const node = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);
  const [visualText, setVisualText] = useState(text);
  const reducedMotion = useSystemReducedMotion();

  const stop = useCallback(() => {
    setActive(false);
    setVisualText(text);
  }, [text]);

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const anchor = element.closest("a");
    if (!anchor) return;

    const onFocusIn = () => setActive(true);
    const onFocusOut = (event: FocusEvent) => {
      if (!anchor.contains(event.relatedTarget as Node | null)) stop();
    };
    const onPointerEnter = () => setActive(true);
    const onPointerLeave = () => {
      if (!anchor.contains(document.activeElement)) stop();
    };
    anchor.addEventListener("focusin", onFocusIn);
    anchor.addEventListener("focusout", onFocusOut);
    anchor.addEventListener("pointerenter", onPointerEnter);
    anchor.addEventListener("pointerleave", onPointerLeave);
    return () => {
      anchor.removeEventListener("focusin", onFocusIn);
      anchor.removeEventListener("focusout", onFocusOut);
      anchor.removeEventListener("pointerenter", onPointerEnter);
      anchor.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [stop]);

  useEffect(() => {
    if (reducedMotion || !active) {
      setVisualText(text);
      return;
    }

    let timeout = 0;
    const startedAt = performance.now();
    const tick = () => {
      const now = performance.now();
      setVisualText(getScrambledText(text, startedAt, now));
      if (now - startedAt < 400) timeout = window.setTimeout(tick, 28);
      else setVisualText(text);
    };
    timeout = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timeout);
  }, [active, reducedMotion, text]);

  return (
    <Tag
      ref={node as React.Ref<HTMLElement>}
      className={className ? `motion-scramble ${className}` : "motion-scramble"}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => {
        if (!node.current?.closest("a")?.contains(document.activeElement))
          stop();
      }}
      onFocus={() => setActive(true)}
      onBlur={() => {
        if (!node.current?.contains(document.activeElement)) stop();
      }}
    >
      <span className="motion-accessible-label">{text}</span>
      <span aria-hidden="true">{visualText}</span>
    </Tag>
  );
}

type SlotLabelProps = { text: string; className?: string };

/** A two-position text slot for pill controls. The accessible name stays singular. */
export function SlotLabel({ text, className }: SlotLabelProps) {
  return (
    <span className={className ? `motion-slot ${className}` : "motion-slot"}>
      <span className="motion-accessible-label">{text}</span>
      <span className="motion-slot__window" aria-hidden="true">
        <span className="motion-slot__track">
          <span className="motion-slot__line">{text}</span>
          <span className="motion-slot__line motion-slot__line--inverse">
            {text}
          </span>
        </span>
      </span>
    </span>
  );
}

type IntroLoaderProps = {
  ready: boolean;
  failed?: boolean;
  reducedMotion: boolean;
  onRevealStart?: () => void;
  onComplete: () => void;
};

const LOADER_MAX_WAIT_MS = 8_000;
const DRAW_MIN_MS = 1_500;

/** Original SVG construction reveal; waits for scene readiness, with an 8s escape hatch. */
/** Matches .intro-loader__stage: width min(94vmin, 690px), 240 units wide. */
function loaderFieldViewBox() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const mobile = width <= 600;
  const stage = Math.max(
    220,
    mobile
      ? Math.min(width * 1.08, height * 0.78)
      : Math.min(Math.min(width, height) * 0.94, 690),
  );
  const unit = stage / 240;
  const centreY = mobile ? height * 0.45 : height / 2;
  const x = 120 - width / 2 / unit;
  const y = 120 - centreY / unit;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${(width / unit).toFixed(2)} ${(height / unit).toFixed(2)}`;
}

function diagonal(degrees: number, offsets: number[]) {
  const radians = (degrees * Math.PI) / 180;
  const dx = Math.cos(radians) * 1400;
  const dy = -Math.sin(radians) * 1400;
  const nx = Math.sin(radians);
  const ny = Math.cos(radians);
  return offsets
    .map((offset) => {
      const cx = 120 + nx * offset;
      const cy = 120 + ny * offset;
      return `M${(cx - dx).toFixed(1)} ${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}`;
    })
    .join("");
}

export function IntroLoader({
  ready,
  failed = false,
  reducedMotion,
  onRevealStart,
  onComplete,
}: IntroLoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const callback = useRef(onComplete);
  const revealCallback = useRef(onRevealStart);
  const revealStarted = useRef(false);
  const readyRef = useRef(ready);
  const gateStartedAt = useRef(0);
  const [fieldViewBox, setFieldViewBox] = useState(loaderFieldViewBox);

  useEffect(() => {
    const resize = () => setFieldViewBox(loaderFieldViewBox());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    callback.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    revealCallback.current = onRevealStart;
  }, [onRevealStart]);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    if (completed.current) return;
    const element = root.current;
    if (!element) return;
    if (gateStartedAt.current === 0) gateStartedAt.current = performance.now();

    let drawingTimeline: gsap.core.Timeline | undefined;
    let timeline: gsap.core.Timeline | undefined;
    let timeout = 0;
    let deadline = 0;
    let cancelled = false;
    const beginReveal = () => {
      if (revealStarted.current) return;
      revealStarted.current = true;
      revealCallback.current?.();
    };
    const finish = () => {
      if (cancelled || completed.current) return;
      beginReveal();
      completed.current = true;
      window.clearTimeout(timeout);
      window.clearTimeout(deadline);
      drawingTimeline?.kill();
      timeline?.kill();
      gsap.set(element, { autoAlpha: 0, pointerEvents: "none" });
      callback.current();
    };

    if (reducedMotion || failed) {
      finish();
      return () => {
        cancelled = true;
        gsap.killTweensOf(element);
      };
    }

    const grid = element.querySelectorAll<SVGElement>(".intro-loader__draft");
    const sweeps = element.querySelectorAll<SVGPathElement>(".intro-loader__sweep");
    const field = element.querySelector<SVGSVGElement>(".intro-loader__field");
    const strokes = element.querySelectorAll<SVGPathElement>(
      ".intro-loader__r-stroke",
    );
    const letterFill = element.querySelector<SVGPathElement>(
      ".intro-loader__r-fill",
    );
    const frame = element.querySelector<SVGRectElement>(".intro-loader__frame");
    const slogan = element.querySelector<HTMLElement>(".intro-loader__slogan");

    // This bounds the entire intro, including its exit animation. Keeping the
    // original start time also bounds StrictMode's effect replay.
    deadline = window.setTimeout(
      finish,
      Math.max(
        0,
        LOADER_MAX_WAIT_MS - (performance.now() - gateStartedAt.current),
      ),
    );

    gsap.set(grid, { autoAlpha: 0 });
    const setStrokeProgress = (stroke: SVGGeometryElement) => {
      const matrix = stroke.getScreenCTM();
      const scale =
        getComputedStyle(stroke).vectorEffect === "non-scaling-stroke" && matrix
          ? Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c))
          : 1;
      const length = stroke.getTotalLength() * scale;
      gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length });
      return length;
    };
    setStrokeProgress(frame!);
    strokes.forEach(setStrokeProgress);
    sweeps.forEach((stroke, index) => {
      setStrokeProgress(stroke);
      gsap.set(stroke, {
        autoAlpha: 0,
        x: stroke.dataset.axis === "x" ? (index % 2 ? -700 : 700) : 0,
        y: stroke.dataset.axis === "y" ? (index % 2 ? -450 : 450) : 0,
      });
    });
    gsap.set(letterFill, { autoAlpha: 0 });
    gsap.set(element, { autoAlpha: 1, pointerEvents: "auto" });

    drawingTimeline = gsap.timeline();
    drawingTimeline
      .to(sweeps, {
        autoAlpha: 0.85,
        x: 0,
        y: 0,
        strokeDashoffset: 0,
        duration: 1.55,
        stagger: { each: 0.035, from: "center" },
        ease: "power2.inOut",
      }, 0)
      .to(
        grid,
        { autoAlpha: 0.42, duration: 0.55, stagger: 0.025, ease: "power1.out" },
        0,
      )
      .to(
        frame,
        { strokeDashoffset: 0, duration: 0.72, ease: "power1.inOut" },
        0.12,
      )
      .to(
        strokes,
        {
          strokeDashoffset: 0,
          duration: 0.78,
          stagger: 0.08,
          ease: "power1.inOut",
        },
        0.2,
      )
      .to(
        letterFill,
        { autoAlpha: 0.12, duration: 0.3, ease: "power1.out" },
        0.78,
      );

    timeline = gsap.timeline({ paused: true, onComplete: finish });
    timeline
      .to(slogan, { autoAlpha: 1, duration: 0.3, ease: "power1.out" }, 0)
      .to(field, { scale: 1.08, transformOrigin: "50% 50%", duration: 2.5, ease: "sine.inOut" }, 0)
      .to(sweeps, {
        strokeDashoffset: (_: number, stroke: SVGPathElement) => -stroke.getTotalLength(),
        autoAlpha: 0,
        duration: 1.05,
        stagger: { each: 0.015, from: "edges" },
        ease: "power2.inOut",
      }, 1.05)
      .to(
        strokes,
        {
          opacity: 0.52,
          duration: 0.55,
          yoyo: true,
          repeat: 1,
          stagger: 0.035,
          ease: "sine.inOut",
        },
        0.25,
      )
      .to(
        letterFill,
        {
          autoAlpha: 0.28,
          duration: 0.7,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
        },
        0.25,
      )
      .to(
        element,
        {
          autoAlpha: 0,
          duration: 0.8,
          ease: "power2.out",
          onStart: beginReveal,
        },
        1.8,
      );

    const startRevealWhenReady = () => {
      if (cancelled || completed.current) return;
      const elapsed = performance.now() - gateStartedAt.current;
      const gateReleased = readyRef.current;
      const drawFinished = elapsed >= DRAW_MIN_MS;
      if (gateReleased && drawFinished) {
        timeline?.play(0);
        return;
      }
      timeout = window.setTimeout(startRevealWhenReady, 40);
    };
    startRevealWhenReady();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearTimeout(deadline);
      drawingTimeline?.kill();
      timeline?.kill();
      gsap.killTweensOf([element, grid, sweeps, field, frame, strokes, letterFill, slogan]);
    };
  }, [failed, reducedMotion]);

  // `ready` is a gate only; the small poll above observes its latest value without
  // restarting the SVG timeline when scene readiness changes.
  return createPortal(
    <div
      ref={root}
      className="intro-loader"
      role="status"
      aria-label="Constructing the portfolio mark"
      aria-live="polite"
    >
      {/* The field shares the stage's 240-unit coordinate system, centred on
          the viewport, so every sweep passes through the R's own grid. */}
      <svg
        className="intro-loader__field"
        viewBox={fieldViewBox}
        fill="none"
        aria-hidden="true"
      >
        {[-40, 40, 80, 120, 160, 200, 280].map((y) => (
          <path key={`h${y}`} className="intro-loader__sweep" data-axis="x" d={`M-1400 ${y}H1640`} />
        ))}
        {[-120, 40, 80, 120, 160, 200, 360].map((x) => (
          <path key={`v${x}`} className="intro-loader__sweep" data-axis="y" d={`M${x} -900V1140`} />
        ))}
        {/* Parallel diagonals through the centre at ±30°. */}
        <path className="intro-loader__sweep" data-axis="x" d={diagonal(30, [0, 5, 10])} />
        <path className="intro-loader__sweep" data-axis="y" d={diagonal(-30, [0, 5])} />
        <path className="intro-loader__sweep" d="M34 120A86 86 0 1 1 206 120A86 86 0 1 1 34 120M2 120A118 118 0 1 1 238 120A118 118 0 1 1 2 120" />
        <path className="intro-loader__sweep" data-axis="x" d="M-1400 146H-20M-1400 150H-20M-1400 154H-20M260 86H1640M260 90H1640M260 94H1640" />
      </svg>
      <div className="intro-loader__stage" aria-hidden="true">
        <svg className="intro-loader__svg" viewBox="0 0 240 240" fill="none">
          <g
            className="intro-loader__draft"
            stroke="currentColor"
            strokeWidth="0.7"
          >
            <path d="M20 40H220M20 80H220M20 120H220M20 160H220M20 200H220" />
            <path d="M40 20V220M80 20V220M120 20V220M160 20V220M200 20V220" />
            <path d="M25 215L215 25M25 25L215 215" opacity=".34" />
            <circle cx="120" cy="120" r="86" strokeDasharray="2 5" />
            <path d="M120 12V34M120 206V228M12 120H34M206 120H228" />
          </g>
          <rect
            className="intro-loader__frame"
            x="39"
            y="39"
            width="162"
            height="162"
            rx="1"
          />
          <g transform="translate(120 120) scale(37 -37) translate(-0.15 0)">
            <path
              className="intro-loader__r-fill"
              fillRule="evenodd"
              d="M-1.42 -2.05V2.05H0.08C1.2 2.05 1.62 1.5 1.62 0.76C1.62 0.16 1.28 -0.27 0.72 -0.49L1.72 -2.05H0.58L-0.24 -0.73H-0.57V-2.05ZM-0.57 1.22V0.18H0.06C0.79 0.18 0.86 1.22 0.06 1.22Z"
            />
            <path
              className="intro-loader__r-stroke"
              vectorEffect="non-scaling-stroke"
              d="M-1.42 -2.05V2.05H0.08C1.2 2.05 1.62 1.5 1.62 0.76C1.62 0.16 1.28 -0.27 0.72 -0.49L1.72 -2.05H0.58L-0.24 -0.73H-0.57V-2.05ZM-0.57 1.22V0.18H0.06C0.79 0.18 0.86 1.22 0.06 1.22Z"
            />
          </g>
          <path
            className="intro-loader__draft intro-loader__dimension"
            d="M54 190H186M54 186V194M186 186V194M190 54V186M186 54H194M186 186H194"
          />
        </svg>
      </div>
      {/* Centred line under the mark, like the reference's mission sentence. */}
      <p className="intro-loader__tagline" aria-hidden="true">
        <ScrambleText text="Cut with feeling. Build with purpose." as="span" />
      </p>
      <div className="intro-loader__meta">
        <ScrambleText
          text="R / FORM IN MOTION"
          className="intro-loader__slogan"
          as="span"
        />
        <span className="intro-loader__caption" aria-hidden="true">
          DESIGN · CODE · MOTION
        </span>
      </div>
    </div>,
    document.body,
  );
}
