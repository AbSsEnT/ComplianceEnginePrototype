"use client";

/**
 * WaterDropMascot — an animated water droplet with eyes.
 * Used as the identity for the SafeLink AI assistant, embodying
 * the "water vs fire" brand concept.
 *
 * Supports three sizes and an optional "thinking" animation state.
 */

import { cn } from "@/lib/utils";

interface WaterDropMascotProps {
  /** Predefined size presets. */
  size?: "sm" | "md" | "lg";
  /** Whether the mascot is in "thinking" mode (faster bob + squinty eyes). */
  thinking?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: "h-7 w-7", svg: "h-5 w-5" },
  md: { container: "h-9 w-9", svg: "h-7 w-7" },
  lg: { container: "h-12 w-12", svg: "h-9 w-9" },
} as const;

export default function WaterDropMascot({
  size = "sm",
  thinking = false,
  className,
}: WaterDropMascotProps) {
  const s = sizes[size];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full drop-shadow-md",
        s.container,
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          s.svg,
          thinking ? "animate-[bob_0.8s_ease-in-out_infinite]" : "animate-[bob_2.4s_ease-in-out_infinite]",
        )}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="dropGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
        </defs>

        {/* Water drop body — teardrop shape with gradient fill */}
        <path
          d="M32 4 C32 4 10 30 10 42 C10 54.15 19.85 62 32 62 C44.15 62 54 54.15 54 42 C54 30 32 4 32 4Z"
          fill="url(#dropGrad)"
        />
        {/* Highlight / shine on the drop */}
        <path
          d="M32 8 C32 8 14 32 14 42 C14 52 21.5 58 32 58"
          className="stroke-blue-300/60"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="22"
          cy="34"
          rx="4"
          ry="5"
          className="fill-blue-300/30"
        />

        {/* Left eye */}
        <g className={thinking ? "" : "animate-[blink_4s_ease-in-out_infinite]"}>
          <ellipse
            cx="24"
            cy={thinking ? "42" : "42"}
            rx="4.5"
            ry={thinking ? "3" : "5"}
            className="fill-white"
          />
          <ellipse
            cx="25"
            cy={thinking ? "42" : "42"}
            rx="2.2"
            ry={thinking ? "1.8" : "2.8"}
            className="fill-slate-800"
          />
          {/* Eye shine */}
          <circle cx="26" cy={thinking ? "41" : "40"} r="1" className="fill-white" />
        </g>

        {/* Right eye */}
        <g className={thinking ? "" : "animate-[blink_4s_ease-in-out_infinite_0.15s]"}>
          <ellipse
            cx="40"
            cy={thinking ? "42" : "42"}
            rx="4.5"
            ry={thinking ? "3" : "5"}
            className="fill-white"
          />
          <ellipse
            cx="41"
            cy={thinking ? "42" : "42"}
            rx="2.2"
            ry={thinking ? "1.8" : "2.8"}
            className="fill-slate-800"
          />
          {/* Eye shine */}
          <circle cx="42" cy={thinking ? "41" : "40"} r="1" className="fill-white" />
        </g>

        {/* Mouth — small friendly smile */}
        <path
          d={thinking ? "M28 50 Q32 51 36 50" : "M26 49 Q32 54 38 49"}
          className="stroke-slate-700"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
