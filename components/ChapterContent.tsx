"use client";

import type { LawNode } from "@/lib/law/types";

interface ChapterContentProps {
  chapter: LawNode | null;
}

export default function ChapterContent({ chapter }: ChapterContentProps) {
  if (!chapter) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-base text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Sélectionnez un livre puis un chapitre pour afficher son contenu.
      </div>
    );
  }

  const sections =
    chapter.children?.filter((child) => child.kind === "section") ?? [];
  const directArticles =
    chapter.children?.filter((child) => child.kind === "article") ?? [];

  return (
    <div className="h-full overflow-y-auto rounded-lg border border-zinc-200 bg-white px-4 py-4 text-base leading-relaxed dark:border-zinc-800 dark:bg-zinc-900 md:px-6 md:py-5">
      <header className="mb-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">{chapter.label}</h2>
        {chapter.heading && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {chapter.heading}
          </p>
        )}
        {chapter.articlesRange && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {chapter.articlesRange}
          </p>
        )}
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}

        {!!directArticles.length && (
          <div className="space-y-4">
            {directArticles.map((article) => (
              <ArticleBlock key={article.id} article={article} />
            ))}
          </div>
        )}

        {!sections.length && !directArticles.length && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aucun contenu disponible pour ce chapitre.
          </p>
        )}
      </div>
    </div>
  );
}

interface SectionBlockProps {
  section: LawNode;
}

function SectionBlock({ section }: SectionBlockProps) {
  const articles =
    section.children?.filter((child) => child.kind === "article") ?? [];

  return (
    <section className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
      <h3 className="text-base font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        {section.label}
      </h3>
      {section.heading && (
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {section.heading}
        </p>
      )}
      {section.articlesRange && (
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
          {section.articlesRange}
        </p>
      )}
      <div className="mt-3 space-y-4">
        {articles.map((article) => (
          <ArticleBlock key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

interface ArticleBlockProps {
  article: LawNode;
}

function ArticleBlock({ article }: ArticleBlockProps) {
  const paragraphs =
    article.children?.filter((child) => child.kind === "paragraph") ?? [];

  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-base transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500">
      <h4 className="text-base font-semibold">
        {article.label}
        {article.heading ? ` – ${article.heading}` : null}
      </h4>
      {paragraphs.length > 0 ? (
        <div className="mt-2 space-y-3">
          {paragraphs.map((para) => (
            <div
              key={para.id}
              className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
            >
              {para.label && (
                <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">
                  {para.label}
                </div>
              )}
              {para.content && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {para.content}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        article.content && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {article.content}
          </p>
        )
      )}
    </article>
  );
}

