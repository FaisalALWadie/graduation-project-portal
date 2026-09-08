// One-time demo seed: creates real Supabase Auth accounts (via the admin
// API, since profiles.id is a FK to auth.users and passwords can't be
// inserted with plain SQL) plus a full set of realistic project data.
// Safe to re-run: it looks up existing users/rows by known keys before
// inserting.
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "GradPortal2026!";

const PEOPLE = [
  { email: "444812573@kku.edu.sa", full_name: "Faisal Al-Wadie", role: "admin" },
  { email: "advisor.alqahtani@kku.edu.sa", full_name: "Dr. Nasser Al-Qahtani", role: "advisor" },
  { email: "student.alharbi@kku.edu.sa", full_name: "Abdullah Al-Harbi", role: "student" },
  { email: "student.alotaibi@kku.edu.sa", full_name: "Sarah Al-Otaibi", role: "student" },
  { email: "student.alghamdi@kku.edu.sa", full_name: "Faisal Al-Ghamdi", role: "student" },
];

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser({ email, full_name }) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw error;
  return data.user;
}

console.log("Creating/looking up demo accounts...");
const usersByRole = {};
for (const person of PEOPLE) {
  const user = await ensureUser(person);
  usersByRole[person.email] = { ...person, id: user.id };
  console.log(`  ${person.role.padEnd(8)} ${person.email} -> ${user.id}`);
}

const admin_ = usersByRole["444812573@kku.edu.sa"];
const advisor = usersByRole["advisor.alqahtani@kku.edu.sa"];
const student1 = usersByRole["student.alharbi@kku.edu.sa"];
const student2 = usersByRole["student.alotaibi@kku.edu.sa"];
const student3 = usersByRole["student.alghamdi@kku.edu.sa"];

console.log("Ensuring team...");
const PROJECT_TITLE = "Waqt: Smart Attendance & Engagement Analytics Platform";
let { data: team } = await admin
  .from("teams")
  .select("*")
  .eq("project_title", PROJECT_TITLE)
  .maybeSingle();

if (!team) {
  const { data, error } = await admin
    .from("teams")
    .insert({ project_title: PROJECT_TITLE, advisor_id: advisor.id })
    .select()
    .single();
  if (error) throw error;
  team = data;
}
console.log(`  team -> ${team.id}`);

console.log("Assigning roles and team membership...");
const profileUpdates = [
  { id: admin_.id, full_name: admin_.full_name, role: "admin", team_id: null },
  { id: advisor.id, full_name: advisor.full_name, role: "advisor", team_id: team.id },
  { id: student1.id, full_name: student1.full_name, role: "student", team_id: team.id },
  { id: student2.id, full_name: student2.full_name, role: "student", team_id: team.id },
  { id: student3.id, full_name: student3.full_name, role: "student", team_id: team.id },
];
for (const update of profileUpdates) {
  const { error } = await admin.from("profiles").update(update).eq("id", update.id);
  if (error) throw error;
}

async function seedIfEmpty(table, rows) {
  const { count } = await admin.from(table).select("*", { count: "exact", head: true }).eq("team_id", team.id);
  if (count && count > 0) {
    console.log(`  ${table}: already has ${count} rows, skipping`);
    return;
  }
  const { error } = await admin.from(table).insert(rows);
  if (error) throw error;
  console.log(`  ${table}: inserted ${rows.length} rows`);
}

console.log("Seeding tasks...");
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

