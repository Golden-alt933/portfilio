import {
  Component,
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { projects } from "./content";
import { initialSceneState, type SceneState } from "./SceneState";
import "./scene-host.css";

const HeroScene = lazy(() => import("./HeroScene"));

type SharedScene = {
  state: RefObject<SceneState>;
  lastWorkProgress: RefObject<number | null>;
  rememberWork: (
    progress: number,
    source: "scroll" | "native-panel" | "project-link" | "restore",
  ) => void;
  reducedMotion: boolean;
  systemReduced: boolean;
  motionOff: boolean;
  setMotionOff: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  ready: boolean;
  failed: boolean;
  onReady: (value: boolean) => void;
  onFailure: () => void;
  onSelect: (slug: string) => void;
};

const SceneContext = createContext<SharedScene | null>(null);

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function useSceneHost() {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error("Portfolio scene provider is missing.");
  return scene;
}

/** Keeps GPU resources alive across project routes, pausing them off the home page. */
export default function SceneHost({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === "/";
  const [activated, setActivated] = useState(active);
  const state = useRef(initialSceneState());
  // Navigation positioning may temporarily rewrite the live chapter state.
  // Keep the last carousel selection independently of that render state.
  const lastWorkProgress = useRef<number | null>(null);
  const workLocked = useRef(false);
  const diagnosticRoot = useRef<HTMLDivElement>(null);
  const workTrace = useRef<
    Array<{ event: string; progress: number; locked: boolean; scroll: number }>
  >([]);
  const rememberWork = useCallback(
    (
      progress: number,
      source: "scroll" | "native-panel" | "project-link" | "restore",
    ) => {
      const blocked = source === "scroll" && workLocked.current;
      if (!blocked) {
        lastWorkProgress.current = Math.min(1, Math.max(0, progress));
        if (source === "native-panel" || source === "project-link")
          workLocked.current = true;
        if (source === "restore") workLocked.current = false;
      }
      const previous = workTrace.current.at(-1);
      const event = blocked ? "blocked-scroll" : source;
      if (
        !previous ||
        previous.event !== event ||
        Math.abs(previous.progress - progress) > 0.08 ||
        (source !== "scroll" && !blocked)
      ) {
        workTrace.current.push({
          event,
          progress,
          locked: workLocked.current,
          scroll: window.scrollY,
        });
        workTrace.current = workTrace.current.slice(-12);
      }
      if (diagnosticRoot.current) {
        diagnosticRoot.current.dataset.savedWork = String(
          lastWorkProgress.current,
        );
        diagnosticRoot.current.dataset.selectionLock = String(
          workLocked.current,
        );
        diagnosticRoot.current.dataset.workTrace = JSON.stringify(
          workTrace.current,
        );
      }
    },
    [],
  );
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [motionOff, setMotionOff] = useState(false);
  const reducedMotion = systemReduced || motionOff;
  const setReducedMotion = useCallback(
    (value: boolean) => setMotionOff(value),
    [],
  );
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (active) setActivated(true);
  }, [active]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.portfolioMotion = reducedMotion
      ? "reduced"
      : "full";
    window.dispatchEvent(new Event("portfolio:motion-change"));
    return () => {
      delete document.documentElement.dataset.portfolioMotion;
      window.dispatchEvent(new Event("portfolio:motion-change"));
    };
  }, [reducedMotion]);
  const onReady = useCallback((value: boolean) => {
    setReady(value);
    if (value) setFailed(false);
  }, []);
  const onFailure = useCallback(() => {
    setReady(false);
    setFailed(true);
  }, []);
  const onSelect = useCallback(
    (slug: string) => {
      const index = projects.findIndex((project) => project.slug === slug);
      if (index >= 0)
        rememberWork(index / Math.max(1, projects.length - 1), "native-panel");
      navigate(`/work/${slug}`);
    },
    [navigate, rememberWork],
  );
  const shared = {
    state,
    lastWorkProgress,
    rememberWork,
    reducedMotion,
    systemReduced,
    motionOff,
    setMotionOff,
    setReducedMotion,
    ready,
    failed,
    onReady,
    onFailure,
    onSelect,
  };
  return (
    <SceneContext.Provider value={shared}>
      <div
        ref={diagnosticRoot}
        className="scene-host"
        data-active={active}
        data-saved-work={lastWorkProgress.current ?? "none"}
        data-selection-lock={String(workLocked.current)}
        data-route={location.pathname + location.hash}
        aria-hidden="true"
      >
        {activated && !reducedMotion && (
          <SceneBoundary onFailure={onFailure}>
            <Suspense fallback={null}>
              <HeroScene
                state={state}
                reducedMotion={reducedMotion}
                active={active}
                onReady={onReady}
                onFailure={onFailure}
                projects={projects}
                onSelect={onSelect}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      {children}
    </SceneContext.Provider>
  );
}
