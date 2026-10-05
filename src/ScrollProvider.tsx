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
    let wheelGestureTimer = 0;
    let wheelGestureActive = false;
    let wheelGestureDirection = 0;
    let wheelGestureStart = 0;
    let wheelGestureStartIndex = 0;
    let wheelGestureStartedInEntry = false;
    let wheelGestureEnteringFromBelow = false;
    const resetWheel = () => {
      window.clearTimeout(wheelGestureTimer);
      wheelGestureTimer = 0;
      wheelGestureActive = false;
      wheelGestureDirection = 0;
      wheelGestureStartedInEntry = false;
      wheelGestureEnteringFromBelow = false;
    };
    resetWheelGesture.current = resetWheel;
    let lenis: Lenis | null = null;
    const virtualScroll = (data: {
      deltaX: number;
      deltaY: number;
      event: WheelEvent | TouchEvent;
    }) => {
      if (data.event.type !== "wheel" || window.innerWidth < 900) return true;
      if (
        data.event.ctrlKey ||
        Math.abs(data.deltaX) > Math.abs(data.deltaY)
      ) {
        resetWheel();
        return true;
      }
      if (document.body.style.overflow === "hidden") {
        resetWheel();
        return true;
      }
      const track = document.getElementById("work");
      if (!track || !lenis) return true;
      const sectionTop = track.getBoundingClientRect().top + window.scrollY;
      const sectionEnd = sectionTop + track.offsetHeight - window.innerHeight;
      const currentTarget = lenis.targetScroll;
      const currentScroll = lenis.scroll;
      const direction = Math.sign(data.deltaY);
      const enteringFromAbove =
        direction > 0 &&
        currentTarget < sectionTop &&
        currentTarget + data.deltaY >= sectionTop;
      const enteringFromBelow =
        direction < 0 &&
        currentTarget > sectionEnd &&
        currentTarget + data.deltaY <= sectionEnd;
      const inTrack =
        (currentTarget >= sectionTop && currentTarget <= sectionEnd) ||
        (currentScroll >= sectionTop && currentScroll <= sectionEnd) ||
        enteringFromAbove ||
        enteringFromBelow;
      if (!inTrack) {
        resetWheel();
        return true;
      }
      if (!direction) return true;
      const viewport = window.innerHeight;
      const firstStop = sectionTop + WORK_ENTRY_SCREENS * viewport;
      const lastStop = workLastStopOffset(
        sectionTop,
        viewport,
        projects.length,
      );
      const freshDirection =
        !wheelGestureActive || wheelGestureDirection !== direction;
      if (
        freshDirection &&
        ((direction < 0 && currentTarget <= firstStop + viewport * 0.1) ||
          (direction > 0 && currentTarget >= lastStop - viewport * 0.1))
      ) {
        resetWheel();
        return true;
      }
      if (!wheelGestureActive || wheelGestureDirection !== direction) {
        resetWheel();
        wheelGestureActive = true;
        wheelGestureDirection = direction;
        wheelGestureStart = currentTarget;
        wheelGestureStartedInEntry = currentTarget < firstStop;
        wheelGestureEnteringFromBelow = enteringFromBelow;
        const physical =
          (currentTarget - sectionTop) / viewport - WORK_ENTRY_SCREENS;
        wheelGestureStartIndex = Math.max(
          0,
          Math.min(
            projects.length - 1,
            currentTarget < firstStop || enteringFromBelow
              ? 0
              : Math.round(physical / WORK_CARD_STEP_SCREENS),
          ),
        );
        if (enteringFromBelow)
          wheelGestureStartIndex = projects.length - 1;
      }
      window.clearTimeout(wheelGestureTimer);
      wheelGestureTimer = window.setTimeout(() => {
        const latestTrack = document.getElementById("work");
        if (!latestTrack || !lenis || document.body.style.overflow === "hidden") {
          resetWheel();
          return;
        }
        const latestTop = latestTrack.getBoundingClientRect().top + window.scrollY;
        const latestOffset = lenis.targetScroll - latestTop;
        const latestLastStop = workLastStopOffset(
          latestTop,
          window.innerHeight,
          projects.length,
        );
        const latestIndex = Math.round(
          (latestOffset / window.innerHeight - WORK_ENTRY_SCREENS) /
            WORK_CARD_STEP_SCREENS,
        );
        if (
          lenis.targetScroll < latestTop ||
          lenis.targetScroll > latestTop + latestTrack.offsetHeight - window.innerHeight ||
          latestOffset > latestLastStop - latestTop + window.innerHeight * 0.25 ||
          Math.abs(latestIndex - wheelGestureStartIndex) > 1 ||
          (wheelGestureDirection < 0 && wheelGestureStartIndex === 0) ||
          (wheelGestureDirection > 0 && wheelGestureStartIndex === projects.length - 1)
        ) {
          resetWheel();
          return;
        }
        let targetIndex = wheelGestureStartIndex + wheelGestureDirection;
        if (wheelGestureEnteringFromBelow)
          targetIndex = projects.length - 1;
        else if (wheelGestureDirection > 0 && wheelGestureStartedInEntry)
          targetIndex = 0;
        targetIndex = Math.max(0, Math.min(projects.length - 1, targetIndex));
        resetWheel();
        lenis.scrollTo(
          workCardOffset(
            targetIndex,
            latestTop,
            window.innerHeight,
            projects.length,
          ),
          { duration: 0.68 },
        );
      }, 240);
      const limit = wheelGestureEnteringFromBelow && direction < 0
        ? lastStop
        : wheelGestureStartedInEntry && direction > 0
          ? firstStop
          : wheelGestureStart + direction * WORK_CARD_STEP_SCREENS * viewport;
      const remaining = limit - currentTarget;
      const amount = Math.abs(data.deltaY);
      if (remaining * direction <= 0.5) {
        data.event.preventDefault();
        return false;
      }
      if (amount > Math.abs(remaining)) {
        data.deltaY = direction * Math.abs(remaining);
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
