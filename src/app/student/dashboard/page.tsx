"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  FolderKanban,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

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

type ChecklistTask = {
  id: string;
  task_title_snapshot: string;
  is_completed: boolean;
  day_number: number;
};

const demoTasks: ChecklistTask[] = [
  { id: "demo-1", task_title_snapshot: "Review project requirements", is_completed: true, day_number: 1 },
  { id: "demo-2", task_title_snapshot: "Sketch the core user flow", is_completed: true, day_number: 2 },
  { id: "demo-3", task_title_snapshot: "Set up the project structure", is_completed: false, day_number: 3 },
];

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

function subscribeToClock(callback: () => void) {
  const timer = setInterval(callback, 60000);
  return () => clearInterval(timer);
}

function getClockSnapshot() {
  return Math.floor(Date.now() / 60000);
}

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState(isSupabaseConfigured ? "there" : "Student");
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [tasks, setTasks] = useState<ChecklistTask[]>(isSupabaseConfigured ? [] : demoTasks);
  const [availableCount, setAvailableCount] = useState(isSupabaseConfigured ? 0 : 18);
  const [subjectCount, setSubjectCount] = useState(isSupabaseConfigured ? 0 : 7);
  const [remaining, setRemaining] = useState(isSupabaseConfigured ? { days: 0, hours: 0, minutes: 0 } : { days: 6, hours: 14, minutes: 32 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const clockMinutes = useSyncExternalStore(subscribeToClock, getClockSnapshot, () => 0);
  const clock = clockMinutes ? new Date(clockMinutes * 60000) : null;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Sign in is required to load your student dashboard.");

        const [profileResult, allocationResult, projectsResult, subjectsResult] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).single(),
          supabase.from("project_allocations")
            .select("id,allocation_date,deadline,status,projects(title,project_code,subjects(subject_name))")
            .in("status", ["ACTIVE", "DUE_SOON", "OVERDUE", "CHANGES_REQUESTED", "SUBMITTED", "UNDER_REVIEW"])
            .order("allocation_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.rpc("get_available_projects"),
          supabase.from("subjects").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (allocationResult.error) throw allocationResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (subjectsResult.error) throw subjectsResult.error;
        if (!active) return;

        setStudentName(profileResult.data.full_name || "there");
        setAvailableCount(projectsResult.data?.length ?? 0);
        setSubjectCount(subjectsResult.count ?? 0);

        if (!allocationResult.data) {
          setAllocation(null);
          setTasks([]);
          return;
        }

        const currentAllocation = allocationResult.data as unknown as Allocation;
        setAllocation(currentAllocation);
        const { data: checklist, error: checklistError } = await supabase
          .from("student_checklist_items")
          .select("id,task_title_snapshot,is_completed,day_number")
          .eq("allocation_id", currentAllocation.id)
          .order("day_number");
        if (checklistError) throw checklistError;
        if (!active) return;
        setTasks((checklist ?? []) as ChecklistTask[]);

        const updateCountdown = () => {
          const difference = Math.max(0, new Date(currentAllocation.deadline).getTime() - Date.now());
          setRemaining({
            days: Math.floor(difference / 86400000),
            hours: Math.floor(difference % 86400000 / 3600000),
            minutes: Math.floor(difference % 3600000 / 60000),
          });
        };
        updateCountdown();
        timer = setInterval(updateCountdown, 60000);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load your dashboard.");
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

  const isDemo = !isSupabaseConfigured;
  const completed = tasks.filter((task) => task.is_completed).length;
  const progress = tasks.length ? Math.round(completed * 100 / tasks.length) : 0;
  const hasProject = isDemo || Boolean(allocation);
  const projectTitle = allocation?.projects?.title ?? "Campus Connect Portal";
  const projectCode = allocation?.projects?.project_code ?? "PRJ-WD-104";
  const pendingTasks = tasks.length - completed;

  const metrics = [
    { label: "Available projects", value: loading ? "—" : availableCount, caption: "Ready to explore", icon: BookOpen, theme: "bg-blue-50 text-blue-600", href: "/student/projects" },
    { label: "Published subjects", value: loading ? "—" : subjectCount, caption: "Explore your interests", icon: GraduationCap, theme: "bg-violet-50 text-violet-600", href: "/student/subjects" },
    { label: "Checklist progress", value: loading ? "—" : hasProject ? `${isDemo ? 68 : progress}%` : "—", caption: hasProject ? `${isDemo ? "17 of 25" : `${completed} of ${tasks.length}`} tasks complete` : "Choose a project to begin", icon: CheckCircle2, theme: "bg-emerald-50 text-emerald-600", href: hasProject ? "/student/progress" : "/student/projects" },
  ];

  return (
    <DashboardShell role="student" title="Dashboard" description="Your personal project workspace.">
      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="relative mb-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101827] via-[#172b51] to-[#263d7a] px-5 py-7 text-white shadow-[0_32px_80px_-50px_rgba(30,64,175,.75)] sm:px-8 sm:py-9">
        <div aria-hidden="true" className="ambient-glow absolute -right-20 -top-32 h-80 w-80 rounded-full bg-blue-400/20 blur-[85px]"/>
        <div aria-hidden="true" className="absolute -bottom-36 right-[32%] h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]"/>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold text-blue-100 backdrop-blur">
              <CalendarDays size={13}/>{clock ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(clock) : "Your student workspace"}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{clock ? getGreeting(clock.getHours()) : "Welcome back"}, {studentName}<span className="text-blue-300">.</span><span aria-label={`${studentName} avatar`} className="ml-2 inline-flex h-8 w-8 translate-y-[-3px] items-center justify-center rounded-xl border border-white/15 bg-white/10 align-middle text-xs font-bold text-blue-100">{getInitials(studentName)}</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Every great project starts with one small step. Pick up where you left off or discover something new to build.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={hasProject ? "/student/my-project" : "/student/projects"} className="group inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50">
                {hasProject ? "Continue your project" : "Explore projects"} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1"/>
              </Link>
              <Link href="/student/subjects" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white transition hover:bg-white/10">
                <Compass size={14}/> Browse subjects
              </Link>
            </div>
          </div>
          <div className="float-slow relative hidden h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-inner backdrop-blur sm:flex">
            <div className="absolute inset-2 rounded-[1.5rem] border border-white/[0.08]"/>
            <Sparkles className="text-blue-200" size={35} strokeWidth={1.6}/>
            <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-lg"><span className="text-xs">✦</span></span>
          </div>
        </div>
      </section>

      {isDemo && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs leading-5 text-amber-800">Demo preview — sample project activity is shown below. Configure Supabase to load your saved workspace.</p>}

      <section aria-label="Project overview" className="mb-6 grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, caption, icon: Icon, theme, href }, index) => (
          <Link key={label} href={href} className="product-card group rounded-2xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${theme}`}><Icon size={19}/></span>
              <ArrowDownRight size={16} className="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600"/>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                <p className="stat-number mt-1 text-3xl font-bold tracking-tight text-slate-950" style={{ animationDelay: `${index * 70}ms` }}>{value}</p>
              </div>
              <span className="mb-1 text-right text-[10px] leading-4 text-slate-400">{caption}</span>
            </div>
          </Link>
        ))}
      </section>

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
          <div className="h-72 animate-pulse rounded-3xl bg-white/80"/>
          <div className="h-72 animate-pulse rounded-3xl bg-white/80"/>
        </div>
      ) : hasProject ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
          <article className="product-card overflow-hidden rounded-[1.75rem] border border-white bg-white/90 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>
                  {allocation?.status.replaceAll("_", " ") ?? "Demo project"}
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{projectTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">{allocation?.projects?.subjects?.subject_name ?? "Web Development"} <span className="px-1 text-slate-300">·</span> {projectCode}</p>
              </div>
              <Link href="/student/my-project" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                Project details <ArrowRight size={13}/>
              </Link>
            </div>
            <div className="border-y border-slate-100 bg-slate-50/65 px-5 py-4 sm:px-7">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600">Your project momentum</span>
                <span className="font-bold text-slate-900">{isDemo ? 68 : progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-700 ease-out" style={{ width: `${isDemo ? 68 : progress}%` }}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:px-7">
              {[
                { label: "Selected", value: allocation ? new Date(allocation.allocation_date).toLocaleDateString() : "Nov 24", icon: CalendarDays },
                { label: "Deadline", value: allocation ? new Date(allocation.deadline).toLocaleDateString() : "Dec 04", icon: Clock3 },
                { label: "Time left", value: `${remaining.days} days`, icon: Clock3 },
                { label: "Tasks done", value: `${isDemo ? 17 : completed} / ${isDemo ? 25 : tasks.length}`, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-white p-3">
                  <Icon size={15} className="text-slate-400"/>
                  <p className="mt-2 text-[9px] text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 px-5 pb-5 sm:px-7 sm:pb-7">
              <Link href="/student/progress" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">Update daily progress <ArrowRight size={13}/></Link>
              <Link href="/student/submission" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50">Submission workspace</Link>
              <Link href="/student/my-project#change-project" className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 text-[11px] font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100">
                <ArrowRightLeft size={13}/> Release &amp; change project
              </Link>
            </div>
          </article>

          <aside className="flex flex-col gap-5">
            <article className="relative overflow-hidden rounded-[1.75rem] bg-[#121b2e] p-5 text-white shadow-[0_22px_60px_-38px_rgba(15,23,42,.65)] sm:p-6">
              <div aria-hidden="true" className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl"/>
              <div className="relative flex items-center justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-blue-300">One day at a time</p><h2 className="mt-1 text-sm font-bold">Deadline countdown</h2></div>
                <Clock3 size={18} className="text-blue-300"/>
              </div>
              <div className="relative mt-5 grid grid-cols-3 gap-2">
                {[[remaining.days, "Days"], [remaining.hours, "Hours"], [remaining.minutes, "Minutes"]].map(([value, unit]) => (
                  <div key={String(unit)} className="rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 text-center">
                    <p className="text-xl font-bold tabular-nums">{String(value).padStart(2, "0")}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-wide text-slate-400">{unit}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-sm font-bold text-slate-950">Your checklist</h2><p className="mt-1 text-[10px] text-slate-400">{isDemo ? "3" : tasks.length} tasks in your plan</p></div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={17}/></span>
              </div>
              {tasks.length ? (
                <div className="mt-4 space-y-2">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${task.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{task.is_completed ? <Check size={13}/> : <span className="text-[9px] font-bold">{task.day_number}</span>}</span>
                      <span className={`min-w-0 flex-1 truncate text-[10px] ${task.is_completed ? "text-slate-400 line-through" : "font-semibold text-slate-700"}`}>{task.task_title_snapshot}</span>
                      <span className="text-[9px] text-slate-400">Day {task.day_number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-[10px] leading-5 text-slate-500">Your checklist will appear here after you select a project.</div>
              )}
              <Link href="/student/progress" className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 transition hover:text-blue-800">Open full checklist <ArrowRight size={12}/></Link>
            </article>
          </aside>
        </section>
      ) : (
        <section className="product-card overflow-hidden rounded-[1.75rem] border border-white bg-white/90 shadow-sm backdrop-blur">
          <div className="relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-14">
            <div aria-hidden="true" className="ambient-glow absolute -right-8 -top-24 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl"/>
            <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><FolderKanban size={25}/></span>
            <p className="relative mt-5 text-[9px] font-bold uppercase tracking-[.2em] text-blue-600">A blank canvas awaits</p>
            <h2 className="relative mt-2 text-xl font-bold tracking-tight text-slate-950">Choose your first project</h2>
            <p className="relative mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">Explore a subject, find a project that sparks your interest, and start building. Your work and progress stay in one place.</p>
            <Link href="/student/subjects" className="relative mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">Find a project <ArrowRight size={13}/></Link>
          </div>
        </section>
      )}

      <section aria-label="Quick links" className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: "Browse subjects", text: `${subjectCount} published subjects`, icon: GraduationCap, href: "/student/subjects", accent: "text-violet-600 bg-violet-50" },
          { title: "Explore projects", text: `${availableCount} currently available`, icon: BookOpen, href: "/student/projects", accent: "text-blue-600 bg-blue-50" },
          { title: "Daily progress", text: hasProject ? `${pendingTasks} tasks to complete` : "Your checklist awaits", icon: CheckCircle2, href: hasProject ? "/student/progress" : "/student/projects", accent: "text-emerald-600 bg-emerald-50" },
        ].map(({ title, text, icon: Icon, href, accent }) => (
          <Link key={title} href={href} className="product-card group flex items-center gap-4 rounded-2xl border border-white bg-white/85 p-4 shadow-sm backdrop-blur">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent}`}><Icon size={18}/></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800">{title}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{text}</span></span>
            <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"/>
          </Link>
        ))}
      </section>
    </DashboardShell>
  );
}
