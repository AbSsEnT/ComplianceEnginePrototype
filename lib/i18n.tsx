import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Supported UI languages for the SafeLink interface.
 *
 * Note: this only controls the application chrome (labels, buttons, helper
 * text). Regulatory documents themselves remain in their original language.
 */
export type AppLocale = "fr" | "de";

/** Shape of the translation dictionary for strongly‑typed lookups. */
type Messages = {
  common: {
    appName: string;
    appTagline: string;
    home: string;
    library: string;
    search: string;
    bookmarks: string;
    assistant: string;
    shortcuts: string;
    help: string;
  };
  chat: {
    quickEmptyPrompt: string;
    quickPlaceholder: string;
    quickOpenFull: string;
    quickThinking: string;
    fullNewConversation: string;
    fullNoConversations: string;
    fullSourcesTitle: string;
    fullSourcesAll: string;
    fullSourcesNoneSelected: string;
    fullSourcesSomeSelected: (count: number) => string;
    fullFilterAll: string;
    fullFilterNone: string;
    fullEmptyTitle: string;
    fullEmptySubtitle: string;
    fullTyping: string;
    fullTextareaPlaceholder: string;
    fullTextareaHint: string;
    fullScrollDown: string;
    fullErrorGeneric: string;
    quickErrorGeneric: string;
  };
  home: {
    welcomeTitle: string;
    welcomeBody: string;
    btnLibrary: string;
    btnSearch: string;
    recentBooks: string;
    noRecentBooks: string;
    exploreLibrary: string;
    recentBookmarks: string;
    noBookmarks: string;
    addBookmarksHint: string;
    quickAssistant: string;
  };
  library: {
    breadcrumbRoot: string;
    noChapters: string;
  };
  sourcePanel: {
    header: string;
    notFoundTitle: string;
    notFoundRefPrefix: string;
    closeImage: string;
    openInLibrary: string;
  };
};

/**
 * French base messages. These were written to match the existing hard‑coded
 * French strings so the UI behavior stays identical while we introduce
 * proper i18n support.
 */
const fr: Messages = {
  common: {
    appName: "SafeLink",
    appTagline: "Corpus réglementaires · Sécurité incendie",
    home: "Accueil (Ctrl+Shift+H)",
    library: "Bibliothèque (Ctrl+Shift+L)",
    search: "Recherche (Ctrl+K)",
    bookmarks: "Signets (Ctrl+Shift+B)",
    assistant: "Assistant (Ctrl+Shift+A)",
    shortcuts: "Raccourcis",
    help: "Aide",
  },
  chat: {
    quickEmptyPrompt: "Posez une question pour commencer.",
    quickPlaceholder: "Question rapide...",
    quickOpenFull: "Ouvrir l'assistant complet",
    quickThinking: "Réflexion…",
    fullNewConversation: "Nouvelle conversation",
    fullNoConversations: "Aucune conversation.",
    fullSourcesTitle: "Sources consultées",
    fullSourcesAll: "Toutes les sources",
    fullSourcesNoneSelected: "Aucune source sélectionnée",
    fullSourcesSomeSelected: (count: number) =>
      `${count} livre${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`,
    fullFilterAll: "Tout",
    fullFilterNone: "Aucun",
    fullEmptyTitle: "Comment puis-je vous aider ?",
    fullEmptySubtitle: "Posez une question sur les corpus réglementaires.",
    fullTyping: "Réflexion en cours…",
    fullTextareaPlaceholder:
      "Posez votre question sur les règlements...",
    fullTextareaHint: "Entrée pour envoyer · Maj+Entrée pour un saut de ligne",
    fullScrollDown: "Défiler vers le bas",
    fullErrorGeneric: "Une erreur est survenue. Réessayez.",
    quickErrorGeneric: "Une erreur est survenue.",
  },
  home: {
    welcomeTitle: "Bienvenue sur SafeLink",
    welcomeBody:
      "Naviguez dans les corpus réglementaires, interrogez l'assistant et retrouvez vos passages importants.",
    btnLibrary: "Bibliothèque",
    btnSearch: "Rechercher",
    recentBooks: "Livres récents",
    noRecentBooks: "Aucun livre consulté récemment.",
    exploreLibrary: "Explorer la bibliothèque",
    recentBookmarks: "Signets récents",
    noBookmarks: "Aucun signet enregistré.",
    addBookmarksHint: "Ajoutez-en en lisant les articles.",
    quickAssistant: "Assistant rapide",
  },
  library: {
    breadcrumbRoot: "Bibliothèque",
    noChapters: "Aucun chapitre défini pour ce livre pour le moment.",
  },
  sourcePanel: {
    header: "Source",
    notFoundTitle: "Source introuvable dans la bibliothèque.",
    notFoundRefPrefix: "Référence :",
    closeImage: "Fermer",
    openInLibrary: "Ouvrir dans la Bibliothèque",
  },
};

