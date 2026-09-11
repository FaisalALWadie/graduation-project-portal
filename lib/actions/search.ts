"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-role";

const searchInputSchema = z.object({
  teamId: z.uuid(),
  query: z.string().trim().min(2).max(100),
});

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  href: string;
};

export type SearchResults = {
  tasks: SearchResult[];
  documents: SearchResult[];
  meetings: SearchResult[];
};

// RLS already scopes every one of these tables' SELECT policies to the
// caller's own team - the explicit .eq("team_id", ...) below is
// defense-in-depth, same pattern as the rest of this app. Admin can
// search any team (matches every other admin capability); everyone
// else can only search their own.
export async function searchTeamContent(
  teamId: string,
  query: string,
): Promise<SearchResults> {
  const profile = await requireProfile();
  const parsed = searchInputSchema.parse({ teamId, query });
  if (profile.role !== "admin" && profile.team_id !== parsed.teamId) {
    throw new Error("That's not your team.");
  }

  const supabase = await createClient();
  const tsQuery = parsed.query
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" & ");

  const [{ data: tasks }, { data: documents }, { data: meetings }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description")
      .eq("team_id", parsed.teamId)
      .textSearch("search_vector", tsQuery, { config: "english" })
      .limit(5),
    supabase
      .from("documents")
      .select("id, title")
      .eq("team_id", parsed.teamId)
      .textSearch("search_vector", tsQuery, { config: "english" })
      .limit(5),
    supabase
      .from("meeting_logs")
      .select("id, summary, meeting_date")
      .eq("team_id", parsed.teamId)
      .textSearch("search_vector", tsQuery, { config: "english" })
      .limit(5),
  ]);

  const homeBase = profile.role === "admin" ? `/admin/teams/${parsed.teamId}` : `/${profile.role}`;

  // /student's Kanban can open a task's edit dialog directly from a
  // query param; advisor/admin only have a read-only task list
  // (team-progress.tsx), which can scroll-to-and-highlight instead.
  const taskParam = profile.role === "student" ? "openTask" : "highlightTask";
  const taskHref = profile.role === "student" ? "/student" : homeBase;

  return {
    tasks: (tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      snippet: t.description ?? "",
      href: `${taskHref}?${taskParam}=${t.id}`,
    })),
    documents: (documents ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      snippet: "",
      href: `${homeBase}/documents?highlightDoc=${d.id}`,
    })),
    meetings: (meetings ?? []).map((m) => ({
      id: m.id,
      title: `Meeting - ${new Date(m.meeting_date).toLocaleDateString()}`,
      snippet: m.summary,
      href: `${homeBase}/meetings?highlightMeeting=${m.id}`,
    })),
  };
}
