import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { projects, type ProjectCategory } from "./content";
import { ProjectVisual } from "./Media";
import "./immersive.css";
import "./upgrade.css";

/** Full project index, linked from the home track's "All works". */
export default function WorksIndex() {
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const filtered = useMemo(
    () =>
      projects.filter((project) => filter === "all" || project.category === filter),
    [filter],
  );
  return (
    <main className="immersive-home works-index-page">
      <section className="immersive-index-section" aria-labelledby="index-title">
        <div className="immersive-index immersive-mono">
          <Link to="/#work" className="works-index-back">
            <ArrowLeft size={13} /> BACK TO THE TRACK
          </Link>
          <span>
            {String(filtered.length).padStart(2, "0")} /{" "}
            {String(projects.length).padStart(2, "0")} PROJECTS
          </span>
        </div>
        <div className="immersive-index-heading">
          <h1 id="index-title">
            The work, <i>unfolded.</i>
          </h1>
          <div className="immersive-filter" role="group" aria-label="Filter projects">
            {(["all", "video", "code"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                {item === "all" ? "All work" : item === "video" ? "Video" : "Code"}
              </button>
            ))}
          </div>
        </div>
        <p className="immersive-visually-hidden" role="status" aria-live="polite">
          Showing {filtered.length}{" "}
          {filter === "all" ? "projects" : `${filter} projects`}.
        </p>
        <div className="immersive-index-grid">
          {filtered.map((project) => (
            <article className="immersive-index-card" key={project.slug}>
              <Link to={`/work/${project.slug}`} aria-label={`Open ${project.title} project`}>
                <ProjectVisual project={project} />
                <div className="immersive-index-card-copy">
                  <span className="immersive-mono">
                    {project.number} / {project.category === "video" ? "VIDEO" : "CODE"}
                    {project.year ? ` / ${project.year}` : ""}
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
          <Link to="/contact" className="immersive-text-link">
            HAVE A PROJECT IN MIND? <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
