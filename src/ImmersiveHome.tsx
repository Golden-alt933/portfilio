import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigationType } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Code2,
  Film,
  Mail,
  Play,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile, projects } from "./content";
import type { ProjectCategory } from "./content";
import { ProjectVisual, ReelDialog } from "./Media";
import { useSceneHost } from "./SceneHost";
import { useSmoothScroll } from "./ScrollProvider";
import type { SceneChapter } from "./SceneState";
import { IntroLoader, SlotLabel, ScrambleText } from "./MotionUI";
import "./immersive.css";

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
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [reelOpen, setReelOpen] = useState(false);
  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) => filter === "all" || project.category === filter,
      ),
    [filter],
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
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const smooth = (value: number) => {
      const t = clamp(value);
      return t * t * (3 - 2 * t);
    };
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
      const workTravel = Math.max(
        1,
        workMetric.end - workMetric.start - window.innerHeight,
      );
      const workProgress = clamp((scroll - workMetric.start) / workTravel);
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
      const vh = window.innerHeight;
      const lastWorkStop = workMetric.start + workTravel;
      const workVisibility =
        smooth((scroll - (workMetric.start - vh * 0.55)) / (vh * 0.55)) *
        (1 - smooth((scroll - lastWorkStop) / vh));
      const lightEnter = smooth(
        (scroll - (metrics[2].start - vh * 0.8)) / (vh * 0.8),
      );
      const lightExit =
        1 - smooth((scroll - (metrics[4].start - vh * 0.8)) / (vh * 0.8));
      const lightMix = clamp(lightEnter * lightExit);
      const servicesMix =
        smooth((scroll - (metrics[4].start - vh * 0.8)) / (vh * 0.8)) *
        (1 - smooth((scroll - (metrics[5].start - vh * 0.8)) / (vh * 0.8)));
      const contactMix = smooth(
        (scroll - (metrics[5].start - vh * 0.8)) / (vh * 0.8),
      );
      const portalProgress = smooth(
        (scroll - (metrics[4].start - vh * 0.8)) / (vh * 0.8),
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
      };
      story.dataset.workVisibility = workVisibility.toFixed(3);
      story.dataset.lightMix = lightMix.toFixed(3);
      story.dataset.servicesMix = clamp(servicesMix).toFixed(3);
      story.dataset.contactMix = contactMix.toFixed(3);
      story.dataset.portalProgress = portalProgress.toFixed(3);
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
    const previousBodyBackground = document.body.style.backgroundColor;
    gsap.ticker.add(stateTick);
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(story);
    if (!reducedMotion) {
      // One palette timeline scrubs the same measured channel as the renderer.
      // Separate entry/exit tweens on body would compete during reverse travel.
      paletteTimeline = gsap
        .timeline({ paused: true })
        .fromTo(
          document.body,
          { backgroundColor: "#080909" },
          { backgroundColor: "#dce7df", duration: 1, ease: "none" },
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
              trigger: servicesRef.current,
              start: "top 80%",
              end: "center 45%",
              scrub: 0.7,
            },
          })
          .fromTo(
            servicesRef.current!.querySelectorAll(
              ".immersive-services-content > div:first-child, .immersive-service-list article",
            ),
            { y: 28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.07, ease: "none" },
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
      document.body.style.backgroundColor = previousBodyBackground;
    };
  }, [reducedMotion, sceneFailed, rememberWork, sceneState]);

  const nudgeWork = (step: number) => {
    const target = Math.max(
      0,
      Math.min(workProjects.length - 1, activeWork + step),
    );
    const track = worksRef.current;
    if (track) {
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      const destination =
        track.getBoundingClientRect().top +
        window.scrollY +
        (target * travel) / Math.max(1, workProjects.length - 1);
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

      <section
        className="immersive-works-track"
        id="work"
        ref={worksRef}
        aria-label="Selected work"
      >
        <div className="immersive-sticky immersive-work-scene">
          <div className="immersive-index immersive-mono">
            <span>01—06 / SELECTED WORKS</span>
            <span>EDIT / BUILD / REPEAT</span>
          </div>
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
                {String(activeWork + 1).padStart(2, "0")} <i>/ 06</i>
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
          <h2 id="mission-title">MISSION</h2>
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
          <h2 id="vision-title">VISION</h2>
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

      <section
        className="immersive-screen immersive-services"
        id="services"
        ref={servicesRef}
        aria-labelledby="services-title"
      >
        <div className="immersive-index immersive-mono">
          <span>04 / SERVICES</span>
          <span>FROM FIRST THOUGHT TO FINISHED THING</span>
        </div>
        <div className="immersive-services-content">
          <div>
            <span className="immersive-section-kicker immersive-mono">
              WHAT I BRING TO THE TABLE
            </span>
            <h2 id="services-title">
              Make it
              <br />
              <i>real.</i>
            </h2>
          </div>
          <div className="immersive-service-list">
            <article>
              <span className="immersive-mono">01</span>
              <div>
                <h3>Video editing</h3>
                <p>
                  Editorial rhythm, motion, color and sound. Thoughtful cuts
                  that give a story room to breathe and a reason to stay.
                </p>
              </div>
              <Film />
            </article>
            <article>
              <span className="immersive-mono">02</span>
              <div>
                <h3>Creative development</h3>
                <p>
                  Useful, expressive digital experiences. Clear interfaces and
                  considered interactions, built to work as well as they look.
                </p>
              </div>
              <Code2 />
            </article>
            <article>
              <span className="immersive-mono">03</span>
              <div>
                <h3>Creative collaboration</h3>
                <p>
                  From an early sketch to the final frame: shaping an idea with
                  care, curiosity and a sharp eye for detail.
                </p>
              </div>
              <ArrowRight />
            </article>
          </div>
        </div>
        <span className="immersive-service-foot immersive-mono">
          EDIT WITH INTENTION / BUILD WITH PURPOSE
        </span>
      </section>

      <section
        className="immersive-screen immersive-contact"
        id="contact"
        ref={contactRef}
        aria-labelledby="contact-title"
      >
        <div className="immersive-index immersive-mono">
          <span>05 / YOUR MOVE</span>
          <span>THE NEXT FRAME IS OPEN</span>
        </div>
        <div className="immersive-contact-lockup" aria-hidden="true">
          <span>CREATE</span>
          <b>R</b>
        </div>
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
        <a href="#work" className="immersive-back-top immersive-mono">
          BACK TO THE WORK <ArrowRight size={14} />
        </a>
      </section>

      <section
        className="immersive-index-section"
        aria-labelledby="index-title"
      >
        <div className="immersive-index immersive-mono">
          <span>INDEX / THE WORK</span>
          <span>ALL CURRENT STUDIES</span>
        </div>
        <div className="immersive-index-heading">
          <h2 id="index-title">
            The work, <i>unfolded.</i>
          </h2>
          <div
            className="immersive-filter"
            role="group"
            aria-label="Filter projects"
          >
            {(["all", "video", "code"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                {item === "all"
                  ? "All work"
                  : item === "video"
                    ? "Video"
                    : "Code"}
              </button>
            ))}
          </div>
        </div>
        <p
          className="immersive-visually-hidden"
          role="status"
          aria-live="polite"
        >
          Showing {filteredProjects.length}{" "}
          {filter === "all" ? "projects" : `${filter} projects`}.
        </p>
        <div className="immersive-index-grid">
          {filteredProjects.map((project) => (
            <article className="immersive-index-card" key={project.slug}>
              <Link
                to={`/work/${project.slug}`}
                onClick={() =>
                  rememberWork(
                    projects.indexOf(project) /
                      Math.max(1, workProjects.length - 1),
                    "project-link",
                  )
                }
                aria-label={`Open ${project.title} project`}
              >
                <ProjectVisual project={project} />
                <div className="immersive-index-card-copy">
                  <span className="immersive-mono">
                    {project.number} /{" "}
                    {project.category === "video" ? "VIDEO" : "CODE"}
                  </span>
                  <h3>{project.title}</h3>
                  <p>{project.tagline}</p>
                  <span className="immersive-index-tags">
                    {project.tags.slice(0, 3).join(" · ")}
                  </span>
                </div>
                <ArrowRight />
              </Link>
            </article>
          ))}
        </div>
        <div className="immersive-index-bottom">
          <a href="#contact" className="immersive-text-link">
            HAVE A PROJECT IN MIND? <ArrowRight size={14} />
          </a>
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