/**
 * German UI messages. Document content stays in its original language; only
 * the chrome and helper text are translated here.
 */
const de: Messages = {
  common: {
    appName: "SafeLink",
    appTagline: "Rechtsgrundlagen · Brandschutz",
    home: "Startseite (Strg+Shift+H)",
    library: "Bibliothek (Strg+Shift+L)",
    search: "Suche (Strg+K)",
    bookmarks: "Lesezeichen (Strg+Shift+B)",
    assistant: "Assistent (Strg+Shift+A)",
    shortcuts: "Tastenkürzel",
    help: "Hilfe",
  },
  chat: {
    quickEmptyPrompt: "Stellen Sie eine Frage, um zu beginnen.",
    quickPlaceholder: "Schnelle Frage…",
    quickOpenFull: "Vollständigen Assistenten öffnen",
    quickThinking: "Denke nach…",
    fullNewConversation: "Neues Gespräch",
    fullNoConversations: "Keine Unterhaltungen.",
    fullSourcesTitle: "Genutzte Quellen",
    fullSourcesAll: "Alle Quellen",
    fullSourcesNoneSelected: "Keine Quelle ausgewählt",
    fullSourcesSomeSelected: (count: number) =>
      `${count} Band${count > 1 ? "e" : ""} ausgewählt`,
    fullFilterAll: "Alle",
    fullFilterNone: "Keine",
    fullEmptyTitle: "Wie kann ich helfen?",
    fullEmptySubtitle:
      "Stellen Sie eine Frage zu den Rechtsgrundlagen.",
    fullTyping: "Denke nach…",
    fullTextareaPlaceholder:
      "Stellen Sie Ihre Frage zu den Vorschriften…",
    fullTextareaHint:
      "Enter zum Senden · Shift+Enter für einen Zeilenumbruch",
    fullScrollDown: "Nach unten scrollen",
    fullErrorGeneric: "Es ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    quickErrorGeneric: "Es ist ein Fehler aufgetreten.",
  },
  home: {
    welcomeTitle: "Willkommen bei SafeLink",
    welcomeBody:
      "Navigieren Sie in den Rechtsgrundlagen, fragen Sie den Assistenten und finden Sie Ihre wichtigsten Stellen wieder.",
    btnLibrary: "Bibliothek",
    btnSearch: "Suche",
    recentBooks: "Zuletzt geöffnete Bücher",
    noRecentBooks: "In letzter Zeit wurden keine Bücher geöffnet.",
    exploreLibrary: "Bibliothek öffnen",
    recentBookmarks: "Aktuelle Lesezeichen",
    noBookmarks: "Keine Lesezeichen gespeichert.",
    addBookmarksHint: "Fügen Sie welche beim Lesen von Artikeln hinzu.",
    quickAssistant: "Schneller Assistent",
  },
  library: {
    breadcrumbRoot: "Bibliothek",
    noChapters: "Für dieses Buch sind noch keine Kapitel definiert.",
  },
  sourcePanel: {
    header: "Quelle",
    notFoundTitle: "Quelle nicht in der Bibliothek gefunden.",
    notFoundRefPrefix: "Referenz:",
    closeImage: "Schließen",
    openInLibrary: "In der Bibliothek öffnen",
  },
};

const messagesByLocale: Record<AppLocale, Messages> = {
  fr,
  de,
};

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "safelink-ui-locale";

/**
 * I18nProvider keeps track of the current UI language and exposes a typed
 * translation object to components via React context.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("fr");

  // On first mount, try to restore the last locale from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as
        | AppLocale
        | null;
      if (stored === "fr" || stored === "de") {
        setLocaleState(stored);
      }
    } catch {
      // If storage is unavailable, silently ignore and keep the default.
    }
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the in‑memory state is enough for this session.
    }
  }, []);

  const t = useMemo(() => messagesByLocale[locale], [locale]);

  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook used by components to access the current UI language and translations.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

