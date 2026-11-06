import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { instagramEmbedUrl } from "./content";
import type { Project } from "./content";
import VideoPlayer from "./VideoPlayer";

export function ProjectVisual({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) {
  return (
    <div className={`project-art tone-${project.tone} ${large ? "large" : ""}`}>
      {project.posterUrl ? (
        <img
          src={project.posterUrl}
          alt={`${project.title} preview`}
          loading="lazy"
        />
      ) : (
        <>
          <div className="art-grid" aria-hidden="true" />
          <div className="art-top">
            <span>
              {project.number} /{" "}
              {project.category === "video" ? "MOTION" : "DEVELOPMENT"}
            </span>
            <span>{project.sample ? "CONCEPT" : project.format}</span>
          </div>
          <strong>
            {project.previewTitle}
            <br />
            <i>{project.previewSubtitle}</i>
          </strong>
          {project.category === "code" && (
            <div className="code-fragment" aria-hidden="true">
              <span>const idea = new Experience();</span>
              <span>
                idea.makeItReal();<b>_</b>
              </span>
            </div>
          )}
          <div className="art-bottom">
            <span>{project.title.toUpperCase()}</span>
            <span>{project.format.toUpperCase()}</span>
          </div>
        </>
      )}
    </div>
  );
}
export function ProjectMedia({ project }: { project: Project }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
  }, [project.slug]);
  if (project.videoUrl)
    return (
      <VideoPlayer
        key={project.slug}
        src={project.videoUrl}
        poster={project.posterUrl}
        title={project.title}
      />
    );
  const embedUrl = project.instagramUrl
    ? instagramEmbedUrl(project.instagramUrl)
    : null;
  if (embedUrl)
    return (
      <div className="instagram-frame">
        {loaded ? (
          <iframe
            src={embedUrl}
            title={`${project.title} on Instagram`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="instagram-prompt">
            <ProjectVisual project={project} />
            <button onClick={() => setLoaded(true)} className="pill-button">
              <Play size={16} /> Load Instagram reel
            </button>
          </div>
        )}
        <a
          className="text-link"
          href={project.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on Instagram <ExternalLink size={15} />
        </a>
      </div>
    );
  return (
    <div>
      <ProjectVisual project={project} large />
      {project.sample && (
        <p className="media-caption">
          Concept preview. The final video or project screenshots will appear
          here.
        </p>
      )}
    </div>
  );
}
export function ReelDialog({
  url,
  poster,
  onClose,
}: {
  url: string;
  poster: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const focusBefore =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      focusBefore?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="reel-dialog"
      aria-labelledby="reel-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id="reel-dialog-title">Showreel</h2>
        <button onClick={onClose} aria-label="Close showreel">
          <X size={22} />
        </button>
      </div>
      <video
        controls
        playsInline
        autoPlay
        src={url}
        poster={poster || undefined}
        aria-label="Portfolio showreel"
      />
    </dialog>
  );
}
