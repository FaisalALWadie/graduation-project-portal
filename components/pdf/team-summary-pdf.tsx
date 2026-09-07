import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { STATUS_COLUMNS } from "@/components/kanban/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statGrid: { flexDirection: "row", gap: 16, marginTop: 8 },
  statBox: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 9, color: "#666", marginTop: 2 },
});

export function TeamSummaryPdf({
  projectTitle,
  advisorName,
  completionPct,
  counts,
  totalTasks,
  milestones,
  generatedAt,
}: {
  projectTitle: string;
  advisorName: string;
  completionPct: number;
  counts: Record<string, number>;
  totalTasks: number;
  milestones: { title: string; status: string; due_date: string | null }[];
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{projectTitle}</Text>
        <Text style={styles.subtitle}>
          Advisor Progress Summary — generated {generatedAt} by {advisorName}
        </Text>

        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completionPct}%</Text>
            <Text style={styles.statLabel}>Tasks completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {milestones.filter((m) => m.status === "approved").length}/
              {milestones.length}
            </Text>
            <Text style={styles.statLabel}>Milestones approved</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Task Distribution</Text>
        {STATUS_COLUMNS.map((col) => (
          <View style={styles.row} key={col.id}>
            <Text>{col.label}</Text>
            <Text>{counts[col.id] ?? 0}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Milestones</Text>
        {milestones.map((m) => (
          <View style={styles.row} key={m.title}>
            <Text>{m.title}</Text>
            <Text>
              {m.status}
              {m.due_date ? ` · due ${m.due_date}` : ""}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
