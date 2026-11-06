import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

/** True once the element has scrolled into view; stays true. */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView];
}

/**
 * Text whose words rise up from below their own line, one after another,
 * when it comes into view. Each word sits in a clipping mask, so it slides
 * up into place rather than fading over the words around it.
 */
export function RiseText({
  text,
  as = "p",
  className,
  delay = 0,
  stagger = 0.03,
  maxStagger = 0.7,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** Seconds before the first word moves. */
  delay?: number;
  /** Seconds between one word and the next. */
  stagger?: number;
  /** Cap on the total stagger, so long paragraphs don't drag. */
  maxStagger?: number;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  const words = text.split(/\s+/).filter(Boolean);
  const step = Math.min(stagger, maxStagger / Math.max(1, words.length - 1));
  const children: ReactNode[] = [];
  words.forEach((word, index) => {
    if (index) children.push(" ");
    children.push(
      <span className="rise-word" key={index}>
        <span
          style={{ "--rise-delay": `${delay + index * step}s` } as CSSProperties}
        >
          {word}
        </span>
      </span>,
    );
  });
  return createElement(
    as,
    {
      ref,
      className: ["rise", className].filter(Boolean).join(" "),
      "data-in": inView,
    },
    children,
  );
}

/** A block (media, a row of numbers, buttons) that lifts and fades in once in view. */
export function RiseBlock({
  as = "div",
  className,
  delay = 0,
  children,
}: {
  as?: ElementType;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      className: ["rise-block", className].filter(Boolean).join(" "),
      "data-in": inView,
      style: { "--rise-delay": `${delay}s` } as CSSProperties,
    },
    children,
  );
}
