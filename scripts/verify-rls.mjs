// Verifies (a) every table has the expected seed row counts via the
// service-role client, and (b) RLS actually enforces role/team scoping
// by signing in as each demo user and checking what they can and can't
// see/do.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2];
  }
}
loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "GradPortal2026!";
const USERS = {
  admin: "444812573@kku.edu.sa",
  advisor: "advisor.alqahtani@kku.edu.sa",
  student1: "student.alharbi@kku.edu.sa",
  student2: "student.alotaibi@kku.edu.sa",
};

console.log("=== Row counts via service role (bypasses RLS) ===");
for (const table of [
  "profiles", "teams", "tasks", "task_comments", "milestones",
  "documents", "meeting_logs", "advisor_notes",
]) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  console.log(`  ${table.padEnd(15)} ${error ? "ERROR: " + error.message : count}`);
}

async function signInAs(email) {
  const client = createClient(supabaseUrl, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

console.log("\n=== RLS checks per role ===");

const studentClient = await signInAs(USERS.student1);
const { data: student1Self } = await studentClient.auth.getUser();
{
  const { data: tasks, error } = await studentClient.from("tasks").select("id, title, team_id");
  console.log(`student1 sees ${tasks?.length ?? 0} tasks (error: ${error?.message ?? "none"})`);

  const { data: inserted, error: insertErr } = await studentClient
    .from("tasks")
    .insert({
      title: "RLS verification task (safe to delete)",
      team_id: tasks[0].team_id,
      created_by: student1Self.user.id,
    })
    .select()
    .single();
  console.log(`student1 CAN insert a task: ${insertErr ? "NO (" + insertErr.message + ")" : "YES"}`);
  if (inserted) {
    await admin.from("tasks").delete().eq("id", inserted.id);
  }

  const { data: milestones } = await studentClient.from("milestones").select("id").limit(1);
  const { data: updateResult, error: milestoneUpdateErr } = await studentClient
    .from("milestones")
    .update({ status: "approved" })
    .eq("id", milestones[0].id)
    .select();
  const blocked = milestoneUpdateErr || !updateResult || updateResult.length === 0;
  console.log(`student1 direct milestone UPDATE blocked: ${blocked ? "YES" : "NO (unexpected!)"} ${milestoneUpdateErr ? "(" + milestoneUpdateErr.message + ")" : "(0 rows matched by RLS)"}`);
}

const advisorClient = await signInAs(USERS.advisor);
{
  const { data: tasks } = await advisorClient.from("tasks").select("id, title");
  console.log(`advisor sees ${tasks?.length ?? 0} tasks (read-only view)`);

  const { data: advisorTeamId } = await advisorClient.from("teams").select("id").limit(1).single();
  const { data: advisorInsertResult, error: advisorTaskInsertErr } = await advisorClient
    .from("tasks")
    .insert({ title: "Advisor should not be able to insert", team_id: advisorTeamId.id, created_by: "00000000-0000-0000-0000-000000000000" })
    .select();
  const advisorInsertBlocked = advisorTaskInsertErr || !advisorInsertResult || advisorInsertResult.length === 0;
  console.log(`advisor task INSERT blocked: ${advisorInsertBlocked ? "YES" : "NO (unexpected!)"}`);

  const { data: milestones } = await advisorClient.from("milestones").select("id, title, status");
  const target = milestones.find((m) => m.title === "Mid-Progress Review");
  const { data: directUpdateResult, error: directUpdateErr } = await advisorClient
    .from("milestones")
    .update({ status: "approved" })
    .eq("id", target.id)
    .select();
  const directUpdateBlocked = directUpdateErr || !directUpdateResult || directUpdateResult.length === 0;
  console.log(`advisor direct milestone UPDATE blocked: ${directUpdateBlocked ? "YES" : "NO (unexpected!)"}`);

  const { data: rpcResult, error: rpcErr } = await advisorClient.rpc("approve_milestone", {
    milestone_id: target.id,
    new_status: "approved",
  });
  console.log(`advisor approve_milestone RPC: ${rpcErr ? "FAILED: " + rpcErr.message : "OK, new status = " + rpcResult.status}`);
}

const adminClient = await signInAs(USERS.admin);
{
  const { data: teams, error } = await adminClient.from("teams").select("*");
  console.log(`admin sees ${teams?.length ?? 0} team(s) (error: ${error?.message ?? "none"})`);
  const { data: allProfiles } = await adminClient.from("profiles").select("id, role");
  console.log(`admin sees ${allProfiles?.length ?? 0} profiles (should be all 5)`);
}

// Cross-team isolation: student2 should see the SAME team's tasks as
// student1 (they're on the same seeded team) — this just re-confirms
// scoping is by team, not by individual user.
const student2Client = await signInAs(USERS.student2);
{
  const { data: tasks } = await student2Client.from("tasks").select("id");
  console.log(`student2 (same team) sees ${tasks?.length ?? 0} tasks (should match student1's count)`);
}

console.log("\nDone.");
