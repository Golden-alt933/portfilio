import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useNavigationType } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Code2,
  Film,
  Mail,
  Play,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile, projects, services } from "./content";
import MaterialPanel from "./MaterialPanel";
import { ProjectVisual, ReelDialog } from "./Media";
import { CreateWordmark } from "./CreateWordmark";
import { useSceneHost } from "./SceneHost";
import { useSmoothScroll } from "./ScrollProvider";
import type { SceneChapter } from "./SceneState";
import { IntroLoader, SlotLabel, ScrambleText } from "./MotionUI";
import {
  WORK_ENTRY_SCREENS,
  WORK_EXIT_SCREENS,
  clamp01,
  smooth01,
  workCardOffset,
  workLastStopOffset,
  workProgressAtOffset,
  workTrackScreens,
} from "./scene/sequence";
import "./immersive.css";
import "./upgrade.css";

gsap.registerPlugin(ScrollTrigger);

const chapters: SceneChapter[] = [
  "hero",
  "works",
  "mission",
  "vision",
  "services",
  "contact",
];
const workProjects = projects;
const SCENE_REVEAL_DURATION_MS = 3000;

export default function ImmersiveHome() {
  const {
    state: sceneState,
    lastWorkProgress,
    rememberWork,
    ready: sceneReady,
    failed: sceneFailed,
    reducedMotion,
    systemReduced,
    motionOff,
    setMotionOff,
  } = useSceneHost();
  const { scrollTo } = useSmoothScroll();
  const navigationType = useNavigationType();
  const restoredWork = useRef(
    navigationType === "POP" ? lastWorkProgress.current : null,
  );
  const restorationPending = useRef(true);
  const storyRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const missionRef = useRef<HTMLElement>(null);
  const visionRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const skipIntro = sceneReady || reducedMotion || sceneFailed;
  const revealStartedAt = useRef<number | null>(
    skipIntro ? performance.now() - SCENE_REVEAL_DURATION_MS : null,
  );
  const highestSceneReveal = useRef(skipIntro ? 1 : 0);
  const [loaderDone, setLoaderDone] = useState(skipIntro);
  const [activeWork, setActiveWork] = useState(() =>
    Math.round(
      (restoredWork.current ?? 0) * Math.max(0, workProjects.length - 1),
    ),
  );
  const activeWorkRef = useRef(activeWork);
  const [reelOpen, setReelOpen] = useState(false);
  const serviceProjects = useMemo(
    () =>
      services.map(
        (service) =>
          projects.find((project) => project.slug === service.project) ??
          projects[0],
      ),
    [],
  );
  const ready = reducedMotion || sceneReady;
  const onLoaderComplete = useCallback(() => {
    setLoaderDone(true);
  }, []);
  const onRevealStart = useCallback(() => {
    revealStartedAt.current = performance.now();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const initialProgress = skipIntro ? 1 : 0;
    root.style.setProperty(
      "--portfolio-hero-r-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-create-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-meta-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-kicker-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-copy-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-action-reveal",
      String(initialProgress),
    );
    root.style.setProperty(
      "--portfolio-hero-scroll-reveal",
      String(initialProgress),
    );
    document.body.dataset.introProgress = initialProgress.toFixed(3);
    document.body.dataset.introStage =
      initialProgress >= 1 ? "settled" : "revealing";
    return () => {
      root.style.removeProperty("--portfolio-hero-r-reveal");
      root.style.removeProperty("--portfolio-hero-create-reveal");
      root.style.removeProperty("--portfolio-hero-meta-reveal");
      root.style.removeProperty("--portfolio-hero-kicker-reveal");
      root.style.removeProperty("--portfolio-hero-copy-reveal");
      root.style.removeProperty("--portfolio-hero-action-reveal");
      root.style.removeProperty("--portfolio-hero-scroll-reveal");
      delete document.body.dataset.introProgress;
      delete document.body.dataset.introStage;
    };
  }, []);

  useEffect(() => {
    if (loaderDone || reducedMotion) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [loaderDone, reducedMotion]);

  useEffect(() => {
    const story = storyRef.current;
    const sections = [
      heroRef.current,
      worksRef.current,
      missionRef.current,
      visionRef.current,
      servicesRef.current,
      contactRef.current,
    ];
    if (!story || sections.some((section) => !section)) return;
    let metrics = sections.map((element) => {
      const rect = element!.getBoundingClientRect();
      return {
        start: rect.top + window.scrollY,
        end: rect.bottom + window.scrollY,
      };
    });
    let lastScroll = window.scrollY;
    let lastTime = performance.now();
    let velocity = 0;
    let paletteTimeline: gsap.core.Timeline | undefined;
    const clamp = clamp01;
    const smooth = smooth01;
    const measure = () => {
      metrics = sections.map((element) => {
        const rect = element!.getBoundingClientRect();
        return {
          start: rect.top + window.scrollY,
          end: rect.bottom + window.scrollY,
        };
      });
    };
    const updateState = (scroll = window.scrollY, time = performance.now()) => {
      let index = metrics.findIndex((metric, i) =>
        i === metrics.length - 1
          ? scroll <= metric.end
          : scroll < metrics[i + 1].start,
      );
      if (index < 0) index = metrics.length - 1;
      const metric = metrics[index];
      const progress = clamp(
        (scroll - metric.start) / Math.max(1, metric.end - metric.start),
      );
      const nextVelocity =
        ((scroll - lastScroll) / Math.max(1, time - lastTime)) * 16;
      velocity = velocity * 0.72 + nextVelocity * 0.28;
      lastScroll = scroll;
      lastTime = time;
      const chapter = chapters[index];
      const workMetric = metrics[1];
      const vh = window.innerHeight;
      const workOffset = scroll - workMetric.start;
      const workProgress = clamp(
        workProgressAtOffset(workOffset, vh, workProjects.length),
      );
      if (
        !restorationPending.current &&
        scroll >= workMetric.start &&
        scroll <= workMetric.end
      ) {
        rememberWork(workProgress, "scroll");
        const nextWork = Math.min(
          workProjects.length - 1,
          Math.round(workProgress * (workProjects.length - 1)),
        );
        if (activeWorkRef.current !== nextWork) {
          activeWorkRef.current = nextWork;
          setActiveWork(nextWork);
        }
      }
      const workEntry = smooth(
        (workOffset - vh * WORK_ENTRY_SCREENS * 0.25) /
          (vh * WORK_ENTRY_SCREENS * 0.75),
      );
      const lastWorkStop = workLastStopOffset(
        workMetric.start,
        vh,
        workProjects.length,
      );
      const workExit = smooth(
        (scroll - lastWorkStop) / (vh * WORK_EXIT_SCREENS),
      );
      const workVisibility = clamp(workEntry * (1 - workExit));
      const paleFlatten = smooth(
        (scroll - (metrics[2].start - vh * 0.8)) / (vh * 0.8),
      );
      const lightEnter = paleFlatten;
      // Services only takes over at the very bottom of the rainbow dive.
      const lightExit =
        1 - smooth((scroll - (metrics[4].start - vh * 0.4)) / (vh * 0.18));
      const lightMix = clamp(lightEnter * lightExit);
      const servicesMix =
        smooth((scroll - (metrics[4].start - vh * 0.2)) / (vh * 0.2)) *
        (1 - smooth((scroll - (metrics[5].start - vh * 0.8)) / (vh * 0.8)));
      const contactMix = smooth(
        (scroll - (metrics[5].start - vh * 0.8)) / (vh * 0.8),
      );
      const portalTravel = smooth(
        (scroll - metrics[3].start) /
          Math.max(vh, metrics[4].start - metrics[3].start),
      );
      const portalReveal = smooth(
        (scroll - (metrics[3].start + vh * 0.58)) /
          Math.max(vh * 0.12, metrics[4].start - metrics[3].start - vh * 0.58),
      );
      const portalProgress = portalTravel;
      // WORKS title: a bell that peaks just as the hero copy clears and
      // before the first card arrives.
      // WORKS window: it appears near the top of the wall, travels down it and
      // fades, peaking just as the hero copy clears.
      const worksTravel = clamp(
        (scroll - (workMetric.start - vh * 0.7)) / (vh * 1.7),
      );
      const worksTitle = reducedMotion
        ? 0
        : Math.pow(Math.sin(Math.PI * worksTravel), 1.2);
      const servicesProgress = clamp(
        (scroll - metrics[4].start) /
          Math.max(1, metrics[4].end - metrics[4].start - vh),
      );
      // Logo turn and service handoff, timed to the mission/vision chapters:
      // a slight tilt while vision rises into view, the full turn across the
      // scroll room after vision, the screen reveal, then the services sheet.
      const visionRotate = smooth(
        (scroll - (metrics[3].start - vh * 0.6)) / (vh * 0.75),
      );
      const serviceRotate = smooth(
        (scroll - (metrics[4].start - vh * 1.55)) / (vh * 1.05),
      );
      const serviceScreenIn = clamp(
        (scroll - (metrics[4].start - vh * 1.0)) / (vh * 0.85),
      );
      const serviceListIn = clamp(
        (scroll - (metrics[4].start - vh * 0.35)) / (vh * 0.75),
      );
      // Exit room between services and the finale (about 2.5 screens).
      const serviceExit = clamp(
        (scroll - metrics[4].end) / Math.max(1, metrics[5].start - metrics[4].end),
      );
      const finaleProgress = smooth(
        (scroll - metrics[5].start) /
          Math.max(1, metrics[5].end - metrics[5].start - vh),
      );
      const timedReveal =
        revealStartedAt.current === null
          ? 0
          : clamp((time - revealStartedAt.current) / SCENE_REVEAL_DURATION_MS);
      const reveal = Math.max(
        highestSceneReveal.current,
        reducedMotion || sceneFailed ? 1 : timedReveal,
      );
      highestSceneReveal.current = reveal;
      const introReveal = reveal;
      const introStage = (start: number, end: number) =>
        smooth((introReveal - start) / (end - start));
      sceneState.current = {
        chapter,
        chapterProgress: progress,
        workProgress,
        scrollVelocity: velocity,
        reveal,
        workVisibility,
        lightMix,
        servicesMix: clamp(servicesMix),
        contactMix,
        portalProgress,
        heroExit: smooth((scroll - metrics[0].start) / Math.max(vh, metrics[0].end - metrics[0].start)),
        workEntry,
        workExit,
        paleFlatten,
        portalTravel,
        portalReveal,
        workMediaProgress:
          activeWorkRef.current / Math.max(1, workProjects.length - 1),
        finaleProgress,
        worksTitle,
        worksTravel,
        servicesProgress,
        visionRotate,
        serviceRotate,
        serviceScreenIn,
        serviceListIn,
        serviceExit,
      };
      story.dataset.workVisibility = workVisibility.toFixed(3);
      story.dataset.lightMix = lightMix.toFixed(3);
      story.dataset.servicesMix = clamp(servicesMix).toFixed(3);
      story.dataset.contactMix = contactMix.toFixed(3);
      story.dataset.portalProgress = portalProgress.toFixed(3);
      story.dataset.heroExit = sceneState.current.heroExit.toFixed(3);
      story.dataset.workEntry = workEntry.toFixed(3);
      story.dataset.workExit = workExit.toFixed(3);
      story.dataset.paleFlatten = paleFlatten.toFixed(3);
      story.dataset.portalTravel = portalTravel.toFixed(3);
      story.dataset.portalReveal = portalReveal.toFixed(3);
      story.dataset.workMediaProgress = sceneState.current.workMediaProgress.toFixed(3);
      story.dataset.finaleProgress = finaleProgress.toFixed(3);
      story.dataset.workProgress = workProgress.toFixed(3);
      document.body.dataset.introProgress = introReveal.toFixed(3);
      document.body.dataset.introStage =
        introReveal >= 1 ? "settled" : "revealing";
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty(
        "--portfolio-hero-r-reveal",
        String(introStage(0.08, 0.45)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-create-reveal",
        String(introStage(0.72, 0.95)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-meta-reveal",
        String(introStage(0.85, 1)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-kicker-reveal",
        String(introStage(0.85, 0.94)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-copy-reveal",
        String(introStage(0.88, 0.98)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-action-reveal",
        String(introStage(0.92, 1)),
      );
      rootStyle.setProperty(
        "--portfolio-hero-scroll-reveal",
        String(introStage(0.95, 1)),
      );
      sections.forEach((section, i) =>
        section!.style.setProperty(
          "--chapter-progress",
          String(
            reducedMotion
              ? 1
              : clamp(
                  (scroll - metrics[i].start + vh * 0.8) /
                    Math.max(1, vh * 0.8),
                ),
          ),
        ),
      );
      story.style.setProperty(
        "--work-visibility",
        String(reducedMotion ? 1 : workVisibility),
      );
      story.style.setProperty(
        "--scene-light-mix",
        String(reducedMotion ? 0 : lightMix),
      );
      story.style.setProperty(
        "--scene-services-mix",
        String(reducedMotion ? 0 : servicesMix),
      );
      story.style.setProperty(
        "--scene-contact-mix",
        String(reducedMotion ? 0 : contactMix),
      );
      story.style.setProperty("--hero-exit", String(sceneState.current.heroExit));
      story.style.setProperty("--work-entry", String(workEntry));
      story.style.setProperty("--work-exit", String(workExit));
      story.style.setProperty("--pale-flatten", String(paleFlatten));
      story.style.setProperty("--portal-travel", String(portalTravel));
      story.style.setProperty("--portal-reveal", String(portalReveal));
      story.style.setProperty(
        "--work-media-progress",
        String(sceneState.current.workMediaProgress),
      );
      story.style.setProperty("--finale-progress", String(finaleProgress));
      story.style.setProperty("--works-title", String(worksTitle));
      // Each service chapter holds fully visible across most of its third and
      // crossfades at the boundaries; the first and last hold at the ends.
      const servicePosition = servicesProgress * services.length;
      services.forEach((_, i) => {
        const offset = servicePosition - (i + 0.5);
        const held =
          (i === 0 && offset < 0) || (i === services.length - 1 && offset > 0)
            ? 0
            : Math.abs(offset);
        // Copy holds fully across most of each chapter; short crossfades.
        const visibility = reducedMotion
          ? 1
          : smooth(1 - (held - 0.4) / 0.1);
        story.style.setProperty(`--service-${i}`, visibility.toFixed(3));
        story.style.setProperty(
          `--service-${i}-offset`,
          (reducedMotion ? 0 : Math.max(-1, Math.min(1, offset))).toFixed(3),
        );
      });
      story.style.setProperty(
        "--service-progress",
        servicesProgress.toFixed(3),
      );
      // Copy fades while the last service screen wipes out to full frame.
      story.style.setProperty("--service-exit", serviceExit.toFixed(3));
      story.style.setProperty(
        "--service-end",
        (reducedMotion ? 0 : smooth((servicesProgress - 0.86) / 0.08)).toFixed(3),
      );
      document.body.dataset.sceneChapter = chapter;
      document.body.style.setProperty("--scene-light-mix", String(lightMix));
      paletteTimeline?.progress(lightMix);
    };
    const refresh = () => {
      measure();
      ScrollTrigger.refresh();
      updateState();
    };
    const trigger = ScrollTrigger.create({
      trigger: story,
      start: "top top",
      end: "bottom bottom",
    });
    const stateTick = () => updateState(window.scrollY, performance.now());
    // The page colour lives on <html>, which paints beneath the scene canvas.
    const previousBodyBackground = document.documentElement.style.backgroundColor;
    gsap.ticker.add(stateTick);
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(story);
    if (!reducedMotion) {
      // One palette timeline scrubs the same measured channel as the renderer.
      // Separate entry/exit tweens on body would compete during reverse travel.
      paletteTimeline = gsap
        .timeline({ paused: true })
        .fromTo(
          document.documentElement,
          { backgroundColor: "#080909" },
          { backgroundColor: "#D7DBDC", duration: 1, ease: "none" },
        );
    }
    const chapterContext = gsap.context(() => {
      if (reducedMotion) return;
      [
        gsap
          .timeline({
            scrollTrigger: {
              trigger: missionRef.current,
              start: "top 80%",
              end: "center 45%",
              scrub: 0.7,
            },
          })
          .fromTo(
            missionRef.current!.querySelectorAll(
              ":scope > .immersive-statement > .immersive-section-kicker, :scope > .immersive-statement > h2, :scope > .immersive-statement > .immersive-statement-copy > *, :scope > .immersive-statement > .immersive-light-caption, :scope > .immersive-statement > .immersive-disciplines",
            ),
            { y: 34, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.08, ease: "none" },
          ),
        gsap
          .timeline({
            scrollTrigger: {
              trigger: visionRef.current,
              start: "top 80%",
              end: "center 45%",
              scrub: 0.7,
            },
          })
          .fromTo(
            visionRef.current!.querySelectorAll(
              ":scope > .immersive-statement > .immersive-section-kicker, :scope > .immersive-statement > h2, :scope > .immersive-statement > .immersive-statement-copy > *, :scope > .immersive-statement > .immersive-light-caption, :scope > .immersive-statement > .immersive-disciplines",
            ),
            { y: 34, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.08, ease: "none" },
          ),
        gsap
          .timeline({
            scrollTrigger: {
              trigger: contactRef.current,
              start: "top 80%",
              end: "center 45%",
              scrub: 0.7,
            },
          })
          .fromTo(
            contactRef.current!.querySelectorAll(".immersive-contact-copy > *"),
            { y: 30, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.08, ease: "none" },
          ),
      ];
    }, story);
    const restored = () => {
      updateState(window.scrollY);
      restorationPending.current = false;
      const restoredProgress = sceneState.current.workProgress;
      const restoredIndex = Math.min(
        workProjects.length - 1,
        Math.round(restoredProgress * (workProjects.length - 1)),
      );
      activeWorkRef.current = restoredIndex;
      setActiveWork(restoredIndex);
      rememberWork(restoredProgress, "restore");
    };
    window.addEventListener("portfolio:position-restored", restored);
    refresh();
    return () => {
      window.removeEventListener("portfolio:position-restored", restored);
      gsap.ticker.remove(stateTick);
      trigger.kill();
      paletteTimeline?.kill();
      chapterContext.revert();
      resizeObserver.disconnect();
      delete document.body.dataset.sceneChapter;
      document.body.style.removeProperty("--scene-light-mix");
      document.documentElement.style.backgroundColor = previousBodyBackground;
    };
  }, [reducedMotion, sceneFailed, rememberWork, sceneState]);

  const nudgeWork = (step: number) => {
    const target = Math.max(
      0,
      Math.min(workProjects.length - 1, activeWork + step),
    );
    const track = worksRef.current;
    if (track) {
      const sectionTop = track.getBoundingClientRect().top + window.scrollY;
      const destination = workCardOffset(
        target,
        sectionTop,
        window.innerHeight,
        workProjects.length,
      );
      scrollTo(destination, { duration: 0.8 });
    }
  };

  return (
    <main
      className={`immersive-home${reducedMotion ? " is-static" : ""}${sceneReady ? " scene-ready" : ""}`}
      ref={storyRef}
      data-navigation-type={navigationType}
      data-resume-progress={restoredWork.current ?? "none"}
      data-navigation-key="home"
    >
      {!loaderDone && (
        <IntroLoader
          ready={ready}
          reducedMotion={reducedMotion}
          failed={sceneFailed}
          onRevealStart={onRevealStart}
          onComplete={onLoaderComplete}
        />
      )}

      <div className="immersive-fixed-grain" aria-hidden="true" />
      <div className="immersive-wordmark" aria-hidden="true">
        <span>CREATE</span>
        <b>R</b>
      </div>
      <button
        className="immersive-motion-toggle"
        onClick={() => setMotionOff(!motionOff)}
        disabled={systemReduced}
        aria-pressed={reducedMotion}
        aria-label={
          systemReduced
            ? "Motion reduced by your system settings"
            : motionOff
              ? "Enable motion effects"
              : "Reduce motion effects"
        }
      >
        {systemReduced
          ? "MOTION REDUCED"
          : motionOff
            ? "ENABLE MOTION"
            : "REDUCE MOTION"}
      </button>

      <section
        className="immersive-screen immersive-hero"
        id="top"
        ref={heroRef}
        aria-labelledby="immersive-title"
      >
        <div className="immersive-index immersive-mono">
          <SlotLabel text="CREATIVE PRACTICE / 2026" />
          <span>VIDEO × CODE</span>
        </div>
        <h1 id="immersive-title" className="immersive-visually-hidden">
          R — video editing and creative development
        </h1>
        <div className="immersive-hero-note">
          <span className="immersive-mono">TWO DISCIPLINES. ONE MIND.</span>
          <p>
            I shape stories in the edit.
            <br />I make ideas work in code.
          </p>
          {profile.showreelUrl ? (
            <button
              className="immersive-text-link"
              onClick={() => setReelOpen(true)}
            >
              <Play size={13} fill="currentColor" /> PLAY SHOWREEL
            </button>
          ) : (
            <a className="immersive-text-link" href="#work">
              <Play size={13} fill="currentColor" /> EXPLORE THE WORK
            </a>
          )}
        </div>
        <a className="immersive-scroll-hint immersive-mono" href="#work">
          <span>SCROLL TO ENTER</span>
          <ArrowDown size={15} />
        </a>
      </section>
      {!reducedMotion && sceneReady && <MaterialPanel />}

      <section
        className="immersive-works-track"
        id="work"
        ref={worksRef}
        style={{ "--work-track-screens": workTrackScreens(workProjects.length) } as CSSProperties}
        aria-label="Selected work"
      >
        <div className="immersive-sticky immersive-work-scene">
          <div className="immersive-index immersive-mono">
            <span>
              01—{String(workProjects.length).padStart(2, "0")} / SELECTED
              WORKS
            </span>
            <Link to="/works" className="immersive-all-works">
              ALL WORKS <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="immersive-works-title" aria-hidden="true">
            WORKS
          </p>
          <div
            className="immersive-work-visual"
            key={workProjects[activeWork]?.slug}
          >
            <ProjectVisual project={workProjects[activeWork]} large />
            <span className="immersive-media-caption immersive-mono">
              {workProjects[activeWork]?.sample
                ? "CONCEPT PREVIEW"
                : workProjects[activeWork]?.format}
            </span>
          </div>
          <div className="immersive-work-footer">
            <div
              className="immersive-work-copy"
              key={`copy-${workProjects[activeWork]?.slug}`}
            >
              <span className="immersive-work-meta">
                <time className="immersive-mono">
                  {workProjects[activeWork]?.year ?? "2026"}
                </time>
                <mark>
                  {workProjects[activeWork]?.highlight ??
                    (workProjects[activeWork]?.sample
                      ? "Concept slot: swap in a real project"
                      : workProjects[activeWork]?.format)}
                </mark>
              </span>
              <span className="immersive-work-number immersive-mono">
                {workProjects[activeWork]?.number} /{" "}
                {workProjects[activeWork]?.category === "video"
                  ? "VIDEO EDITING"
                  : "CREATIVE DEVELOPMENT"}
                {workProjects[activeWork]?.sample ? " / CONCEPT" : ""}
              </span>
              <Link
                to={`/work/${workProjects[activeWork]?.slug}`}
                className="immersive-work-title"
                onClick={() =>
                  rememberWork(
                    activeWork / Math.max(1, workProjects.length - 1),
                    "project-link",
                  )
                }
              >
                <ScrambleText
                  text={workProjects[activeWork]?.title ?? "Selected work"}
                  as="span"
                />
              </Link>
              <p>{workProjects[activeWork]?.tagline}</p>
              <div className="immersive-tags">
                {workProjects[activeWork]?.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="immersive-work-controls">
              <span className="immersive-mono">
                {String(activeWork + 1).padStart(2, "0")}{" "}
                <i>/ {String(workProjects.length).padStart(2, "0")}</i>
              </span>
              <button
                onClick={() => nudgeWork(-1)}
                aria-label="Previous project"
                disabled={activeWork === 0}
              >
                <ArrowLeft />
              </button>
              <button
                onClick={() => nudgeWork(1)}
                aria-label="Next project"
                disabled={activeWork === workProjects.length - 1}
              >
                <ArrowRight />
              </button>
            </div>
          </div>
          <div className="immersive-progress" aria-hidden="true">
            <span
              style={{
                transform: `scaleX(${(activeWork + 1) / workProjects.length})`,
              }}
            />
          </div>
        </div>
        <div className="immersive-work-visually-hidden">
          {workProjects.map((project) => (
            <article key={project.slug}>
              <h2>{project.title}</h2>
              <p>{project.tagline}</p>
              <p>
                {project.category === "video"
                  ? "Video editing"
                  : "Creative development"}
                : {project.tags.join(", ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="immersive-screen immersive-light immersive-mission"
        id="about"
        ref={missionRef}
        aria-labelledby="mission-title"
      >
        <div className="immersive-index immersive-mono">
          <span>02 / MISSION</span>
          <span>THE WHY BEHIND THE WORK</span>
        </div>
        <div className="immersive-statement">
          <span className="immersive-section-kicker immersive-mono">
            MAKE IT MEAN SOMETHING
          </span>
          <h2 id="mission-title" className="statement-heading">
            <span className="immersive-visually-hidden">MISSION</span>
            <svg viewBox="0 0 470 100" aria-hidden="true" focusable="false">
              <text x="2" y="86">MISSION</text>
            </svg>
          </h2>
          <div className="immersive-statement-copy">
            <h3>
              <span>Feeling is the</span>
              <span>first edit.</span>
            </h3>
            <div className="immersive-chapter-markers">
              <span>OBSERVE</span>
              <i />
              <span>SHAPE</span>
              <i />
              <span>RELEASE</span>
            </div>
          </div>
          <p className="immersive-light-caption">
            Every cut is a choice. Every interaction is a cue. I bring both
            disciplines together to make work that connects before it explains.
          </p>
        </div>
        <span className="immersive-side-note immersive-mono">
          01—03 / INTENTION
        </span>
      </section>

      <section
        className="immersive-screen immersive-light immersive-vision"
        id="vision"
        ref={visionRef}
        aria-labelledby="vision-title"
      >
        <div className="immersive-index immersive-mono">
          <span>03 / VISION</span>
          <span>FRAME BY FRAME. LINE BY LINE.</span>
        </div>
        <div className="immersive-statement">
          <span className="immersive-section-kicker immersive-mono">
            TWO CRAFTS, SHARED CURIOSITY
          </span>
          <h2 id="vision-title" className="statement-heading">
            <span className="immersive-visually-hidden">VISION</span>
            <svg viewBox="0 0 470 100" aria-hidden="true" focusable="false">
              <text x="2" y="86">VISION</text>
            </svg>
          </h2>
          <div className="immersive-statement-copy">
            <h3>
              <span>A good idea</span>
              <span>
                should <em>move.</em>
              </span>
            </h3>
            <div className="immersive-chapter-markers">
              <span>FRAME</span>
              <i />
              <span>FORM</span>
              <i />
              <span>FUNCTION</span>
            </div>
          </div>
          <p className="immersive-light-caption">
            Sometimes through a sequence of images. Sometimes through a
            thoughtful interface. The craft is finding the form that lets it
            land.
          </p>
          <div className="immersive-disciplines">
            <span>
              <Film size={17} /> VIDEO EDITING
            </span>
            <span>
              <Code2 size={17} /> CREATIVE DEVELOPMENT
            </span>
          </div>
        </div>
        <span className="immersive-side-note immersive-mono">
          02—03 / DIRECTION
        </span>
      </section>

      {/* Extra scroll room for the turn into the rainbow side of the R. */}
      <div className="immersive-portal-spacer" aria-hidden="true" />

      <section
        className="immersive-services"
        id="services"
        ref={servicesRef}
        style={{ "--service-count": services.length } as CSSProperties}
        aria-labelledby="services-title"
      >
        <div className="immersive-services-stage">
          <div className="immersive-index immersive-mono">
            <span>04 / SERVICES</span>
            <span>FROM FIRST THOUGHT TO FINISHED THING</span>
          </div>
          <div className="service-frame" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <h2 id="services-title" className="immersive-services-heading">
            Make it <i>real.</i>
          </h2>
          {services.map((service, index) => (
            <article
              className="service-chapter"
              key={service.title}
              style={
                {
                  "--service-visibility": `var(--service-${index}, ${index === 0 ? 1 : 0})`,
                  "--service-offset": `var(--service-${index}-offset, 0)`,
                } as CSSProperties
              }
            >
              <div className="service-media">
                <ProjectVisual project={serviceProjects[index]} large />
              </div>
              <div className="service-copy">
                <span className="immersive-mono">{service.label}</span>
                <h3>
                  {index === 0 ? (
                    <Film size={22} />
                  ) : index === 1 ? (
                    <Code2 size={22} />
                  ) : (
                    <ArrowUpRight size={22} />
                  )}
                  {service.title}
                </h3>
                <p>{service.body}</p>
                <ul>
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link
                  to={`/work/${serviceProjects[index].slug}`}
                  className="immersive-text-link"
                >
                  SEE A RELATED PROJECT <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Scroll room for the screen to shrink back into the R. */}
      <div className="immersive-exit-spacer" aria-hidden="true" />

      <section
        className="immersive-screen immersive-contact"
        id="contact"
        ref={contactRef}
        aria-labelledby="contact-title"
      >
        <div className="immersive-contact-stage">
          <div className="immersive-index immersive-mono">
            <span>05 / YOUR MOVE</span>
            <span>THE NEXT FRAME IS OPEN</span>
          </div>
          <CreateWordmark className="closing-create" guides />
          <div className="immersive-contact-copy">
            <span className="immersive-section-kicker immersive-mono">
              LET'S MAKE SOMETHING MATTER
            </span>
            <h2 id="contact-title">
              Have a good
              <br />
              <i>feeling?</i>
            </h2>
            {profile.email ? (
              <a
                href={`mailto:${profile.email}`}
                className="immersive-contact-link"
              >
                <Mail size={18} /> {profile.email}
                <ArrowRight size={17} />
              </a>
            ) : (
              <p className="immersive-mono">OPEN FOR THE RIGHT PROJECT</p>
            )}
          </div>
          <footer className="immersive-finale-footer">
            <nav aria-label="Footer">
              <div>
                <a href="#top">Top</a>
                <a href="#work">Works</a>
                <a href="#about">About</a>
              </div>
              <div>
                <a href="#services">Services</a>
                <Link to="/works">All works</Link>
                <a href="#contact">Contact</a>
              </div>
              {(profile.instagramUrl || profile.githubUrl) && (
                <div className="immersive-finale-links immersive-mono">
                  {profile.instagramUrl && (
                    <a href={profile.instagramUrl} target="_blank" rel="noreferrer">
                      INSTAGRAM
                    </a>
                  )}
                  {profile.githubUrl && (
                    <a href={profile.githubUrl} target="_blank" rel="noreferrer">
                      GITHUB
                    </a>
                  )}
                </div>
              )}
            </nav>
            <div className="immersive-finale-legal">
              <a href="#top" className="immersive-mono">
                BACK TO TOP <ArrowUpRight size={13} />
              </a>
              <strong>
                © {new Date().getFullYear()} {profile.name} Studio
              </strong>
            </div>
          </footer>
        </div>
      </section>

      {reelOpen && (
        <ReelDialog
          url={profile.showreelUrl}
          poster={profile.showreelPoster}
          onClose={() => setReelOpen(false)}
        />
      )}
    </main>
  );
}
