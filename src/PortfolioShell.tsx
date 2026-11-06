import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import { profile } from "./content";
import { ScrambleText, SlotLabel } from "./MotionUI";
import ChapterRail from "./ChapterRail";
import { useSceneHost } from "./SceneHost";
import "./shell.css";

export default function PortfolioShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { reducedMotion } = useSceneHost();
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const page = useRef<HTMLDivElement>(null);
  useEffect(
    () => setMenuOpen(false),
    [location.pathname, location.hash, location.key],
  );
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = navigation.current?.querySelectorAll<HTMLAnchorElement>("a");
    links?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab" && links?.length) {
        const first = links[0],
          last = menuButton.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keydown);
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!page.current || reducedMotion) return;
    const element = page.current;
    const animation = gsap.fromTo(
      element,
      { opacity: 0 },
      { opacity: 1, duration: 0.55, ease: "power2.out", clearProps: "opacity" },
    );
    return () => {
      animation.kill();
      element.style.removeProperty("opacity");
    };
  }, [location.pathname, reducedMotion]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header
        className={`site-header shell-header ${menuOpen ? "menu-is-open" : ""}`}
      >
        <Link
          to="/"
          className="brand shell-brand"
          aria-label="R Studio home"
        >
          <BrandMark />
          <span>STUDIO</span>
        </Link>
        <nav
          ref={navigation}
          id="main-navigation"
          className={menuOpen ? "nav open" : "nav"}
          aria-label="Main navigation"
        >
          <Link to="/#work">
            <ScrambleText text="Works" />
          </Link>
          <Link to="/#about">
            <ScrambleText text="About" />
          </Link>
          <Link to="/#services">
            <ScrambleText text="Services" />
          </Link>
          <Link to="/works">
            <ScrambleText text="Index" />
          </Link>
          <Link to="/contact" className="contact-link">
            <SlotLabel text="Contact / Collaborate" />
          </Link>
          <div className="menu-disciplines">
            VIDEO EDITING&nbsp; / &nbsp;CREATIVE DEVELOPMENT
          </div>
        </nav>
        <button
          ref={menuButton}
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? <X size={24} /> : <Menu size={23} />}
        </button>
      </header>
      {location.pathname === "/" && <ChapterRail />}
      <div id="main-content" tabIndex={-1} ref={page}>
        {children}
      </div>
      {location.pathname !== "/" && (
      <footer className="site-footer shell-footer">
        <Link
          to="/"
          className="brand shell-brand"
          aria-label="R Studio home"
        >
          <BrandMark />
          <span>STUDIO</span>
        </Link>
        <div className="footer-pages">
          <Link to="/#top">
            <ScrambleText text="Top" />
          </Link>
          <Link to="/#work">
            <ScrambleText text="Works" />
          </Link>
          <Link to="/#about">
            <ScrambleText text="About" />
          </Link>
          <Link to="/contact">
            <ScrambleText text="Contact" />
          </Link>
        </div>
        <span>
          © {new Date().getFullYear()} {profile.name} / FRAME & FUNCTION
        </span>
      </footer>
      )}
    </>
  );
}

/** The R Studio mark: an R whose counter is a play button. Ink follows the text colour. */
function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="15 12 33 40" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M15 12h19a12.5 12.5 0 0 1 4.4 24.2L48 52h-9.6l-8.6-14.5H23.5V52H15zM25 18.2v13.6L36.2 25z"
      />
      <path fill="#85f4ff" d="M27.6 21.6v6.8l5.8-3.4z" />
    </svg>
  );
}
