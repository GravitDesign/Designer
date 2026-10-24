/**
 * The GravitDesign Next mark and wordmark (public/brand/mark.svg drawn
 * inline, so the ring takes the text colour: dark on light, light on
 * dark). The wordmark is "Gravit" bold, "Design" regular and "Next" in a
 * selection box with four corner handles; next.css styles it.
 */
import { useId, type ReactNode } from "react";

/** The old Gravit sphere as a planet, with a tilted ring and a square anchor node. */
export function BrandMark({ className = "gd-mark" }: { className?: string }): ReactNode {
  // Ids must be unique in the page (the mark can be on screen twice) and
  // usable inside url(#...), so the React id is reduced to plain characters.
  const id = "gdm" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sphere = id + "-sphere";
  const front = id + "-front";
  const gap = id + "-gap";
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={sphere}>
          <circle cx="785.88" cy="679.0" r="481.8" />
        </clipPath>
        <clipPath id={front}>
          <rect x="-64" y="128" width="384" height="192" />
        </clipPath>
        <mask id={gap} maskUnits="userSpaceOnUse" x="-64" y="-64" width="384" height="384">
          <rect x="-64" y="-64" width="384" height="384" fill="#fff" />
          <circle cx="123" cy="128" r="80" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${gap})`}>
        <g transform="rotate(-22 123 128)">
          <ellipse
            cx="123"
            cy="128"
            rx="112"
            ry="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
          />
        </g>
      </g>
      <g transform="translate(123 128) scale(0.15359) translate(-785.88 -679.0)">
        <g clipPath={`url(#${sphere})`}>
          <rect x="0" y="0" width="1600" height="1400" fill="#FFD81F" />
          <path
            d="M727 60 L727.6 200.5 L307.7 616.5 L60 700 L60 1300 L753.2 1300 L753.2 1159.6 C754.5 882.6 849.9 536.6 996.7 245.5 L996.7 60 Z"
            fill="#E3136B"
          />
          <path d="M308.2 616.5 L728.6 200.5 L600 60 L60 60 L60 616.5 Z" fill="#C3DB4E" />
          <path d="M307.3 623.1 L60 623 L60 700.4 L304.5 700.4 L619.9 347.1 Z" fill="#6E9A34" />
          <path
            d="M619.9 347.1 L304.5 700.4 L60 700.4 L60 900 L342.4 867.8 L757 226 Z"
            fill="#C3DB4E"
          />
          <path
            d="M1300 700 L1259.3 768.5 C1206.1 807.6 1151.5 851.1 1103.9 895.8 C995.8 997.3 933.6 1076.8 864.5 1154.3 L864.5 1300 L1300 1300 Z"
            fill="#6E9A34"
          />
        </g>
      </g>
      <g transform="rotate(-22 123 128)">
        <g clipPath={`url(#${front})`}>
          <ellipse
            cx="123"
            cy="128"
            rx="112"
            ry="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
          />
        </g>
        <rect
          x="215.52"
          y="125.12"
          width="28"
          height="28"
          rx="4"
          fill="#E3136B"
          stroke="currentColor"
          strokeWidth="8"
          transform="rotate(22 229.52 139.12)"
        />
      </g>
    </svg>
  );
}

/** "Gravit" "Design" [Next]: the wordmark, as text (Manrope, next.css). */
export function BrandWordmark(): ReactNode {
  return (
    <span className="gd-word" aria-label="GravitDesign Next">
      <b>Gravit</b>
      <span>Design</span>
      <span className="gd-next">
        Next
        <span className="gd-handle gd-tl" />
        <span className="gd-handle gd-tr" />
        <span className="gd-handle gd-bl" />
        <span className="gd-handle gd-br" />
      </span>
    </span>
  );
}

/** Mark and wordmark side by side. */
export function BrandLockup({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={"gd-lockup" + (className ? " " + className : "")}>
      <BrandMark />
      <BrandWordmark />
    </div>
  );
}
