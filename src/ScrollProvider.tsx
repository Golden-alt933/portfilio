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
  const location = useLocation();
  const navigationType = useNavigationType();
  const lenisRef = useRef<Lenis | null>(null);
  const currentLocation = useRef(location);
  const previousPath = useRef(location.pathname);
  const trackingKey = useRef(location.key);
  const pendingPositionRestore = useRef(false);
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
      const top =
        typeof target === "number"
          ? target
          : target.getBoundingClientRect().top + window.scrollY;
      if (reducedMotion || !lenisRef.current) {
        window.scrollTo({ top, behavior: "instant" });
      } else {
        lenisRef.current.scrollTo(top, {
          immediate: options.immediate,
          duration: options.duration ?? (options.immediate ? 0 : 1),
          force: options.force,
        });
      }
    },
    [reducedMotion],
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
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      anchors: false,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;
    const onScroll = () => {
      if (!pendingPositionRestore.current)
        positionByKey.current.set(trackingKey.current, lenis.scroll);
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
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
    if (locked) lenis.stop();
    const lockObserver = new MutationObserver(() => {
      const nextLocked = document.body.style.overflow === "hidden";
      if (nextLocked === locked) return;
      locked = nextLocked;
      if (locked) lenis.stop();
      else lenis.start();
    });
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    const resize = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", resize);
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("portfolio:scroll-to", onRouteScroll);
      lockObserver.disconnect();
      window.removeEventListener("resize", resize);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      if (lenisRef.current === lenis) lenisRef.current = null;
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
          const travel = Math.max(1, target.offsetHeight - window.innerHeight);
          scrollTo(
            target.getBoundingClientRect().top +
              window.scrollY +
              lastWorkProgress.current * travel,
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
