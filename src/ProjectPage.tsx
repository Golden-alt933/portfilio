import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github, Instagram } from "lucide-react";
import { profile, projects } from "./content";
import { ProjectMedia } from "./Media";
import { RiseBlock, RiseText } from "./RiseText";
import "./project-page.css";

function MissingPage() {
  return (
    <main className="project-page case section-pad">
      <RiseText as="h1" className="case-title" text="Not in the frame." />
      <RiseText className="case-tagline" text="This project could not be found." delay={0.2} />
      <RiseBlock delay={0.35}>
        <Link className="case-back" to="/">
          <ArrowLeft size={15} /> Return home
        </Link>
      </RiseBlock>
    </main>
  );
}

export default function ProjectPage() {
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

  const video = project.category === "video";
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  const facts = [
    { label: "Role", value: project.role },
    { label: "Discipline", value: video ? "Video editing" : "Creative development" },
    { label: "Format", value: project.format },
    project.tools.length ? { label: video ? "Tools" : "Stack", value: project.tools.join(", ") } : null,
    project.year ? { label: "Year", value: project.year } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
  const story = [
    { label: "The brief", text: project.brief },
    { label: "The approach", text: project.approach },
    { label: "The result", text: project.outcome },
  ];

  return (
    // Keyed by slug so moving to the next project replays the reveal.
    <main className="project-page case section-pad" key={project.slug}>
      <RiseBlock className="case-top">
        <Link to="/#work" className="case-back">
          <ArrowLeft size={15} /> All work
        </Link>
        <span className="case-kicker">
          {project.number} / {video ? "Video editing" : "Creative development"}
          {project.year ? ` / ${project.year}` : ""}
        </span>
      </RiseBlock>

      <header className="case-hero">
        <RiseText as="h1" className="case-title" text={project.title} stagger={0.08} delay={0.1} />
        <RiseText
          className="case-tagline"
          text={project.sample ? `${project.tagline} (Preview concept.)` : project.tagline}
          delay={0.35}
          stagger={0.018}
        />
      </header>

      {(project.stats?.length || project.instagramUrl || project.repositoryUrl || project.demoUrl) && (
        <section className="case-highlights" aria-label="Highlights">
          {project.stats?.length ? (
            <dl className="case-stats">
              {project.stats.map((stat, index) => (
                <div key={stat.label}>
                  <RiseText as="dt" text={stat.value} delay={0.5 + index * 0.08} />
                  <RiseText as="dd" text={stat.label} delay={0.58 + index * 0.08} stagger={0.02} />
                </div>
              ))}
            </dl>
          ) : null}
          <RiseBlock className="case-ctas" delay={0.7}>
            {project.instagramUrl && (
              <a className="case-cta" href={project.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram size={15} /> Watch on Instagram <ArrowUpRight size={14} />
              </a>
            )}
            {project.repositoryUrl && (
              <a className="case-cta" href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                <Github size={15} /> View the code <ArrowUpRight size={14} />
              </a>
            )}
            {project.demoUrl && (
              <a className="case-cta" href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                Live demo <ArrowUpRight size={14} />
              </a>
            )}
          </RiseBlock>
        </section>
      )}

      <RiseBlock className="case-media" delay={0.55}>
        <ProjectMedia project={project} />
      </RiseBlock>

      <dl className="case-facts">
        {facts.map((fact, index) => (
          <div key={fact.label}>
            <RiseText as="dt" text={fact.label} delay={index * 0.06} />
            <RiseText as="dd" text={fact.value} delay={0.08 + index * 0.06} stagger={0.02} />
          </div>
        ))}
      </dl>

      <section className="case-story" aria-label={video ? "Behind the cut" : "Behind the build"}>
        {story.map((part, index) => (
          <div className="case-row" key={part.label}>
            <RiseText as="h2" className="case-label" text={`0${index + 1} — ${part.label}`} />
            <RiseText className="case-copy" text={part.text} delay={0.1} stagger={0.012} />
          </div>
        ))}
        {project.skills.length > 0 && (
          <div className="case-row">
            <RiseText as="h2" className="case-label" text="04 — What I bring" />
            <ul className="case-skills">
              {project.skills.map((skill, index) => (
                <li key={skill}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <RiseText as="span" text={skill} delay={0.08 + index * 0.08} stagger={0.02} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="case-invite">
        <RiseText
          as="h2"
          text={video ? "Have a story that needs cutting?" : "Have an idea that needs building?"}
          stagger={0.05}
        />
        <RiseText
          text="I take work from the first idea to the final delivery, and I'm open to freelance projects and full-time roles."
          delay={0.2}
          stagger={0.015}
        />
        <RiseBlock className="case-ctas" delay={0.35}>
          <Link className="case-cta solid" to="/#contact">
            Start a project <ArrowRight size={14} />
          </Link>
          <Link className="case-cta" to="/works">
            See all work
          </Link>
        </RiseBlock>
      </section>

      <Link to={`/work/${next.slug}`} className="case-next">
        <span className="case-kicker">Next project / {next.number}</span>
        <span className="case-next-title">
          <RiseText as="span" text={next.title} stagger={0.06} />
          <ArrowRight className="case-next-arrow" size={34} strokeWidth={1.4} />
        </span>
      </Link>
    </main>
  );
}

export { MissingPage };