await seedIfEmpty("tasks", [
  { team_id: team.id, title: "Define system requirements & scope document", description: "Draft the SRS covering functional and non-functional requirements for the attendance platform.", status: "completed", priority: "high", assigned_to: student1.id, created_by: student1.id, due_date: day(-30) },
  { team_id: team.id, title: "Design ER diagram and database schema", description: "Model students, sessions, attendance records, and engagement scores.", status: "completed", priority: "high", assigned_to: student2.id, created_by: student2.id, due_date: day(-25) },
  { team_id: team.id, title: "Set up facial recognition pipeline (OpenCV + dlib)", description: "Prototype face detection and embedding extraction on sample classroom footage.", status: "completed", priority: "high", assigned_to: student3.id, created_by: student3.id, due_date: day(-20) },
  { team_id: team.id, title: "Build student enrollment module", description: "Capture reference face images and metadata during student onboarding.", status: "completed", priority: "medium", assigned_to: student1.id, created_by: student1.id, due_date: day(-18) },
  { team_id: team.id, title: "Implement real-time attendance capture service", description: "Stream classroom camera feed and match faces against enrolled students.", status: "in_progress", priority: "high", assigned_to: student3.id, created_by: student3.id, due_date: day(-2) },
  { team_id: team.id, title: "Build lecturer dashboard (session overview)", description: "Show live attendance count and per-student status during a session.", status: "in_progress", priority: "medium", assigned_to: student2.id, created_by: student2.id, due_date: day(3) },
  { team_id: team.id, title: "Engagement scoring model (attention estimation)", description: "Use head-pose and gaze cues to estimate engagement level per student.", status: "in_progress", priority: "medium", assigned_to: student1.id, created_by: student1.id, due_date: day(5) },
  { team_id: team.id, title: "Write unit tests for attendance matching accuracy", description: "Target >95% recognition accuracy on the validation set.", status: "in_progress", priority: "low", assigned_to: student3.id, created_by: student3.id, due_date: day(6) },
  { team_id: team.id, title: "Design weekly engagement report (PDF export)", description: "Summarize per-student attendance and engagement trends for instructors.", status: "review", priority: "medium", assigned_to: student2.id, created_by: student2.id, due_date: day(1) },
  { team_id: team.id, title: "Integrate notification system for absentee alerts", description: "Email/SMS alert to academic advisor after 3 consecutive absences.", status: "review", priority: "low", assigned_to: student1.id, created_by: student1.id, due_date: day(2) },
  { team_id: team.id, title: "Load testing for concurrent classroom sessions", description: "Simulate 10 simultaneous sessions with 40 students each.", status: "review", priority: "medium", assigned_to: student3.id, created_by: student3.id, due_date: day(4) },
  { team_id: team.id, title: "Prepare mid-progress review slide deck", description: "Summarize architecture, progress, and demo plan for the advisor review.", status: "todo", priority: "high", assigned_to: student2.id, created_by: student2.id, due_date: day(7) },
  { team_id: team.id, title: "Privacy & consent flow for facial data", description: "Add explicit student consent capture and data retention policy screen.", status: "todo", priority: "high", assigned_to: student1.id, created_by: student1.id, due_date: day(9) },
  { team_id: team.id, title: "Deploy staging environment on university servers", description: "Set up staging deployment with sample classroom data for the demo.", status: "todo", priority: "medium", assigned_to: student3.id, created_by: student3.id, due_date: day(12) },
  { team_id: team.id, title: "Write final report methodology chapter", description: "Document the recognition pipeline and engagement scoring methodology.", status: "todo", priority: "low", assigned_to: student2.id, created_by: student2.id, due_date: day(20) },
]);

console.log("Seeding milestones (fixed set)...");
await seedIfEmpty("milestones", [
  { team_id: team.id, title: "Project Proposal", due_date: day(-45), status: "approved", approved_by: advisor.id, approved_at: new Date(Date.now() - 40 * 86400000).toISOString() },
  { team_id: team.id, title: "Mid-Progress Review", due_date: day(7), status: "submitted" },
  { team_id: team.id, title: "Final Defense", due_date: day(60), status: "pending" },
]);

console.log("Seeding documents...");
const SEED_FILES = [
  {
    path: `${team.id}/proposal-report-v1.pdf`,
    contentType: "application/pdf",
    content:
      "Waqt: Smart Attendance & Engagement Analytics Platform\nProject Proposal Report (v1)\n\n1. Problem Statement\nManual attendance tracking in university lecture halls is slow, error-prone, and gives no insight into student engagement.\n\n2. Proposed Solution\nA facial-recognition-based attendance system with real-time engagement scoring using head-pose and gaze estimation.\n\n3. Scope\nEnrollment module, real-time capture service, lecturer dashboard, weekly engagement reports.\n\n(Placeholder demo content - replace with the real proposal before the jury presentation.)",
  },
  {
    path: `${team.id}/final-report-v2.pdf`,
    contentType: "application/pdf",
    content:
      "Waqt: Smart Attendance & Engagement Analytics Platform\nFinal Report Draft (v2)\n\nMethodology, system architecture, evaluation results, and future work sections in progress.\n\n(Placeholder demo content - replace with the real report before the jury presentation.)",
  },
  {
    path: `${team.id}/mid-review-slides-v1.pptx`,
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    content:
      "Mid-Progress Review - Slide Outline\n1. Title & Team\n2. Problem & Motivation\n3. Architecture Overview\n4. Demo: Real-Time Attendance Capture\n5. Remaining Work & Timeline\n\n(Placeholder demo content - replace with real slides before the jury presentation.)",
  },
  {
    path: `${team.id}/source-code-v3.zip`,
    contentType: "application/zip",
    content:
      "This placeholder stands in for the source-code-v3.zip archive.\nReplace with the real repository export before the jury presentation.",
  },
];
for (const f of SEED_FILES) {
  const { error } = await admin.storage
    .from("documents")
    .upload(f.path, new Blob([f.content], { type: f.contentType }), {
      contentType: f.contentType,
      upsert: true,
    });
  if (error) throw error;
}
await seedIfEmpty("documents", [
  { team_id: team.id, title: "Project Proposal Report", type: "report", file_url: `${team.id}/proposal-report-v1.pdf`, version: 1, uploaded_by: student1.id },
  { team_id: team.id, title: "Final Report Draft", type: "report", file_url: `${team.id}/final-report-v2.pdf`, version: 2, uploaded_by: student2.id },
  { team_id: team.id, title: "Mid-Progress Review Slides", type: "presentation", file_url: `${team.id}/mid-review-slides-v1.pptx`, version: 1, uploaded_by: student2.id },
  { team_id: team.id, title: "Source Code Archive", type: "code", file_url: `${team.id}/source-code-v3.zip`, version: 3, uploaded_by: student3.id },
]);

