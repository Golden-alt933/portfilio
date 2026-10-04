import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Play, Menu, X, Plus, Code2, Film, VolumeX } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const HeroScene = lazy(() => import('./HeroScene'));
gsap.registerPlugin(ScrollTrigger);

function Home() {
  const stage = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const context = gsap.context(() => {
      if (!reducedMotion) {
        gsap.to('.hero-word', { y: -70, opacity: .35, scrollTrigger: { trigger: stage.current, start: 'top top', end: 'bottom top', scrub: 1 } });
        ScrollTrigger.create({ trigger: stage.current, start: 'top top', end: 'bottom top', onUpdate: self => { progress.current = self.progress; } });
      }
    }, stage);
    return () => context.revert();
  }, [reducedMotion]);
  return <main>
    <section className="hero" ref={stage} id="top" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-coordinate left">CREATIVE PORTFOLIO / 2026</div>
      <div className="hero-coordinate right">FRAME × FUNCTION</div>
      <div className="hero-word" aria-hidden="true">CREATE</div>
      <div className={`hero-letter-fallback ${ready ? 'is-ready' : ''}`} aria-hidden="true">R</div>
      {!reducedMotion && <Suspense fallback={null}><HeroScene progress={progress} reducedMotion={reducedMotion} onReady={onReady} /></Suspense>}
      <div className="crosshair one" aria-hidden="true">+</div><div className="crosshair two" aria-hidden="true">+</div>
      <div className="hero-caption"><span className="eyebrow">VIDEO EDITOR & CREATIVE DEVELOPER</span><h1 id="hero-title">Made to move.<br /><span>Built to work.</span></h1><p>Stories with feeling.<br />Experiences with purpose.</p></div>
      <div className="hero-aside"><span className="tiny-label">TWO DISCIPLINES. ONE MIND.</span><p>I edit stories.<br />I build experiences.</p><a className="reel-link" href="#work"><Play size={13} fill="currentColor" /> Explore the work <span className="reel-number">01—06</span></a></div>
      <div className="hero-bottom"><a href="#work" className="scroll-label"><span className="scroll-line" /> SCROLL TO EXPLORE</a><span className="sound-label"><VolumeX size={14} /> SOUND OFF</span></div>
    </section>
    <section className="intro section-pad" id="work"><div className="section-meta"><span>01 / SELECTED WORK</span><span>VIDEO + CODE</span></div><h2>Different tools.<br /><span>Same obsession.</span></h2><p>Finding the right rhythm in a cut.<br />Finding the right logic in a build.</p></section>
    <section className="first-project section-pad"><div className="feature-label"><span>FEATURED / VIDEO EDITING</span><span>PREVIEW CONCEPT</span></div><Link className="feature-frame" to="/work/motion-study"><div className="frame-lines" /><div className="feature-type"><span>01</span><strong>MAKE<br /><i>IT MOVE.</i></strong><div className="feature-baseline"><span>A MOTION STUDY</span><span>9:16 / 00:30</span></div></div><span className="feature-play"><Play size={20} fill="currentColor" /></span></Link><div className="feature-foot"><div><h3>Motion study</h3><p>Editing · Rhythm · Typography</p></div><Link className="text-link" to="/work/motion-study">View concept <Plus size={18} /></Link></div></section>
    <section className="section-pad gallery"><div className="section-meta"><span>WORK INDEX</span><span>YOUR PROJECTS, IN FOCUS</span></div><h2>Selected work<span className="count">(06)</span></h2><p className="sample-note">Sample project slots — your reels and builds will replace these concepts.</p><div className="project-grid">{['Editorial cut', 'Brand film', 'Creative application', 'Interactive experiment', 'Web experience'].map((name, index) => <Link to="/work/motion-study" className="project-card" key={name}><div className={`project-preview sample-${index}`}><span className="project-index">0{index + 2}</span>{index < 2 ? <Film size={28} /> : <Code2 size={28} />}<strong>{name}</strong><span className="preview-caption">PROJECT SLOT / {index < 2 ? 'VIDEO' : 'CODE'}</span></div><div className="project-card-foot"><h3>{name}</h3><Plus size={18} /></div></Link>)}</div></section>
    <section className="about section-pad" id="about"><div className="section-meta"><span>02 / ABOUT</span><span>THE PERSON BEHIND THE R</span></div><div className="about-layout"><h2>Frame by frame.<br />Line by line.</h2><div><p className="about-lead">I work where storytelling<br />and technology meet.</p><p>Video editing and creative development. Two ways to turn an idea into something people can feel, watch and use.</p><div className="disciplines"><span><Film size={17} /> Video editing</span><span><Code2 size={17} /> Creative development</span></div></div></div></section>
    <section className="contact section-pad" id="contact"><div className="section-meta"><span>03 / CONTACT</span><span>LET’S MAKE SOMETHING</span></div><h2>Have a good<br /><span>feeling?</span></h2><p>Contact details will be added with your profile.</p></section>
  </main>;
}

function Project() { return <main className="project-page section-pad"><Link to="/#work" className="text-link">Back to work <X size={16} /></Link><div className="section-meta"><span>01 / VIDEO EDITING</span><span>PREVIEW CONCEPT</span></div><h1>Motion study</h1><p className="project-deck">An editorial direction for rhythm, type and movement.</p><div className="case-preview"><strong>MAKE<br /><i>IT MOVE.</i></strong><span>CONCEPT PREVIEW · YOUR REEL WILL APPEAR HERE</span></div><div className="case-body"><h2>Behind the cut</h2><p>This is a sample case-study slot. Your final reel, contribution, creative choices and tools will appear here once you provide the project.</p></div></main>; }

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView()); else window.scrollTo(0, 0); }, [location]);
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="site-header"><Link to="/" className="brand" aria-label="R portfolio home">R<span className="brand-dot">.</span></Link><nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><Link to="/#work">Work <span>01</span></Link><Link to="/#about">About <span>02</span></Link><Link to="/#contact" className="contact-link">Let’s talk <Plus size={14} /></Link></nav><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button></header><div id="main-content"><Routes><Route path="/" element={<Home />} /><Route path="/work/:slug" element={<Project />} /><Route path="*" element={<main className="project-page section-pad"><h1>Not in the frame.</h1><Link className="text-link" to="/">Return home</Link></main>} /></Routes></div><footer className="site-footer"><Link to="/" className="brand">R<span className="brand-dot">.</span></Link><span>FRAME & FUNCTION</span><span>© {new Date().getFullYear()} R</span><a href="#top">BACK TO TOP</a></footer></>;
}
