export type ProjectCategory = "video" | "code";
export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  number: string;
  tagline: string;
  tags: string[];
  format: string;
  previewTitle: string;
  previewSubtitle: string;
  tone: string;
  sample: boolean;
  overview: string;
  approach: string;
  contribution: string;
  tools: string[];
  videoUrl?: string;
  posterUrl?: string;
  instagramUrl?: string;
  repositoryUrl?: string;
  demoUrl?: string;
  /** Shown above the title on the home track, e.g. "2026". */
  year?: string;
  /** Short highlighted note next to the year (award, views, client). */
  highlight?: string;
}
// Edit this file to add your identity, media and real projects.
export const profile = {
  name: "R",
  email: "",
  instagramUrl: "",
  githubUrl: "",
  showreelUrl: "",
  showreelPoster: "",
};
/** Services chapters on the home page. `project` picks a visual by slug. */
export const services = [
  {
    label: "01 / EDIT",
    title: "Video editing",
    body: "Editorial rhythm, motion, color and sound. Thoughtful cuts that give a story room to breathe and a reason to stay.",
    points: ["Short-form & reels", "Story-led long edits", "Color & sound finishing"],
    project: "motion-study",
  },
  {
    label: "02 / BUILD",
    title: "Creative development",
    body: "Useful, expressive digital experiences. Clear interfaces and considered interactions, built to work as well as they look.",
    points: ["Interactive websites", "WebGL & motion", "Prototypes & tools"],
    project: "web-experience",
  },
  {
    label: "03 / TOGETHER",
    title: "Creative collaboration",
    body: "From an early sketch to the final frame: shaping an idea with care, curiosity and a sharp eye for detail.",
    points: ["Concept & direction", "Edit and build in one place", "Sketch to launch"],
    project: "interactive-experiment",
  },
];

export const projects: Project[] = [
  {
    slug: "motion-study",
    title: "Motion study",
    category: "video",
    number: "01",
    tagline: "An editorial direction for rhythm, type and movement.",
    tags: ["Editing", "Rhythm", "Typography"],
    format: "Vertical / 9:16",
    previewTitle: "MAKE",
    previewSubtitle: "IT MOVE.",
    tone: "silver",
    sample: true,
    overview:
      "A space for an edit that brings typography, pacing and sound together. Add your final reel here to show the finished experience.",
    approach:
      "Describe the pacing, transitions, sound design and visual choices that made this edit yours.",
    contribution: "Add your exact role and what you edited.",
    tools: [],
  },
  {
    slug: "editorial-cut",
    title: "Editorial cut",
    category: "video",
    number: "02",
    tagline: "A space for a story told through carefully chosen frames.",
    tags: ["Storytelling", "Editing", "Color"],
    format: "Landscape / 16:9",
    previewTitle: "EVERY",
    previewSubtitle: "FRAME.",
    tone: "blue",
    sample: true,
    overview:
      "Use this project slot for an editorial reel, short film or narrative edit. The final footage will be the focus of this case study.",
    approach:
      "Add the brief and explain how your selection of shots, color treatment and rhythm shaped the story.",
    contribution: "Add your exact role and the scope of the edit.",
    tools: [],
  },
  {
    slug: "brand-film",
    title: "Brand film",
    category: "video",
    number: "03",
    tagline: "A space for a brand story with a clear point of view.",
    tags: ["Brand film", "Sound design", "Editing"],
    format: "Reel / 9:16",
    previewTitle: "FEEL",
    previewSubtitle: "SOMETHING.",
    tone: "olive",
    sample: true,
    overview:
      "Use this slot for a commercial, campaign film or branded reel. Add the final video and the brief behind it.",
    approach:
      "Explain how you translated the brief into an edit, including the creative decisions that carried the brand’s message.",
    contribution: "Add the work you personally completed.",
    tools: [],
  },
  {
    slug: "creative-application",
    title: "Creative application",
    category: "code",
    number: "04",
    tagline: "A space for a useful idea brought to life in code.",
    tags: ["Application", "Development", "UX"],
    format: "Application",
    previewTitle: "IDEA",
    previewSubtitle: "TO REALITY.",
    tone: "terminal",
    sample: true,
    overview:
      "Add an application you built, with real screenshots, a short demo and links to the source or live version.",
    approach:
      "Describe the user problem, architecture, key tradeoffs and the most difficult implementation challenge. Include outcomes you can verify.",
    contribution: "Add your role, responsibilities and collaborators.",
    tools: [],
  },
  {
    slug: "interactive-experiment",
    title: "Interactive experiment",
    category: "code",
    number: "05",
    tagline: "A space for curiosity, interaction and creative coding.",
    tags: ["Interaction", "Creative coding", "Experiment"],
    format: "Interactive",
    previewTitle: "WHAT",
    previewSubtitle: "IF?",
    tone: "violet",
    sample: true,
    overview:
      "Use this slot for an interactive experiment, visualization or creative coding project.",
    approach:
      "Explain the question you explored, the interaction you designed and what you learned from the implementation.",
    contribution: "Add what you designed and built.",
    tools: [],
  },
  {
    slug: "web-experience",
    title: "Web experience",
    category: "code",
    number: "06",
    tagline: "A space for a website that feels as good as it works.",
    tags: ["Web", "Development", "Design"],
    format: "Website",
    previewTitle: "FORM",
    previewSubtitle: "& FUNCTION.",
    tone: "slate",
    sample: true,
    overview:
      "Add a web project with a live link, screenshots and a short explanation of your contribution.",
    approach:
      "Explain the design, accessibility, performance and development choices behind the experience.",
    contribution: "Add the parts you owned and delivered.",
    tools: [],
  },
];
export function instagramEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !["www.instagram.com", "instagram.com"].includes(parsed.hostname)
    )
      return null;
    const match = parsed.pathname.match(/^\/(reel|p)\/([a-zA-Z0-9_-]+)\/?$/);
    return match
      ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/`
      : null;
  } catch {
    return null;
  }
}
