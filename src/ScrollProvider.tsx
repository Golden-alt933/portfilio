import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSceneHost } from "./SceneHost";
import { projects } from "./content";
import {
  WORK_CARD_STEP_SCREENS,
  WORK_ENTRY_SCREENS,
  workCardOffset,
  workLastStopOffset,
  workOffsetAtProgress,
} from "./scene/sequence";

gsap.registerPlugin(ScrollTrigger);

type ScrollApi = {
  scrollTo: (
    target: number | HTMLElement,
    options?: { immediate?: boolean; duration?: number; force?: boolean },
  ) => void;
};
const ScrollContext = createContext<ScrollApi>({ scrollTo: () => {} });

export function useSmoothScroll() {
  return useContext(ScrollContext);
}

/** One application-scoped Lenis instance, driven by GSAP's shared ticker. */
export default function ScrollProvider({ children }: { children: ReactNode }) {
  const { reducedMotion, lastWorkProgress } = useSceneHost();
  const reducedMotionRef = useRef(reducedMotion);
  useLayoutEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);
  const location = useLocation();
  const navigationType = useNavigationType();
  const lenisRef = useRef<Lenis | null>(null);
  const currentLocation = useRef(location);
  const previousPath = useRef(location.pathname);
  const trackingKey = useRef(location.key);
  const pendingPositionRestore = useRef(false);
  const resetWheelGesture = useRef<() => void>(() => {});
  const positionByKey = useRef(new Map<string, number>());
  const initialKey = useRef(location.key);
  useLayoutEffect(() => {
    if (currentLocation.current.key !== location.key) {
      previousPath.current = currentLocation.current.pathname;
      pendingPositionRestore.current = true;
    }
    currentLocation.current = location;
  }, [location.key]);

  const scrollTo = useCallback<ScrollApi["scrollTo"]>(
    (target, options = {}) => {
      resetWheelGesture.current();
      const top =
        typeof target === "number"
          ? target
          : target.getBoundingClientRect().top + window.scrollY;
      if (reducedMotionRef.current || !lenisRef.current) {
        window.scrollTo({ top, behavior: "instant" });
      } else {
        lenisRef.current.scrollTo(top, {
          immediate: options.immediate,
          duration: options.duration ?? (options.immediate ? 0 : 1),
          force: options.force,
        });
      }
    },
    [],
  );

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (reducedMotion) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      const saveNativePosition = () => {
        if (!pendingPositionRestore.current)
          positionByKey.current.set(trackingKey.current, window.scrollY);
      };
      window.addEventListener("scroll", saveNativePosition, { passive: true });
      return () => {
        window.removeEventListener("scroll", saveNativePosition);
        window.history.scrollRestoration = previousRestoration;
      };
    }
    // Free scrolling through the card track, with a soft snap to the nearest
    // card once the wheel settles. The previous one-card-per-gesture clamp
    // blocked continuous wheels and trackpad momentum until input paused.
    let snapTimer = 0;
    let snapping = false;
    const resetWheel = () => {
      window.clearTimeout(snapTimer);
      snapTimer = 0;
    };
    resetWheelGesture.current = resetWheel;
    let lenis: Lenis | null = null;
    const snapToNearestCard = () => {
      snapTimer = 0;
      if (!lenis || snapping || window.innerWidth < 900) return;
      if (document.body.style.overflow === "hidden") return;
      if (Math.abs(lenis.targetScroll - lenis.scroll) > 1.5) {
        snapTimer = window.setTimeout(snapToNearestCard, 120);
        return;
      }
      const track = document.getElementById("work");
      if (!track) return;
      const viewport = window.innerHeight;
      const sectionTop = track.getBoundingClientRect().top + window.scrollY;
      const firstStop = sectionTop + WORK_ENTRY_SCREENS * viewport;
      const lastStop = workLastStopOffset(sectionTop, viewport, projects.length);
      const current = lenis.scroll;
      if (current < firstStop - viewport * 0.5 || current > lastStop + viewport * 0.5)
        return;
      const index = Math.max(
        0,
        Math.min(
          projects.length - 1,
          Math.round(
            ((current - sectionTop) / viewport - WORK_ENTRY_SCREENS) /
              WORK_CARD_STEP_SCREENS,
          ),
        ),
      );
      const stop = workCardOffset(index, sectionTop, viewport, projects.length);
      const distance = Math.abs(stop - current);
      if (distance < 2 || distance > WORK_CARD_STEP_SCREENS * viewport * 0.45) return;
      snapping = true;
      lenis.scrollTo(stop, {
        duration: 0.55,
        onComplete: () => {
          snapping = false;
        },
      });
      window.setTimeout(() => (snapping = false), 900);
    };
    const virtualScroll = (data: {
      deltaX: number;
      deltaY: number;
      event: WheelEvent | TouchEvent;
    }) => {
      if (data.event.type === "wheel") {
        snapping = false;
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snapToNearestCard, 180);
      }
      return true;
    };
    const lenisInstance = new Lenis({
      autoRaf: false,
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      anchors: false,
      wheelMultiplier: 0.9,
      virtualScroll,
    });
    lenis = lenisInstance;
    lenisRef.current = lenisInstance;
    const onScroll = () => {
      if (!pendingPositionRestore.current)
        positionByKey.current.set(trackingKey.current, lenisInstance.scroll);
      ScrollTrigger.update();
    };
    lenisInstance.on("scroll", onScroll);
    const tick = (time: number) => lenisInstance.raf(time * 1000);
    gsap.ticker.add(tick);
    const onAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (
        event.target as Element | null
      )?.closest<HTMLAnchorElement>("a[href^='#']");
      const id = anchor?.getAttribute("href")?.slice(1);
      if (!id) return;
      let decodedId = id;
      try {
        decodedId = decodeURIComponent(id);
      } catch {
        return;
      }
      const target = document.getElementById(decodedId);
      if (!target || anchor?.target || anchor?.hasAttribute("download")) return;
      event.preventDefault();
      scrollTo(target);
    };
    document.addEventListener("click", onAnchorClick);
    const onRouteScroll = (event: Event) => {
      const custom = event as CustomEvent<{
        target?: HTMLElement;
        top?: number;
        immediate?: boolean;
      }>;
      if (!custom.detail) return;
      event.preventDefault();
      if (custom.detail.target || custom.detail.top !== undefined) {
        scrollTo(custom.detail.top ?? custom.detail.target!, {
          immediate: custom.detail.immediate ?? false,
        });
      }
    };
    window.addEventListener("portfolio:scroll-to", onRouteScroll);
    let locked = document.body.style.overflow === "hidden";
    if (locked) lenisInstance.stop();
    const lockObserver = new MutationObserver(() => {
      const nextLocked = document.body.style.overflow === "hidden";
      if (nextLocked === locked) return;
      locked = nextLocked;
      resetWheel();
      if (locked) lenisInstance.stop();
      else lenisInstance.start();
    });
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    const resize = () => {
      resetWheel();
      lenisInstance.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", resize);
    const resetOnNonWheelInput = () => resetWheel();
    window.addEventListener("touchstart", resetOnNonWheelInput, { passive: true });
    window.addEventListener("keydown", resetOnNonWheelInput);
    window.addEventListener("pointerdown", resetOnNonWheelInput, { passive: true });
    return () => {
      resetWheel();
      resetWheelGesture.current = () => {};
      gsap.ticker.remove(tick);
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("portfolio:scroll-to", onRouteScroll);
      lockObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("touchstart", resetOnNonWheelInput);
      window.removeEventListener("keydown", resetOnNonWheelInput);
      window.removeEventListener("pointerdown", resetOnNonWheelInput);
      lenisInstance.off("scroll", onScroll);
      lenisInstance.destroy();
      if (lenisRef.current === lenisInstance) lenisRef.current = null;
      window.history.scrollRestoration = previousRestoration;
    };
  }, [reducedMotion, scrollTo]);

  useLayoutEffect(() => {
    let frame = 0;
    let secondFrame = 0;
    const savedPosition =
      navigationType === "POP"
        ? positionByKey.current.get(location.key)
        : undefined;
    pendingPositionRestore.current = true;
    const locate = () => {
      // Menu cleanup restarts Lenis and resets its animation. Defer animated
      // navigation until unlock; immediate POP restoration is safe while locked
      // and must place the hero before the loader starts its GPU handoff.
      if (navigationType !== "POP" && document.body.style.overflow === "hidden") {
        secondFrame = requestAnimationFrame(locate);
        return;
      }
      // Route DOM has changed. Refresh the limit before restoring a long gallery
      // position, otherwise Lenis clamps it to the shorter project page.
      lenisRef.current?.resize();
      trackingKey.current = location.key;
      const complete = () => {
        pendingPositionRestore.current = false;
        positionByKey.current.set(location.key, window.scrollY);
        window.dispatchEvent(new Event("portfolio:position-restored"));
      };
      if (savedPosition !== undefined) {
        scrollTo(savedPosition, { immediate: true, force: true });
        complete();
        return;
      }
      if (location.pathname !== "/") {
        scrollTo(0, { immediate: true, force: true });
        complete();
        return;
      }
      if (location.hash) {
        let id: string;
        try {
          id = decodeURIComponent(location.hash.slice(1));
        } catch {
          complete();
          return;
        }
        const target = document.getElementById(id);
        if (
          target &&
          navigationType === "PUSH" &&
          previousPath.current.startsWith("/work/") &&
          id === "work" &&
          lastWorkProgress.current !== null
        ) {
          scrollTo(
            target.getBoundingClientRect().top +
              window.scrollY +
              workOffsetAtProgress(
                lastWorkProgress.current,
                window.innerHeight,
                projects.length,
              ),
            { immediate: true, force: true },
          );
        } else if (target)
          scrollTo(target, {
            immediate: navigationType === "POP",
            force: true,
          });
        complete();
      } else if (
        navigationType !== "POP" &&
        location.key !== initialKey.current
      ) {
        scrollTo(0, { immediate: true, force: true });
        complete();
      } else if (location.pathname === "/") {
        scrollTo(0, { immediate: true, force: true });
        complete();
      }
    };
    frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(locate);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
    };
  }, [
    location.pathname,
    location.hash,
    location.key,
    navigationType,
    scrollTo,
    lastWorkProgress,
  ]);

  const value = useMemo(() => ({ scrollTo }), [scrollTo]);
  return (
    <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>
  );
}
