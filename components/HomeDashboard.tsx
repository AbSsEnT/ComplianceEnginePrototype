"use client";

/**
 * HomeDashboard — the landing page shown when the Home sidebar button is active.
 * Displays widget cards: welcome hero, recent books, recent bookmarks, and a quick chat.
 */

import type {
  BookmarkEntry,
  LawReference,
  RecentBookVisit,
  TimestampedChatMessage,
} from "@/lib/law/types";
import {
  BookOpen,
  Bookmark,
  Clock,
  Library,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import WaterDropMascot from "./WaterDropMascot";
import QuickChat from "./QuickChat";

interface HomeDashboardProps {
  recentBooks: RecentBookVisit[];
  bookmarks: BookmarkEntry[];
  chatMessages: TimestampedChatMessage[];
  onChatMessagesChange: (msgs: TimestampedChatMessage[]) => void;
  /** Navigate to a specific book in the document viewer */
  onNavigateToBook: (sourceId: string, bookId: string) => void;
  /** Navigate to a specific bookmark target */
  onNavigateToBookmark: (ref: LawReference) => void;
  /** Switch to the full assistant panel */
  onOpenFullChat: () => void;
  /** Open the library view */
  onOpenLibrary: () => void;
  /** Open the search palette */
  onOpenSearch: () => void;
}

function timeAgoShort(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

export default function HomeDashboard({
  recentBooks,
  bookmarks,
  chatMessages,
  onChatMessagesChange,
  onNavigateToBook,
  onNavigateToBookmark,
  onOpenFullChat,
  onOpenLibrary,
  onOpenSearch,
}: HomeDashboardProps) {
  const recentBookmarks = bookmarks.slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        {/* ── Welcome hero ── */}
        <div className="flex items-center gap-5 rounded-xl bg-linear-to-br from-blue-600 to-blue-800 px-8 py-7 text-white shadow-lg">
          <WaterDropMascot size="lg" className="bg-white/20" />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Bienvenue sur SafeLink
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Naviguez dans les corpus réglementaires, interrogez l&apos;assistant
              et retrouvez vos passages importants.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenLibrary}
                className="gap-1.5 bg-white/15 text-white hover:bg-white/25"
              >
                <Library className="h-4 w-4" />
                Bibliothèque
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenSearch}
                className="gap-1.5 bg-white/15 text-white hover:bg-white/25"
              >
                <Search className="h-4 w-4" />
                Rechercher
                <kbd className="ml-1 rounded border border-white/30 px-1 py-0.5 text-[10px]">
                  Ctrl+K
                </kbd>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Widget grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent books */}
          <Card className="flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                Livres récents
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-3">
              {recentBooks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aucun livre consulté récemment.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenLibrary}
                    className="mt-1 gap-1.5"
                  >
                    <Library className="h-3.5 w-3.5" />
                    Explorer la bibliothèque
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentBooks.slice(0, 5).map((visit) => (
                    <button
                      key={`${visit.sourceId}-${visit.bookId}-${visit.visitedAt}`}
                      type="button"
                      onClick={() =>
                        onNavigateToBook(visit.sourceId, visit.bookId)
                      }
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {visit.bookLabel}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {visit.sourceLabel}
                          {visit.heading ? ` · ${visit.heading}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{timeAgoShort(visit.visitedAt)}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent bookmarks */}
          <Card className="flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bookmark className="h-4 w-4 text-amber-600" />
                Signets récents
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-3">
              {recentBookmarks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Bookmark className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aucun signet enregistré.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez-en en lisant les articles.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentBookmarks.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() =>
                        onNavigateToBookmark({
                          articleId: b.articleId,
                          paragraphId: b.paragraphId,
                        })
                      }
                      className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50/50"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                        <Bookmark className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {b.title}
                        </div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {b.excerpt}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick chat — spans full width on large screens, gradient header */}
          <Card className="flex flex-col overflow-hidden pt-0 lg:col-span-2">
            <CardHeader className="border-b border-border bg-linear-to-r from-blue-600 to-blue-500 text-white items-center">
              <CardTitle className="flex items-center gap-2 text-sm text-white">
                <WaterDropMascot size="sm" className="bg-white/20" />
                Assistant rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="h-80">
                <QuickChat
                  messages={chatMessages}
                  onMessagesChange={onChatMessagesChange}
                  onOpenFullChat={onOpenFullChat}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
