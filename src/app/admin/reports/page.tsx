"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";

type SubjectRow = { id: string; subject_name: string };
type ProjectRow = { id: string; subject_id: string; status: string };
type AllocationRow = { project_id: string; status: string };
type SubmissionRow = { submission_status: string };
type SubjectCompletion = { id: string; name: string; complete: number; total: number };
type ReportData = {
  allocationRate: number | null;
  completionRate: number | null;
  lateSubmissionRate: number | null;
  activeStudents: number;
  subjects: SubjectCompletion[];
};

const emptyReport: ReportData = {
  allocationRate: null,
  completionRate: null,
  lateSubmissionRate: null,
  activeStudents: 0,
  subjects: [],
};

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

export default function Reports() {
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    async function load() {
      try {
        const supabase = createClient();
        const [subjects, projects, allocations, submissions, students] = await Promise.all([
          fetchAllPages<SubjectRow>((from, to) =>
            supabase.from("subjects").select("id,subject_name").eq("status", "PUBLISHED").order("subject_name").range(from, to),
          ),
          fetchAllPages<ProjectRow>((from, to) =>
            supabase.from("projects").select("id,subject_id,status").eq("status", "PUBLISHED").range(from, to),
          ),
          fetchAllPages<AllocationRow>((from, to) =>
            supabase.from("project_allocations").select("project_id,status").range(from, to),
          ),
          fetchAllPages<SubmissionRow>((from, to) =>
            supabase.from("project_submissions").select("submission_status").range(from, to),
          ),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "STUDENT").eq("account_status", "ACTIVE"),
        ]);

        if (students.error) throw students.error;
        if (!active) return;

        const subjectById = new Map(subjects.map((subject) => [subject.id, subject.subject_name]));
        const projectById = new Map(
          projects.filter((project) => subjectById.has(project.subject_id)).map((project) => [project.id, project.subject_id]),
        );
        const relevantAllocations = allocations.filter(
          (allocation) => allocation.status !== "CANCELLED" && projectById.has(allocation.project_id),
        );
        const allocatedProjectIds = new Set(relevantAllocations.map((allocation) => allocation.project_id));
        const completedAllocations = relevantAllocations.filter((allocation) => allocation.status === "APPROVED").length;
        const submissionsWithStatus = submissions.filter((submission) => submission.submission_status);
        const lateSubmissions = submissionsWithStatus.filter((submission) => submission.submission_status === "Late Submission").length;
        const subjectCounts = new Map<string, { complete: number; total: number }>();

        for (const allocation of relevantAllocations) {
          const subjectId = projectById.get(allocation.project_id);
          if (!subjectId) continue;
          const count = subjectCounts.get(subjectId) ?? { complete: 0, total: 0 };
          count.total += 1;
          if (allocation.status === "APPROVED") count.complete += 1;
          subjectCounts.set(subjectId, count);
        }

        setReport({
          allocationRate: percentage(allocatedProjectIds.size, projects.length),
          completionRate: percentage(completedAllocations, relevantAllocations.length),
          lateSubmissionRate: percentage(lateSubmissions, submissionsWithStatus.length),
          activeStudents: students.count ?? 0,
          subjects: subjects.map((subject) => {
            const count = subjectCounts.get(subject.id) ?? { complete: 0, total: 0 };
            return { id: subject.id, name: subject.subject_name, ...count };
          }),
        });
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    ["Published projects allocated", report.allocationRate, "Published projects with at least one allocation"],
    ["Allocation completion rate", report.completionRate, "Approved allocations / non-cancelled allocations"],
    ["Late submissions", report.lateSubmissionRate, "Late submissions / submissions"],
  ] as const;

  return (
    <DashboardShell role="admin" title="Reports & Analytics" description="Live allocation, completion, submission, and student metrics.">
      {!isSupabaseConfigured && <p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Connect Supabase to view live reports. Demo metrics are not shown as real data.</p>}
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">Could not load reports: {error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
            <span className="text-xs text-slate-500">{label}</span>
            <div className="mt-3 text-2xl font-bold text-slate-950">{loading ? "…" : value === null ? "—" : `${value}%`}</div>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-xs text-slate-500">Active students</span>
          <div className="mt-3 text-2xl font-bold text-slate-950">{loading ? "…" : report.activeStudents.toLocaleString()}</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">Active student accounts</p>
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900">Completion by subject</h2>
        <p className="mt-1 text-xs text-slate-500">Approved project allocations as a share of non-cancelled allocations.</p>
        {loading ? (
          <p className="mt-6 text-xs text-slate-500">Loading subject completion…</p>
        ) : report.subjects.length === 0 ? (
          <p className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">No published subjects found.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {report.subjects.map((subject) => {
              const value = percentage(subject.complete, subject.total);
              return (
                <div key={subject.id}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                    <b className="text-slate-800">{subject.name}</b>
                    <span className="text-slate-500">{subject.complete} / {subject.total} completed · {value === null ? "No allocations" : `${value}%`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${value ?? 0}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
