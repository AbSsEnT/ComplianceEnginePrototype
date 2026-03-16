"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LawSource,
  BookmarkEntry,
  RecentBookVisit,
  LawReference,
  ChatConversation,
  TimestampedChatMessage,
} from "@/lib/law/types";
import DocumentWithChat from "@/components/DocumentWithChat";
import HomeDashboard from "@/components/HomeDashboard";
import SearchView, { type SearchResult } from "@/components/SearchView";
import ChatView from "@/components/ChatView";
import { lawSources } from "./data/libraryCatalog";
import {
  House,
  Library,
  Search,
  Bookmark,
  MessageSquare,
  Shield,
  HelpCircle,
  Keyboard,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/** Which view occupies the main content area. */
type ActiveView = "home" | "documents" | "search" | "chat";

/** Which side tool panel is open (only relevant in the documents view). */
type SideTool = "bookmarks" | "none";

/**
 * Represents a deep-link target for the document viewer.
 * _signal is a monotonic counter so clicking the same result twice still triggers navigation.
 */
type DocNavTarget = {
  articleId: string;
  paragraphId?: string;
  _signal: number;
};

const MAX_RECENT_BOOKS = 10;

export default function Home() {
  // ── View & navigation state ──
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [sideTool, setSideTool] = useState<SideTool>("none");
  const [booksHomeSignal, setBooksHomeSignal] = useState(0);

  // ── Lifted shared state ──
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [recentBooks, setRecentBooks] = useState<RecentBookVisit[]>([]);

  // Deep-link target: when non-null, DocumentWithChat will navigate to this article/paragraph
  const [docNavTarget, setDocNavTarget] = useState<DocNavTarget | null>(null);

  // ── Multi-conversation chat state ──
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  /**
   * Flat list of all messages across conversations, for backward compat
   * with components like QuickChat that show a combined view.
   * The active conversation's messages are what matters most.
   */
  const activeMessages =
    conversations.find((c) => c.id === activeConversationId)?.messages ?? [];

  /** Update messages for the active conversation (used by QuickChat). */
  const setActiveMessages = useCallback(
    (msgs: TimestampedChatMessage[]) => {
      if (!activeConversationId) {
        // Auto-create a conversation when QuickChat sends the first message
        const newConvo: ChatConversation = {
          id: `conv-${Date.now()}`,
          title:
            msgs.find((m) => m.sender === "user")?.text.slice(0, 50) ??
            "Nouvelle conversation",
          messages: msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((prev) => [newConvo, ...prev]);
        setActiveConversationId(newConvo.id);
        return;
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: msgs,
                title:
                  msgs.find((m) => m.sender === "user")?.text.slice(0, 50) ??
                  c.title,
                updatedAt: Date.now(),
              }
            : c,
        ),
      );
    },
    [activeConversationId],
  );

  /**
   * Global keyboard shortcuts.
   *
   * Design goals for shortcuts:
   * - Keep Ctrl+K / Cmd+K as the primary way to open the search view.
   * - Add consistent shortcuts for all main features so power users can
   *   navigate without touching the mouse.
   *
   * Current mappings (Windows / Linux use Ctrl, macOS uses Cmd):
   * - Ctrl / Cmd + K           → Open the search view.
   * - Ctrl / Cmd + Shift + H   → Go to the Home dashboard.
   * - Ctrl / Cmd + Shift + L   → Go to the Library (documents view).
   * - Ctrl / Cmd + Shift + B   → Toggle the bookmarks panel inside documents.
   * - Ctrl / Cmd + Shift + A   → Open the Assistant chat view.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrimaryModifier = e.metaKey || e.ctrlKey;

      if (!isPrimaryModifier) {
        return;
      }

      // Normalize the key to lowercase so shortcuts work regardless of Caps Lock.
      const key = e.key.toLowerCase();

      // Search palette: keep the existing, simple Ctrl+K / Cmd+K behavior.
      if (!e.shiftKey && key === "k") {
        e.preventDefault();
        setActiveView("search");
        setSideTool("none");
        return;
      }

      // From here on, we use Ctrl/Cmd + Shift + <key> for other features.
      if (!e.shiftKey) {
        return;
      }

      // Home dashboard
      if (key === "h") {
        e.preventDefault();
        setActiveView("home");
        setSideTool("none");
        setDocNavTarget(null);
        return;
      }

      // Library / documents view
      if (key === "l") {
        e.preventDefault();
        setActiveView("documents");
        setSideTool("none");
        setBooksHomeSignal((prev) => prev + 1);
        setDocNavTarget(null);
        return;
      }

      // Bookmarks side panel (only meaningful in the documents view).
      if (key === "b") {
        e.preventDefault();
        setActiveView("documents");
        setSideTool((prev) => (prev === "bookmarks" ? "none" : "bookmarks"));
        return;
      }

      // Assistant chat view
      if (key === "a") {
        e.preventDefault();
        setActiveView("chat");
        setSideTool("none");
        setDocNavTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBookVisited = useCallback((visit: RecentBookVisit) => {
    setRecentBooks((prev) => {
      const deduped = prev.filter(
        (v) => !(v.sourceId === visit.sourceId && v.bookId === visit.bookId),
      );
      return [visit, ...deduped].slice(0, MAX_RECENT_BOOKS);
    });
  }, []);

  const handleNavigateToBook = useCallback(
    (sourceId: string, bookId: string) => {
      setActiveView("documents");
      setSideTool("none");
      setBooksHomeSignal((prev) => prev + 1);
      setDocNavTarget(null);
    },
    [],
  );

  const handleNavigateToBookmark = useCallback((ref: LawReference) => {
    setActiveView("documents");
    setSideTool("none");
    setDocNavTarget(null);
  }, []);

  const handleNavigateToSearchResult = useCallback((result: SearchResult) => {
    setDocNavTarget({
      articleId: result.articleId,
      paragraphId: result.paragraphId,
      _signal: Date.now(),
    });
    setActiveView("documents");
    setSideTool("none");
  }, []);

  /** Navigate from the chat source panel to the Bibliothèque at a specific article. */
  const handleChatOpenInLibrary = useCallback((ref: LawReference) => {
    setDocNavTarget({
      articleId: ref.articleId,
      paragraphId: ref.paragraphId,
      _signal: Date.now(),
    });
    setActiveView("documents");
    setSideTool("none");
  }, []);

  /** Open the full chat view from the dashboard QuickChat widget. */
  const handleOpenFullChat = useCallback(() => {
    setActiveView("chat");
  }, []);

  const handleOpenLibrary = useCallback(() => {
    setActiveView("documents");
    setSideTool("none");
    setBooksHomeSignal((prev) => prev + 1);
    setDocNavTarget(null);
  }, []);

  return (
    <main className="flex h-screen flex-col bg-background font-sans text-foreground">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between bg-slate-900 px-4 py-3 md:px-8">
        <div className="ml-14 flex items-center gap-3 md:ml-16">
          <button
            type="button"
            onClick={() => {
              setActiveView("home");
              setSideTool("none");
              setDocNavTarget(null);
            }}
            className="group flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Retour à l'accueil SafeLink"
          >
            <Shield className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              SafeLink
            </h1>
            <p className="text-xs text-slate-400">
              Corpus réglementaires · Sécurité incendie
            </p>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-14 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-900">
          <nav className="flex flex-col items-center gap-1 py-3">
            <SidebarButton
              icon={<House className="h-5 w-5" />}
              label="Accueil (Ctrl+Shift+H)"
              active={activeView === "home"}
              onClick={() => {
                setActiveView("home");
                setSideTool("none");
              }}
            />

            <SidebarButton
              icon={<Library className="h-5 w-5" />}
              label="Bibliothèque (Ctrl+Shift+L)"
              active={activeView === "documents"}
              onClick={() => {
                setActiveView("documents");
                setSideTool("none");
                setBooksHomeSignal((prev) => prev + 1);
                setDocNavTarget(null);
              }}
            />

            <SidebarButton
              icon={<Search className="h-5 w-5" />}
              label="Recherche (Ctrl+K)"
              active={activeView === "search"}
              onClick={() => setActiveView("search")}
            />

            <SidebarButton
              icon={<Bookmark className="h-5 w-5" />}
              label="Signets (Ctrl+Shift+B)"
              active={activeView === "documents" && sideTool === "bookmarks"}
              onClick={() => {
                setActiveView("documents");
                setSideTool((prev) =>
                  prev === "bookmarks" ? "none" : "bookmarks",
                );
              }}
            />

            <SidebarButton
              icon={<MessageSquare className="h-5 w-5" />}
              label="Assistant (Ctrl+Shift+A)"
              active={activeView === "chat"}
              onClick={() => setActiveView("chat")}
            />
          </nav>

          <div className="flex-1" />

          <nav className="flex flex-col items-center gap-1 pb-3">
            <SidebarButton
              icon={<Keyboard className="h-5 w-5" />}
              label="Raccourcis"
              active={false}
              onClick={() => {}}
            />
            <SidebarButton
              icon={<HelpCircle className="h-5 w-5" />}
              label="Aide"
              active={false}
              onClick={() => {}}
            />
          </nav>
        </aside>

        {/* Main content area */}
        <div className="min-w-0 flex-1 overflow-hidden p-4 md:p-6">
          {activeView === "home" && (
            <HomeDashboard
              recentBooks={recentBooks}
              bookmarks={bookmarks}
              chatMessages={activeMessages}
              onChatMessagesChange={setActiveMessages}
              onNavigateToBook={handleNavigateToBook}
              onNavigateToBookmark={handleNavigateToBookmark}
              onOpenFullChat={handleOpenFullChat}
              onOpenLibrary={handleOpenLibrary}
              onOpenSearch={() => setActiveView("search")}
            />
          )}

          {activeView === "search" && (
            <SearchView
              sources={lawSources as LawSource[]}
              onNavigateToResult={handleNavigateToSearchResult}
            />
          )}

          {activeView === "chat" && (
            <ChatView
              conversations={conversations}
              activeConversationId={activeConversationId}
              onConversationsChange={setConversations}
              onActiveConversationIdChange={setActiveConversationId}
              sources={lawSources as LawSource[]}
              onOpenInLibrary={handleChatOpenInLibrary}
            />
          )}

          {activeView === "documents" && (
            <DocumentWithChat
              sources={lawSources as LawSource[]}
              booksHomeSignal={booksHomeSignal}
              isBookmarksPanelOpen={sideTool === "bookmarks"}
              bookmarks={bookmarks}
              onBookmarksChange={setBookmarks}
              onBookVisited={handleBookVisited}
              navTarget={docNavTarget}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* ── SidebarButton ── */

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarButton({ icon, label, active, onClick }: SidebarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg transition"
            aria-label={label}
          />
        }
      >
        {active && (
          <span className="absolute -left-[7px] top-1.5 h-5 w-[3px] rounded-full bg-blue-500" />
        )}
        <span
          className={
            active
              ? "text-white"
              : "text-slate-400 transition group-hover:text-white"
          }
        >
          {icon}
        </span>
        {active && (
          <span className="absolute inset-0 rounded-lg bg-white/10" />
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
