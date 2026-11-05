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
    project: "saturnalia-fest-reel",
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
    slug: "saturnalia-fest-reel",
    title: "Saturnalia fest reel",
    category: "video",
    number: "01",
    tagline: "The fest announcement reel: big type, a packed crowd and a beat that builds.",
    tags: ["Fest reel", "Kinetic type", "Editing"],
    format: "Reel / 16:9",
    previewTitle: "SATURNALIA",
    previewSubtitle: "IS BACK.",
    tone: "olive",
    sample: false,
    year: "2026",
    highlight: "95K views",
    posterUrl: "/work/saturnalia-fest.jpg",
    instagramUrl: "https://www.instagram.com/reel/DcqojygzTWy/",
    overview:
      "A hype reel for the Saturnalia fest. Glowing stage-light type introduces the fest line by line before it opens up into the headline acts and the crowd.",
    approach:
      "Short title beats carry the build-up, each one landing on the music, and the cuts speed up as the reel moves into the performances.",
    contribution: "Edit, type animation and pacing.",
    tools: [],
  },
  {
    slug: "saturnalia-aftermovie",
    title: "Saturnalia aftermovie",
    category: "video",
    number: "02",
    tagline: "From an empty field to a full stage: the build, the night and the crowd.",
    tags: ["Aftermovie", "Event", "Editing"],
    format: "Reel / 16:9",
    previewTitle: "THE",
    previewSubtitle: "NIGHT.",
    tone: "violet",
    sample: false,
    year: "2026",
    highlight: "66.8K views",
    posterUrl: "/work/saturnalia-aftermovie.jpg",
    instagramUrl: "https://www.instagram.com/reel/Dcak6cZu8dT/",
    overview:
      "An event reel that follows Saturnalia from setup to show: the stage going up, the headline performances and the crowd, ending on the next edition.",
    approach:
      "Starts slow and monochrome on the build, then breaks into colour, light and fast cuts once the show begins.",
    contribution: "Edit, colour and sound.",
    tools: [],
  },
  {
    slug: "navratri-motion-graphics",
    title: "Navratri night motion graphics",
    category: "video",
    number: "03",
    tagline: "A collage-style motion graphics promo for a sold-out Navratri night.",
    tags: ["Motion graphics", "Collage", "Promo"],
    format: "Reel / 9:16",
    previewTitle: "DISCO &",
    previewSubtitle: "FIREWORKS.",
    tone: "silver",
    sample: false,
    year: "2026",
    highlight: "Motion graphics",
    posterUrl: "/work/navratri-motion.jpg",
    instagramUrl: "https://www.instagram.com/p/DeUtjLOyv2A/",
    overview:
      "A promo for a Navratri garba and dandiya night, built from cut-out dancers, textile patterns and bold type, ending on a sold-out thank-you.",
    approach:
      "Each section gets its own collage scene and palette, with cut-outs and type animated in on the beat.",
    contribution: "Motion design and animation.",
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
