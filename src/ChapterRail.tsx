import { useEffect, useState } from "react";

const sections = [
  ["hero", "top", "TOP"],
  ["works", "work", "WORKS"],
  ["mission", "about", "ABOUT"],
  ["vision", "vision", "VISION"],
  ["services", "services", "SERVICES"],
] as const;

export default function ChapterRail() {
  const [chapter, setChapter] = useState("hero");
  useEffect(() => {
    const update = () =>
      setChapter(document.body.dataset.sceneChapter || "hero");
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scene-chapter"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <nav
      className={`chapter-rail ${chapter === "contact" ? "is-hidden" : ""}`}
      aria-label="Portfolio chapters"
    >
      {sections.map(([value, id, label]) => (
        <a
          key={value}
          href={`#${id}`}
          aria-current={chapter === value ? "location" : undefined}
        >
          <span className="chapter-rail__tick" aria-hidden="true" />
          <span className="chapter-rail__label">{label}</span>
          <span className="chapter-rail__minor" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </a>
      ))}
    </nav>
  );
}
