import LawViewer from "@/components/LawViewer";
import type { LawBook } from "@/lib/law/types";
import livres from "./data/erp_livre1.json";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex w-full flex-1 flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Règlement de sécurité ERP
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sélectionnez un livre puis un chapitre pour afficher son contenu.
          </p>
        </header>
        <LawViewer books={livres as LawBook[]} />
      </div>
    </main>
  );
}