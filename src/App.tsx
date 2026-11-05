import { useEffect } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { X, Plus, ExternalLink, Github, Instagram } from "lucide-react";
import { profile, projects } from "./content";
import { ProjectMedia } from "./Media";
import ImmersiveHome from "./ImmersiveHome";
import WorksIndex from "./WorksIndex";
import PortfolioShell from "./PortfolioShell";
import SceneHost from "./SceneHost";
import ScrollProvider from "./ScrollProvider";

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
      {(project.stats?.length || project.instagramUrl || project.repositoryUrl || project.demoUrl) && (
        <div className="project-highlights">
          {project.stats?.length ? (
            <dl className="project-stats">
              {project.stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.value}</dt>
                  <dd>{stat.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="project-ctas">
            {project.instagramUrl && (
              <a className="project-cta" href={project.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram size={16} /> Watch on Instagram <ExternalLink size={14} />
              </a>
            )}
            {project.repositoryUrl && (
              <a className="project-cta" href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                <Github size={16} /> View on GitHub <ExternalLink size={14} />
              </a>
            )}
            {project.demoUrl && (
              <a className="project-cta" href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                Live demo <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}
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
  return (
    <SceneHost>
      <ScrollProvider>
        <PortfolioShell>
          <Routes>
            <Route path="/" element={<ImmersiveHome />} />
            <Route path="/works" element={<WorksIndex />} />
            <Route path="/work/:slug" element={<ProjectPage />} />
            <Route path="*" element={<MissingPage />} />
          </Routes>
        </PortfolioShell>
      </ScrollProvider>
    </SceneHost>
  );
}