console.log("Seeding meeting logs...");
await seedIfEmpty("meeting_logs", [
  { team_id: team.id, meeting_date: day(-21), summary: "Reviewed database schema and facial recognition library choice (OpenCV vs. MediaPipe).", decisions: "Proceed with OpenCV + dlib for the recognition pipeline; revisit MediaPipe if accuracy falls short of 95%.", created_by: advisor.id },
  { team_id: team.id, meeting_date: day(-7), summary: "Demoed the real-time attendance capture prototype on recorded classroom footage.", decisions: "Add a manual override flow for misclassified students before the mid-progress review.", created_by: advisor.id },
]);

console.log("Seeding advisor notes...");
await seedIfEmpty("advisor_notes", [
  { team_id: team.id, advisor_id: advisor.id, week_number: 1, note: "Good start on requirements gathering. Make sure the SRS explicitly covers data privacy for facial recognition — this will come up with the ethics committee." },
  { team_id: team.id, advisor_id: advisor.id, week_number: 3, note: "Recognition pipeline prototype looks promising. Please add a consent screen before the mid-progress review — it's a hard requirement, not optional polish." },
]);

console.log("Seeding task comments...");
{
  const { count } = await admin.from("task_comments").select("*", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`  task_comments: already has ${count} rows, skipping`);
  } else {
    const { data: reviewTask } = await admin
      .from("tasks")
      .select("id")
      .eq("team_id", team.id)
      .eq("title", "Design weekly engagement report (PDF export)")
      .single();
    const { data: inProgressTask } = await admin
      .from("tasks")
      .select("id")
      .eq("team_id", team.id)
      .eq("title", "Implement real-time attendance capture service")
      .single();

    const { error } = await admin.from("task_comments").insert([
      { task_id: reviewTask.id, author_id: student2.id, content: "Draft report is ready for review — added a per-student trend chart on page 2." },
      { task_id: reviewTask.id, author_id: student1.id, content: "Looks good, but can we also break down engagement by time-of-day? Might be useful for the mid-review." },
      { task_id: inProgressTask.id, author_id: student3.id, content: "Recognition latency is currently ~800ms per frame — investigating batching frames to bring this under 300ms." },
    ]);
    if (error) throw error;
    console.log("  task_comments: inserted 3 rows");
  }
}

console.log("Seeding starter mind map...");
{
  const { data: existing } = await admin.from("teams").select("mindmap_data").eq("id", team.id).single();
  if (existing?.mindmap_data) {
    console.log("  mindmap: already seeded, skipping");
  } else {
    const centerId = "core";
    const satellites = [
      { id: "facial-recognition", label: "Facial Recognition Pipeline", x: 80, y: 40 },
      { id: "capture", label: "Real-Time Attendance Capture", x: 420, y: 10 },
      { id: "engagement", label: "Engagement Scoring Model", x: 760, y: 40 },
      { id: "dashboard", label: "Lecturer Dashboard", x: 820, y: 320 },
      { id: "enrollment", label: "Student Enrollment", x: 30, y: 320 },
      { id: "notifications", label: "Notifications & Alerts", x: 420, y: 520 },
      { id: "reporting", label: "Reporting & PDF Export", x: 760, y: 480 },
    ];
    const mindmap_data = {
      nodes: [
        { id: centerId, type: "editable", position: { x: 420, y: 250 }, data: { label: "Waqt: Smart Attendance & Engagement Analytics Platform" } },
        ...satellites.map((s) => ({ id: s.id, type: "editable", position: { x: s.x, y: s.y }, data: { label: s.label } })),
      ],
      edges: [
        ...satellites.map((s) => ({ id: `${centerId}-${s.id}`, source: centerId, target: s.id })),
        { id: "facial-recognition-capture", source: "facial-recognition", target: "capture" },
        { id: "capture-engagement", source: "capture", target: "engagement" },
        { id: "capture-notifications", source: "capture", target: "notifications" },
        { id: "engagement-reporting", source: "engagement", target: "reporting" },
      ],
    };
    const { error } = await admin.from("teams").update({ mindmap_data }).eq("id", team.id);
    if (error) throw error;
    console.log("  mindmap: seeded starter layout");
  }
}

console.log("Resetting Mid-Progress Review milestone to its intended demo state (submitted, awaiting advisor approval)...");
await admin
  .from("milestones")
  .update({ status: "submitted", approved_by: null, approved_at: null })
  .eq("team_id", team.id)
  .eq("title", "Mid-Progress Review");

console.log("\nDone. Demo login credentials (password is the same for all):");
console.log(`  Password: ${DEMO_PASSWORD}`);
for (const p of PEOPLE) {
  console.log(`  ${p.role.padEnd(8)} ${p.email}`);
}
