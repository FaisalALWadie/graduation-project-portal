"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Database } from "@/types/database";

type ActivityEntry = Database["public"]["Tables"]["activity_log"]["Row"];

const ACTION_ICON: Record<string, string> = {
  task_created: "📝",
  task_status_changed: "🔄",
  comment_added: "💬",
  document_uploaded: "📄",
  milestone_approved: "🏁",
  note_posted: "🗒️",
};

export function ActivityFeed({
  teamId,
  initialEntries,
}: {
  teamId: string;
  initialEntries: ActivityEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // @supabase/ssr's browser client resolves the session from cookies
    // asynchronously. Subscribing before that finishes attaches the
    // realtime websocket with no auth token, so RLS silently drops every
    // event (the channel still reports SUBSCRIBED - it just never
    // receives anything). Explicitly wait for the session and set
    // realtime auth before subscribing.
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`activity-${teamId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_log",
            filter: `team_id=eq.${teamId}`,
          },
          (payload) => {
            setEntries((prev) => [payload.new as ActivityEntry, ...prev].slice(0, 20));
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [teamId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" description="Team actions will appear here in real time." />
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-sm">
                <span aria-hidden>{ACTION_ICON[e.action_type] ?? "•"}</span>
                <div>
                  <p>{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
