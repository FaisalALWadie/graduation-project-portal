"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ListTodo, FileText, CalendarClock, Loader2 } from "lucide-react";
import { searchTeamContent, type SearchResults } from "@/lib/actions/search";

const EMPTY_RESULTS: SearchResults = { tasks: [], documents: [], meetings: [] };

export function GlobalSearch({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // The dropdown only ever renders results when trimmedQuery.length >= 2
  // (see the guard below), so there's nothing to clear when the query
  // drops below that - the effect just does nothing, avoiding a
  // synchronous setState call in the effect body for that case. The
  // real search itself is a setTimeout callback (an external-system
  // subscription) whose own callback sets state on completion, which
  // is exactly the pattern the set-state-in-effect rule allows.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timeout = setTimeout(() => {
      searchTeamContent(teamId, trimmed)
        .then(setResults)
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, teamId]);

  const hasResults =
    results.tasks.length > 0 || results.documents.length > 0 || results.meetings.length > 0;
  const trimmedQuery = query.trim();

  function go(href: string) {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setIsOpen(true);
            setIsSearching(value.trim().length >= 2);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tasks, documents, meetings..."
          className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isSearching && (
          <Loader2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && trimmedQuery.length >= 2 && (
        <div className="absolute top-full right-0 z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          {!isSearching && !hasResults && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results for &quot;{trimmedQuery}&quot;.
            </p>
          )}

          {results.tasks.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Tasks</p>
              {results.tasks.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => go(r.href)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <ListTodo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}

          {results.documents.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Documents</p>
              {results.documents.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => go(r.href)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}

          {results.meetings.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Meetings</p>
              {results.meetings.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => go(r.href)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">{r.title}</p>
                    {r.snippet && (
                      <p className="truncate text-xs text-muted-foreground">{r.snippet}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
