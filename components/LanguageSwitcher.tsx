"use client";

import { useState } from "react";
import { useI18n, type AppLocale } from "@/lib/i18n";

/** Paths to small SVG flags stored under `public/flags`. */
const FLAG_SRC: Record<AppLocale, string> = {
  fr: "/flags/fr.svg",
  de: "/flags/de.svg",
};

interface LanguageOption {
  code: AppLocale;
  label: string;
}

const OPTIONS: LanguageOption[] = [
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

/**
 * LanguageSwitcher — compact toggle used in the main header to let users
 * choose the UI language independently from the document languages.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-slate-100 shadow-sm hover:border-blue-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm bg-slate-800">
          <img
            src={FLAG_SRC[locale]}
            alt={locale === "de" ? "Deutsch" : "Français"}
            className="h-full w-auto"
          />
        </span>
        <span className="font-medium">
          {OPTIONS.find((o) => o.code === locale)?.label ?? locale}
        </span>
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-slate-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur-sm">
          {OPTIONS.map((opt) => {
            const active = opt.code === locale;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLocale(opt.code);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition",
                  active
                    ? "bg-blue-600/80 text-white"
                    : "hover:bg-slate-800/80 hover:text-white",
                ].join(" ")}
              >
                <span className="inline-flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm bg-slate-800">
                  <img
                    src={FLAG_SRC[opt.code]}
                    alt={opt.code === "de" ? "Deutsch" : "Français"}
                    className="h-full w-auto"
                  />
                </span>
                <span className="font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

