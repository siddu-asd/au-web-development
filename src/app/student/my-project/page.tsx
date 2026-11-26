"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderSearch,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { startPageTransition } from "@/components/page-transition-loader";

type Allocation = {
  id: string;
  allocation_date: string;
  deadline: string;
  status: string;
  projects: {
    title: string;
    project_code: string;
    subjects: { subject_name: string } | null;
  } | null;
};

const changeableStatuses = ["ACTIVE", "DUE_SOON", "OVERDUE", "CHANGES_REQUESTED"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MyProject() {
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [progress, setProgress] = useState(isSupabaseConfigured ? 0 : 68);
  const [remaining, setRemaining] = useState({ days: 6, hours: 14, minutes: 32 });
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        const supabase = createClient();
        const { data, error: allocationError } = await supabase
          .from("project_allocations")
          .select("id,allocation_date,deadline,status,projects(title,project_code,subjects(subject_name))")
          .neq("status", "CANCELLED")
          .order("allocation_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (allocationError) throw allocationError;
        if (!active) return;
        if (!data) {
          setLoading(false);
          return;
        }

        const row = data as unknown as Allocation;
        setAllocation(row);
        const [checklistResult, submissionResult] = await Promise.all([
          supabase.from("student_checklist_items").select("is_completed").eq("allocation_id", row.id),
          supabase.from("project_submissions").select("id", { count: "exact", head: true }).eq("allocation_id", row.id),
        ]);
        if (checklistResult.error) throw checklistResult.error;
        if (submissionResult.error) throw submissionResult.error;
        if (!active) return;

        const items = checklistResult.data ?? [];
        setProgress(items.length
          ? Math.round(items.filter((item) => item.is_completed).length * 100 / items.length)
          : 0);
        setSubmissionCount(submissionResult.count ?? 0);

        const updateCountdown = () => {
          const difference = Math.max(0, new Date(row.deadline).getTime() - Date.now());
          setRemaining({
            days: Math.floor(difference / 86400000),
            hours: Math.floor(difference % 86400000 / 3600000),
            minutes: Math.floor(difference % 3600000 / 60000),
          });
        };
        updateCountdown();
        timer = setInterval(updateCountdown, 60000);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load your project.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!confirmCancel) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !cancelling) setConfirmCancel(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmCancel, cancelling]);

  async function releaseAllocation() {
    if (!allocation || cancelling || !isSupabaseConfigured) return;
    setCancelling(true);
    setError("");
    try {
      const { error: cancelError } = await createClient().rpc("cancel_project_allocation", {
        p_allocation_id: allocation.id,
      });
      if (cancelError) throw cancelError;
      setConfirmCancel(false);
      startPageTransition("/student/projects?allocation=cancelled");
      router.replace("/student/projects?allocation=cancelled");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to release this project. Please try again.");
      setCancelling(false);
    }
  }

  const canChangeProject = Boolean(
    allocation &&
    changeableStatuses.includes(allocation.status) &&
    submissionCount === 0,
  );
  const statusLabel = allocation?.status.replaceAll("_", " ").toLowerCase() ?? "active";

  return (
    <DashboardShell role="student" title="My Project" description="Your selected project, timeline, and next steps.">
      {!isSupabaseConfigured && (
        <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs leading-5 text-amber-800">
          Preview mode — the displayed project and progress are examples and are not saved records.
        </p>
      )}
      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="rounded-3xl border border-white bg-white/80 p-12 text-center text-sm text-slate-500 shadow-sm">Loading your project workspace…</div>
      ) : !allocation && isSupabaseConfigured ? (
        <section className="overflow-hidden rounded-[2rem] border border-white bg-white text-center shadow-[0_30px_90px_-50px_rgba(30,64,175,.35)]">
          <div className="relative overflow-hidden px-6 py-14 sm:px-12">
            <div aria-hidden="true" className="ambient-glow absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-200/50 blur-3xl"/>
            <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><FolderSearch size={29}/></span>
            <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[.22em] text-blue-600">Your next build starts here</p>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight text-slate-950">No active project selected</h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Explore the published subjects and find a project that fits your interests. Your selection will be reserved for you.</p>
            <Link href="/student/projects" className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700">
              Explore available projects <ArrowRight size={16}/>
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="product-card overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,.35)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#172b51] to-blue-800 px-6 py-7 text-white sm:px-8 sm:py-9">
              <div aria-hidden="true" className="ambient-glow absolute -right-10 -top-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl"/>
              <div aria-hidden="true" className="float-slow absolute right-8 top-8 hidden h-24 w-24 rounded-[1.75rem] border border-white/10 bg-white/[0.06] backdrop-blur-md sm:block"/>
              <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"/>
                    {statusLabel}
                  </div>
                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-200">{allocation?.projects?.project_code ?? "PRJ-WD-104"} <span className="px-1 text-white/30">/</span> {allocation?.projects?.subjects?.subject_name ?? "Web Development"}</p>
                  <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">{allocation?.projects?.title ?? "Campus Connect Portal"}</h2>
                  <p className="mt-2 text-sm text-blue-100/70">Your project is reserved. Make every day count.</p>
                </div>
                <Sparkles className="relative mr-1 mt-1 text-blue-200/80" size={23}/>
              </div>
              <div className="relative mt-8">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-blue-100/80">Checklist progress</span>
                  <span className="font-bold text-white">{isSupabaseConfigured ? progress : 68}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-300 transition-[width] duration-700 ease-out" style={{ width: `${isSupabaseConfigured ? progress : 68}%` }}/>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Selected on", value: allocation ? formatDate(allocation.allocation_date) : "Nov 24, 2026", icon: CalendarDays, color: "text-blue-600", tint: "bg-blue-50" },
                  { label: "Project deadline", value: allocation ? formatDate(allocation.deadline) : "Dec 04, 2026", icon: Clock3, color: "text-violet-600", tint: "bg-violet-50" },
                  { label: "Checklist complete", value: `${isSupabaseConfigured ? progress : 68}%`, icon: CheckCircle2, color: "text-emerald-600", tint: "bg-emerald-50" },
                ].map(({ label, value, icon: Icon, color, tint }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/65 p-4 transition-colors hover:bg-white hover:border-slate-200">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${tint} ${color}`}><Icon size={17}/></span>
                    <p className="mt-4 text-[10px] font-medium text-slate-400">{label}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/student/progress" className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition hover:-translate-y-0.5 hover:bg-blue-700">Continue checklist <ArrowRight size={14}/></Link>
                <Link href="/student/submission" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Submission workspace</Link>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="relative overflow-hidden rounded-[1.75rem] bg-[#121b2e] p-6 text-white shadow-[0_22px_60px_-38px_rgba(15,23,42,.65)]">
              <div aria-hidden="true" className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl"/>
              <div className="relative flex items-center justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-300">Stay on track</p><h2 className="mt-1 text-base font-bold">Deadline countdown</h2></div>
                <Clock3 className="text-blue-300" size={19}/>
              </div>
              <div className="relative mt-6 grid grid-cols-3 gap-2">
                {[[remaining.days, "Days"], [remaining.hours, "Hours"], [remaining.minutes, "Minutes"]].map(([value, unit]) => (
                  <div key={String(unit)} className="rounded-xl border border-white/[0.08] bg-white/[0.05] py-4 text-center">
                    <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{unit}</div>
                  </div>
                ))}
              </div>
              <p className="relative mt-4 text-[10px] leading-5 text-slate-400">Your countdown follows the saved project deadline.</p>
            </section>

            <section id="change-project" className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><ShieldAlert size={18}/></span>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Need to choose a different project?</h2>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Release this project to make it available for another student, then select a different available project. This is available until you submit your work.</p>
                </div>
              </div>
              {submissionCount !== null && submissionCount > 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-500">This project has a submission, so it can no longer be changed. Contact your faculty if you need help.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={!canChangeProject || !isSupabaseConfigured}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
                >
                  <X size={14}/>Release &amp; choose another
                </button>
              )}
            </section>
          </aside>
        </div>
      )}

      {confirmCancel && allocation && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !cancelling) setConfirmCancel(false);
        }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="cancel-project-title" aria-describedby="cancel-project-description" className="w-full max-w-md animate-in rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[0_32px_100px_-35px_rgba(15,23,42,.6)] sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert size={22}/></span>
            <h2 id="cancel-project-title" className="mt-5 text-lg font-bold tracking-tight text-slate-950">Release this project?</h2>
            <p id="cancel-project-description" className="mt-2 text-sm leading-6 text-slate-500">
              <strong className="text-slate-700">{allocation.projects?.title ?? "Your selected project"}</strong> will be released and become available for another student to select. You can then immediately choose a different available project.
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">You can’t undo this release. Your checklist history will be kept, but the allocation cannot be restored.</p>
            {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" autoFocus onClick={() => setConfirmCancel(false)} disabled={cancelling} className="h-11 flex-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Keep this project</button>
              <button type="button" aria-busy={cancelling} onClick={() => void releaseAllocation()} disabled={cancelling} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                {cancelling ? "Releasing project…" : "Release and browse"} <ArrowRight size={14}/>
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
