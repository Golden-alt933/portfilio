import type { CSSProperties } from "react";
import { CREATE_GLYPHS, CREATE_HEIGHT, CREATE_WIDTH } from "./wordmark";
import "./create-wordmark.css";

/** Scroll draws original contours before revealing the filled closing wordmark. */
export function CreateWordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`create-wordmark ${className}`}
      viewBox={`-3 -3 ${CREATE_WIDTH + 6} ${CREATE_HEIGHT + 6}`}
      aria-hidden="true"
      focusable="false"
    >
      {CREATE_GLYPHS.map((glyph, index) => (
        <path
          key={index}
          data-letter={glyph.letter}
          d={glyph.path}
          transform={`translate(${glyph.x} 0)`}
          pathLength="1"
          fillRule="evenodd"
          style={{ "--letter-order": index } as CSSProperties}
        />
      ))}
    </svg>
  );
}
