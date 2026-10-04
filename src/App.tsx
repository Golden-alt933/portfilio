import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  Play,
  Menu,
  X,
  Plus,
  Code2,
  Film,
  Mail,
  ExternalLink,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile, projects } from "./content";
import type { ProjectCategory } from "./content";
import { ProjectMedia, ProjectVisual, ReelDialog } from "./Media";

const HeroScene = lazy(() => import("./HeroScene"));
gsap.registerPlugin(ScrollTrigger);

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}

function Home() {
  const home = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [reelOpen, setReelOpen] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const [motionPaused, setMotionPaused] = useState(false);
  const reducedMotion = systemReducedMotion || motionPaused;
  const onReady = useCallback((value: boolean) => setReady(value), []);
  const visibleProjects = projects.filter(
    (project) => filter === "all" || project.category === filter,
  );
  const featured = projects[0];
  useEffect(() => {
    if (reducedMotion) setReady(false);
  }, [reducedMotion]);
  useEffect(() => {
    const context = gsap.context(() => {
      if (reducedMotion) {
        progress.current = 0;
        return;
      }
      const match = gsap.matchMedia();
      match.add("(min-width: 901px)", () => {
        gsap.to(".hero-word", {
          y: -90,
          opacity: 0.32,
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.fromTo(
          ".feature-frame",
          { rotateX: 7, rotateY: -5, y: 70 },
          {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".first-project",
              start: "top 95%",
              end: "top 25%",
              scrub: 1,
            },
          },
        );
      });
      ScrollTrigger.create({
        trigger: stage.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });
      gsap.utils
        .toArray<HTMLElement>(".reveal")
        .forEach((element) =>
          gsap.from(element, {
            y: 28,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 94%", once: true },
          }),
        );
    }, home);
    return () => context.revert();
  }, [reducedMotion]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [filter]);
  return (
    <main ref={home}>
      <section
        className="hero"
        ref={stage}
        id="top"
        aria-labelledby="hero-title"
      >
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-coordinate left">CREATIVE PORTFOLIO / 2026</div>
        <div className="hero-coordinate right">FRAME × FUNCTION</div>
        <div className="hero-word" aria-hidden="true">
          CREATE
        </div>
        <div
          className={`hero-letter-fallback ${ready ? "is-ready" : ""}`}
          aria-hidden="true"
        >
          R
        </div>
        {!reducedMotion && (
          <Suspense fallback={null}>
            <HeroScene
              progress={progress}
              reducedMotion={reducedMotion}
              onReady={onReady}
            />
          </Suspense>
        )}
        <div className="crosshair one" aria-hidden="true">
          +
        </div>
        <div className="crosshair two" aria-hidden="true">
          +
        </div>
        <div className="hero-caption">
          <span className="eyebrow">VIDEO EDITOR & CREATIVE DEVELOPER</span>
          <h1 id="hero-title">
            Made to move.
            <br />
            <span>Built to work.</span>
          </h1>
        </div>
        <div className="hero-aside">
          <span className="tiny-label">TWO DISCIPLINES. ONE MIND.</span>
          <p>
            I edit stories.
            <br />I build experiences.
          </p>
          {profile.showreelUrl ? (
            <button className="reel-link" onClick={() => setReelOpen(true)}>
              <Play size={13} fill="currentColor" /> Watch showreel{" "}
              <span className="reel-number">PLAY</span>
            </button>
          ) : (
            <a className="reel-link" href="#work">
              <Play size={13} fill="currentColor" /> Explore the work{" "}
              <span className="reel-number">01—06</span>
            </a>
          )}
        </div>
        <div className="hero-bottom">
          <a href="#work" className="scroll-label">
            <span className="scroll-line" /> SCROLL TO EXPLORE
          </a>
          <button
            className="motion-button"
            aria-pressed={reducedMotion}
            aria-label={reducedMotion ? "Enable motion" : "Reduce motion"}
            disabled={systemReducedMotion}
            onClick={() => setMotionPaused(!motionPaused)}
          >
            MOTION {reducedMotion ? "OFF" : "ON"}
            <span />
          </button>
        </div>
      </section>
      <section className="intro section-pad" id="work">
        <div className="section-meta">
          <span>01 / SELECTED WORK</span>
          <span>VIDEO + CODE</span>
        </div>
        <h2 className="reveal">
          Different tools.
          <br />
          <span>Same obsession.</span>
        </h2>
        <p>
          Finding the right rhythm in a cut.
          <br />
          Finding the right logic in a build.
        </p>
      </section>
      <section className="first-project section-pad">
        <div className="feature-label">
          <span>FEATURED / VIDEO EDITING</span>
          <span>{featured.sample ? "PREVIEW CONCEPT" : featured.format}</span>
        </div>
        <Link
          className="feature-frame"
          to={`/work/${featured.slug}`}
          aria-label={`View ${featured.title}`}
        >
          <ProjectVisual project={featured} large />
          <span className="feature-play">
            <Play size={20} fill="currentColor" />
          </span>
        </Link>
        <div className="feature-foot">
          <div>
            <h3>{featured.title}</h3>
            <p>{featured.tags.join(" · ")}</p>
          </div>
          <Link className="text-link" to={`/work/${featured.slug}`}>
            View {featured.sample ? "concept" : "project"} <Plus size={18} />
          </Link>
        </div>
      </section>
      <section
        className="section-pad gallery"
        aria-labelledby="work-index-title"
      >
        <div className="section-meta">
          <span>WORK INDEX</span>
          <span>YOUR PROJECTS, IN FOCUS</span>
        </div>
        <div className="gallery-heading">
          <h2 id="work-index-title">
            Selected work
            <span className="count">
              ({String(projects.length).padStart(2, "0")})
            </span>
          </h2>
          <div className="filters" role="group" aria-label="Filter projects">
            {(
              [
                ["all", "All"],
                ["video", "Video editing"],
                ["code", "Coding"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {label}
                <span>
                  {value === "all"
                    ? projects.length
                    : projects.filter((p) => p.category === value).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        {projects.some((project) => project.sample) && (
          <p className="sample-note">
            Sample project slots — your reels and builds will replace these
            concepts.
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          Showing {visibleProjects.length}{" "}
          {filter === "all"
            ? ""
            : filter === "video"
              ? "video editing"
              : "coding"}{" "}
          projects
        </p>
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <Link
              to={`/work/${project.slug}`}
              className="project-card"
              key={project.slug}
            >
              <ProjectVisual project={project} />
              <div className="project-card-foot">
                <div>
                  <h3>{project.title}</h3>
                  <span>{project.tags.slice(0, 2).join(" / ")}</span>
                </div>
                <Plus size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="about section-pad" id="about">
        <div className="section-meta">
          <span>02 / ABOUT</span>
          <span>THE PERSON BEHIND THE R</span>
        </div>
        <div className="about-layout">
          <h2 className="reveal">
            Frame by frame.
            <br />
            Line by line.
          </h2>
          <div>
            <p className="about-lead">
              I work where storytelling
              <br />
              and technology meet.
            </p>
            <p>
              Video editing and creative development. Two ways to turn an idea
              into something people can feel, watch and use.
            </p>
            <div className="disciplines">
              <span>
                <Film size={17} /> Video editing
              </span>
              <span>
                <Code2 size={17} /> Creative development
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="contact section-pad" id="contact">
        <div className="section-meta">
          <span>03 / CONTACT</span>
          <span>LET’S MAKE SOMETHING</span>
        </div>
        <h2 className="reveal">
          Have a good
          <br />
          <span>feeling?</span>
        </h2>
        {profile.email ? (
          <a className="contact-email" href={`mailto:${profile.email}`}>
            <Mail size={22} />
            {profile.email}
          </a>
        ) : (
          <p className="contact-placeholder">
            Your contact email will appear here.
          </p>
        )}
        <div className="social-links">
          {profile.instagramUrl && (
            <a
              href={profile.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram <ExternalLink size={14} />
            </a>
          )}
          {profile.githubUrl && (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ExternalLink size={14} />
            </a>
          )}
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

function MissingPage() {
  return (
    <main className="project-page section-pad">
      <h1>Not in the frame.</h1>
      <p className="project-deck">This project could not be found.</p>
      <Link className="text-link" to="/">
        Return home
      </Link>
    </main>
  );
}
function ProjectPage() {
  const { slug } = useParams();
  const project = projects.find((item) => item.slug === slug);
  useEffect(() => {
    document.title = project
      ? `${project.title} — ${profile.name} Portfolio`
      : "Project not found — R";
    const description = document.querySelector('meta[name="description"]');
    const previous = description?.getAttribute("content");
    if (project) description?.setAttribute("content", project.tagline);
    return () => {
      document.title = "R — Frame & Function";
      if (previous) description?.setAttribute("content", previous);
    };
  }, [project]);
  if (!project) return <MissingPage />;
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <main className="project-page section-pad">
      <Link to="/#work" className="text-link">
        Back to work <X size={16} />
      </Link>
      <div className="section-meta">
        <span>
          {project.number} /{" "}
          {project.category === "video"
            ? "VIDEO EDITING"
            : "CREATIVE DEVELOPMENT"}
        </span>
        <span>{project.sample ? "PREVIEW CONCEPT" : project.format}</span>
      </div>
      <h1>{project.title}</h1>
      <p className="project-deck">{project.tagline}</p>
      <ProjectMedia project={project} />
      <div className="project-facts">
        <div>
          <span>DISCIPLINE</span>
          <p>
            {project.category === "video"
              ? "Video editing"
              : "Creative development"}
          </p>
        </div>
        <div>
          <span>FORMAT</span>
          <p>{project.format}</p>
        </div>
        <div>
          <span>TOOLS</span>
          <p>
            {project.tools.length
              ? project.tools.join(", ")
              : "To be added with project"}
          </p>
        </div>
      </div>
      <div className="case-body">
        <h2>
          {project.category === "video" ? "Behind the cut" : "Behind the build"}
        </h2>
        <div>
          <p>{project.overview}</p>
          <h3>Approach</h3>
          <p>{project.approach}</p>
          <h3>My contribution</h3>
          <p>{project.contribution}</p>
          {(project.repositoryUrl || project.demoUrl) && (
            <div className="case-links">
              {project.repositoryUrl && (
                <a
                  className="text-link"
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source <ExternalLink size={15} />
                </a>
              )}
              {project.demoUrl && (
                <a
                  className="text-link"
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Live demo <ExternalLink size={15} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <Link to={`/work/${next.slug}`} className="next-project">
        <span>NEXT PROJECT / {next.number}</span>
        <h2>
          {next.title}
          <Plus size={30} />
        </h2>
      </Link>
    </main>
  );
}
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    if (location.hash)
      requestAnimationFrame(() =>
        document
          .getElementById(decodeURIComponent(location.hash.slice(1)))
          ?.scrollIntoView(),
      );
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="R portfolio home">
          R<span className="brand-dot">.</span>
          {profile.name !== "R" && (
            <span className="brand-name">{profile.name}</span>
          )}
        </Link>
        <nav
          className={menuOpen ? "nav open" : "nav"}
          aria-label="Main navigation"
        >
          <Link to="/#work">
            Work <span>01</span>
          </Link>
          <Link to="/#about">
            About <span>02</span>
          </Link>
          <Link to="/#contact" className="contact-link">
            Let’s talk <Plus size={14} />
          </Link>
        </nav>
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="*" element={<MissingPage />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <Link to="/" className="brand" aria-label="R portfolio home">
          R<span className="brand-dot">.</span>
        </Link>
        <span>FRAME & FUNCTION</span>
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <Link to="/#top">BACK TO TOP</Link>
      </footer>
    </>
  );
}
