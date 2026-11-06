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
  /** What the project had to do, in one or two sentences. */
  brief: string;
  /** How it was made: the decisions that made it work. */
  approach: string;
  /** What came of it. */
  outcome: string;
  /** The part I played, e.g. "Editor, colour and sound". */
  role: string;
  /** What this project shows I can do for a client or team. */
  skills: string[];
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
  /** Headline numbers shown on the project page, e.g. { value: "95K", label: "views" }. */
  stats?: { value: string; label: string }[];
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
    project: "restaurant-app",
  },
  {
    label: "03 / TOGETHER",
    title: "Creative collaboration",
    body: "From an early sketch to the final frame: shaping an idea with care, curiosity and a sharp eye for detail.",
    points: ["Concept & direction", "Edit and build in one place", "Sketch to launch"],
    project: "friday-agent",
  },
];

export const projects: Project[] = [
  {
    slug: "saturnalia-fest-reel",
    title: "Saturnalia fest reel",
    category: "video",
    number: "01",
    tagline: "The official announcement reel for Saturnalia, cut so the whole campus knew the fest was back. 95K views on Instagram.",
    tags: ["Fest reel", "Kinetic type", "Editing"],
    format: "Reel / 16:9",
    previewTitle: "SATURNALIA",
    previewSubtitle: "IS BACK.",
    tone: "olive",
    sample: false,
    year: "2026",
    highlight: "95K views",
    stats: [
      { value: "95K", label: "views on Instagram" },
      { value: "Saturnalia", label: "official fest reel" },
    ],
    videoUrl: "/work/saturnalia-fest.mp4",
    posterUrl: "/work/saturnalia-fest.jpg",
    instagramUrl: "https://www.instagram.com/reel/DcqojygzTWy/",
    brief:
      "Announce that Saturnalia is back, in a reel short enough to finish on a scroll and strong enough to make people share it.",
    approach:
      "The edit is built around the music. Glowing stage-light type introduces the fest line by line, every title landing on a beat, then the cuts speed up as it opens into the headline acts and the crowd, so the energy keeps building to the last frame.",
    outcome:
      "It went out as the fest's official announcement reel and reached 95K views on Instagram.",
    role: "Editor and type animation",
    skills: [
      "Edits cut to the music, so every beat lands",
      "Kinetic type that carries the message",
      "Pacing made for short-form feeds",
    ],
    tools: [],
  },
  {
    slug: "saturnalia-aftermovie",
    title: "Saturnalia aftermovie",
    category: "video",
    number: "02",
    tagline: "The official Saturnalia aftermovie: from an empty field to a full stage, in one reel watched 66.8K times.",
    tags: ["Aftermovie", "Event", "Editing"],
    format: "Reel / 16:9",
    previewTitle: "THE",
    previewSubtitle: "NIGHT.",
    tone: "violet",
    sample: false,
    year: "2026",
    highlight: "66.8K views",
    stats: [
      { value: "66.8K", label: "views on Instagram" },
      { value: "Saturnalia", label: "official aftermovie" },
    ],
    videoUrl: "/work/saturnalia-aftermovie.mp4",
    posterUrl: "/work/saturnalia-aftermovie.jpg",
    instagramUrl: "https://www.instagram.com/reel/Dcak6cZu8dT/",
    brief:
      "Tell the story of the whole fest, from setup to the last act, so the people who were there relive it and the people who missed it want to come next time.",
    approach:
      "The story runs on contrast. The build starts slow and in monochrome as the stage goes up, then breaks into colour, light and fast cuts the moment the show begins, and closes by pointing to the next edition.",
    outcome:
      "It went out as the official aftermovie and reached 66.8K views on Instagram.",
    role: "Editor, colour and sound",
    skills: [
      "Shaping a whole event into one clear story",
      "Colour grading that changes with the mood",
      "Sound and music edits that carry the energy",
    ],
    tools: [],
  },
  {
    slug: "navratri-motion-graphics",
    title: "Navratri night motion graphics",
    category: "video",
    number: "03",
    tagline: "A collage-style motion graphics promo for a Navratri garba and dandiya night where every pass sold out.",
    tags: ["Motion graphics", "Collage", "Promo"],
    format: "Promo / 16:9",
    previewTitle: "DISCO &",
    previewSubtitle: "FIREWORKS.",
    tone: "silver",
    sample: false,
    year: "2026",
    highlight: "Sold-out night",
    stats: [
      { value: "Sold out", label: "every pass for the night" },
      { value: "After Effects", label: "collage motion graphics" },
    ],
    videoUrl: "/work/navratri-motion.mp4",
    posterUrl: "/work/navratri-motion.jpg",
    instagramUrl: "https://www.instagram.com/p/DeUtjLOyv2A/",
    brief:
      "Promote a Navratri garba and dandiya night with a piece as colourful and lively as the night itself.",
    approach:
      "I built it as a moving collage of cut-out dancers, textile patterns and bold type. Every section has its own scene and palette, and every cut-out and line of type animates in on the beat.",
    outcome:
      "Every pass for the night sold out, and the promo closes on a thank-you to everyone who came.",
    role: "Motion design and animation",
    skills: [
      "Motion graphics built from cut-outs, patterns and type",
      "A distinct look and palette for every section",
      "Animation timed to the music",
    ],
    tools: ["After Effects"],
  },
  {
    slug: "restaurant-app",
    title: "Campus restaurant app",
    category: "code",
    number: "04",
    tagline: "A restaurant ordering app we built to survive the campus lunch rush, with honest wait times instead of a “Closed” sign.",
    tags: ["React Native", "Cloudflare Workers", "Real-time"],
    format: "Mobile app",
    previewTitle: "LUNCH",
    previewSubtitle: "RUSH.",
    tone: "terminal",
    sample: false,
    year: "2026",
    highlight: "Team build",
    stats: [
      { value: "1 PM", label: "rush it was built for" },
      { value: "15", label: "orders in the kitchen at once" },
      { value: "3", label: "tiers instead of “Closed”" },
    ],
    videoUrl: "/work/restaurant-app.mp4",
    posterUrl: "/work/restaurant-app.jpg",
    repositoryUrl: "https://github.com/Golden-alt933/Wrapchikkkkkkkkkkkk",
    brief:
      "One campus kitchen can cook fifteen orders at a time, and hundreds of students order at 1 PM. The app had to take every order it could, never overbook the kitchen and tell each student honestly how long they would wait.",
    approach:
      "Instead of a “Closed” sign there are three tiers: the kitchen, a paid queue and a waitlist, so every order has a place. The kitchen ETA comes from queue position and is recalculated as the queue moves. One coordinator per restaurant means two students paying in the same millisecond can never overbook the kitchen, and a double-tap on a flaky campus network never places two orders.",
    outcome:
      "The busiest hour of the day stays orderly: the kitchen is never overbooked, a double-tap never becomes a second order, and every student sees a wait time they can trust.",
    role: "Design and full-stack development, as a team",
    skills: [
      "Real-time systems that stay correct under load",
      "Mobile apps in Expo and React Native",
      "Serverless back ends on Cloudflare Workers, Durable Objects and D1",
    ],
    tools: ["Expo", "React Native", "Cloudflare Workers", "Durable Objects", "D1"],
  },
  {
    slug: "friday-agent",
    title: "FRIDAY",
    category: "code",
    number: "05",
    tagline: "A voice-driven desktop agent that listens, plans and gets real work done on your computer, private by default.",
    tags: ["Python", "Voice AI", "Agents"],
    format: "Desktop agent",
    previewTitle: "FRIDAY",
    previewSubtitle: "HEY FRI.",
    tone: "slate",
    sample: false,
    year: "2026",
    highlight: "Voice AI agent",
    stats: [
      { value: "17", label: "skills it can run" },
      { value: "Voice", label: "text or GUI input" },
      { value: "Local", label: "first, cloud only on request" },
    ],
    videoUrl: "/work/friday.mp4",
    posterUrl: "/work/friday.jpg",
    repositoryUrl: "https://github.com/MicrosoftStudentChapter/friday-agent",
    brief:
      "Build an assistant that does real work on a computer, not just answers questions, without sending everything you say to the cloud.",
    approach:
      "Say “hey Friday” and it transcribes your speech, works out the intent, plans the turn, runs a skill and answers out loud. It can drive a signed-in Chrome in a tab group of its own. Models run locally by default, cloud models only when you switch them on, and a privacy guard masks personal details first. All seventeen skills share one contract, so a new skill is a single subclass, and any browser action that types into a page asks for confirmation.",
    outcome:
      "A working agent with seventeen skills that takes voice, text or GUI input, with privacy and safety checks built in from the start.",
    role: "Design and development",
    skills: [
      "AI agents that plan and use real tools",
      "Local-first AI with Whisper, Piper and Ollama",
      "Desktop apps in Python and PyQt6",
      "Privacy and safety designed in, not added later",
    ],
    tools: ["Python 3.13", "PyQt6", "Whisper", "Piper TTS", "Ollama"],
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
    brief:
      "Add a web project with a live link, screenshots and what it had to do.",
    approach:
      "Explain the design, accessibility, performance and development choices behind the experience.",
    outcome: "Add what the project achieved.",
    role: "Add the parts you owned and delivered.",
    skills: [],
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
