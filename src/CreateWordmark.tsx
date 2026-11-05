import type { CSSProperties } from "react";
import { CREATE_GLYPHS, CREATE_HEIGHT, CREATE_WIDTH } from "./wordmark";
import "./create-wordmark.css";

const GLYPH_WIDTHS = [204, 200, 174, 230, 200, 174];

/** Drafting lines that sweep in before the letters are traced. */
function guideLines() {
  const lines: { d: string; kind: "h" | "v" | "c" | "d" }[] = [];
  const overshoot = 260;
  for (const y of [0, 37, 125, 213, 250]) {
    lines.push({ kind: "h", d: `M${-overshoot} ${y}H${CREATE_WIDTH + overshoot}` });
  }
  CREATE_GLYPHS.forEach((glyph, index) => {
    for (const x of [glyph.x, glyph.x + GLYPH_WIDTHS[index]]) {
      lines.push({ kind: "v", d: `M${x} -140V${CREATE_HEIGHT + 140}` });
    }
  });
  // Circle through the C bowl and the A's diagonal construction.
  lines.push({ kind: "c", d: "M226 125A125 125 0 1 1 -24 125A125 125 0 1 1 226 125" });
  lines.push({ kind: "d", d: "M528 494L753 -244M978 494L753 -244" });
  return lines;
}

const GUIDES = guideLines();

/** Scroll draws original contours before revealing the filled closing wordmark. */
export function CreateWordmark({
  className = "",
  guides = false,
}: {
  className?: string;
  guides?: boolean;
}) {
  return (
    <svg
      className={`create-wordmark ${className}`}
      viewBox={`-3 -3 ${CREATE_WIDTH + 6} ${CREATE_HEIGHT + 6}`}
      aria-hidden="true"
      focusable="false"
    >
      {guides && (
        <g className="create-wordmark__guides">
          {GUIDES.map((line, index) => (
            <path
              key={index}
              d={line.d}
              data-kind={line.kind}
              pathLength="1"
              style={{ "--guide-order": index % 7 } as CSSProperties}
            />
          ))}
        </g>
      )}
      {CREATE_GLYPHS.map((glyph, index) => (
        <path
          key={index}
          className="create-wordmark__glyph"
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
