"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowLeft, ArrowRight, CheckCircle2, Folder, FolderOpen, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Project = {
  id: string;
  project_code: string;
  title: string;
  description: string | null;
  difficulty: string;
  technologies: string[];
  subject_name?: string;
  subject_id?: string;
};

type SubjectFolder = {
  id: string;
  subject_code: string;
  subject_name: string;
  description: string | null;
  projectCount: number;
};

type ActiveAllocation = { id: string; status: string };

const demoProjects: Project[] = [
  { id: "101", project_code: "PRJ-WD-101", title: "Campus Event Hub", description: "An event discovery and registration platform.", difficulty: "Medium", technologies: ["React", "Supabase"] },
  { id: "102", project_code: "PRJ-WD-102", title: "Smart Expense Tracker", description: "Track spending and visualize monthly budgets.", difficulty: "Easy", technologies: ["JavaScript", "Charts"] },
  { id: "103", project_code: "PRJ-WD-103", title: "University Library Portal", description: "Search catalogues and manage book reservations.", difficulty: "Hard", technologies: ["Next.js", "PostgreSQL"] },
  { id: "104", project_code: "PRJ-WD-104", title: "Campus Connect Portal", description: "A student community for announcements and projects.", difficulty: "Medium", technologies: ["React", "Firebase"] },
];

export default function StudentProjects() {
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [subjects, setSubjects] = useState<SubjectFolder[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All difficulties");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const [allocationReleased, setAllocationReleased] = useState(false);
  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    async function load() {
      try {
        const supabase = createClient();
        const [projectResult, subjectResult, allocationResult] = await Promise.all([
          supabase.rpc("get_available_projects"),
          supabase.from("subjects").select("id,subject_code,subject_name,description").eq("status", "PUBLISHED").order("subject_name"),
          supabase.from("project_allocations").select("id,status")
            .in("status", ["ACTIVE", "DUE_SOON", "OVERDUE", "CHANGES_REQUESTED", "SUBMITTED", "UNDER_REVIEW"])
            .order("allocation_date", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (projectResult.error) throw projectResult.error;
        if (subjectResult.error) throw subjectResult.error;
        if (allocationResult.error) throw allocationResult.error;
        if (!active) return;

        const availableProjects = (projectResult.data ?? []) as unknown as Project[];
        const publishedSubjects = subjectResult.data ?? [];
        setProjects(availableProjects);
        setSubjects(publishedSubjects.map((subject) => ({
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          description: subject.description,
          projectCount: availableProjects.filter((project) => project.subject_id === subject.id).length,
        })));
        setActiveAllocation(allocationResult.data);
        setSubjectFilter(new URLSearchParams(window.location.search).get("subject") ?? "");
        setAllocationReleased(new URLSearchParams(window.location.search).get("allocation") === "cancelled");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load subjects and projects.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const selectedSubject = subjects.find((subject) => subject.id === subjectFilter);
  const visibleProjects = useMemo(() => projects.filter((project) =>
    project.subject_id === subjectFilter &&
    (difficulty === "All difficulties" || project.difficulty === difficulty) &&
    `${project.title} ${project.project_code} ${project.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [projects, search, difficulty, subjectFilter]);

  function openSubject(id: string) {
    setSubjectFilter(id);
    setAllocationReleased(false);
    window.history.replaceState(null, "", `/student/projects?subject=${encodeURIComponent(id)}`);
  }

  function closeSubject() {
    setSubjectFilter("");
    setSearch("");
    setDifficulty("All difficulties");
    setAllocationReleased(false);
    window.history.replaceState(null, "", "/student/projects");
  }

  return (
    <DashboardShell role="student" title="Projects by Subject" description="Open a subject folder to browse its available projects.">
      {!isSupabaseConfigured && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Sample projects for preview only; these are not database records.</p>}
      {allocationReleased && <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100"><CheckCircle2 size={15}/></span>Your previous project was released and is available for another student. Choose a new project below.</p>}
      {activeAllocation && <div role="status" className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-blue-900">{["SUBMITTED", "UNDER_REVIEW"].includes(activeAllocation.status)?"You have a submitted project. You can browse available projects, but contact faculty if you need to change your selection.":"You already have an active project. You can browse available projects, but must release your current selection before choosing another."}</p><Link href="/student/my-project#change-project" className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-3 text-[11px] font-bold text-white transition hover:bg-blue-800">View current project <ArrowRight size={13} className="ml-1"/></Link></div>}

      {subjectFilter && (
        <div className="mb-5">
          <button type="button" onClick={closeSubject} className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800">
            <ArrowLeft size={15}/> All subject folders
          </button>
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">Could not load projects: {error}</p>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading subject folders…</div>
      ) : isSupabaseConfigured && !subjectFilter ? (
        subjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center">
            <Folder className="mx-auto text-blue-600" size={30}/>
            <h2 className="mt-4 text-sm font-bold">No published subject folders</h2>
            <p className="mt-2 text-xs text-slate-500">Published subjects will appear here when they are available.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <button
                type="button"
                key={subject.id}
                onClick={() => openSubject(subject.id)}
                className="product-card group rounded-2xl border border-white bg-white p-5 text-left shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                    <Folder size={24}/>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {subject.projectCount} available
                  </span>
                </div>
                <h2 className="mt-5 text-sm font-bold text-slate-900">{subject.subject_name}</h2>
                <p className="mt-1 text-[10px] font-semibold text-blue-600">{subject.subject_code}</p>
                <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{subject.description || "Browse projects belonging to this subject."}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                  Open subject folder <ArrowRight size={13}/>
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><FolderOpen size={25}/></span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Subject folder</div>
                <h2 className="mt-1 text-base font-bold text-slate-900">{selectedSubject?.subject_name ?? "Available projects"}</h2>
                {selectedSubject && <p className="mt-1 text-[10px] text-slate-500">{selectedSubject.subject_code}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in this folder" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs"/>
              </div>
              <select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs">
                <option>All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
          </header>

          {visibleProjects.length === 0 ? (
            <div className="p-10 text-center">
              <FolderOpen className="mx-auto text-slate-300" size={30}/>
              <h3 className="mt-4 text-sm font-bold text-slate-800">{projects.some((project) => project.subject_id === subjectFilter) ? "No projects match your filters" : "No available projects in this subject"}</h3>
              <p className="mt-2 text-xs text-slate-500">{projects.some((project) => project.subject_id === subjectFilter) ? "Try changing the search or difficulty." : "Projects may already be allocated or not yet published. Check back later or browse another subject."}</p>
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <div className="mb-4 text-xs font-semibold text-slate-500">{visibleProjects.length} project{visibleProjects.length === 1 ? "" : "s"} in this subject</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleProjects.map((project) => (
                  <article key={project.id} className="product-card flex flex-col rounded-2xl border border-white bg-white p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">{project.project_code}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${project.difficulty === "Easy" ? "bg-green-50 text-green-600" : project.difficulty === "Hard" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>{project.difficulty}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-900">{project.title}</h3>
                    <p className="mt-2 min-h-10 flex-1 text-xs leading-5 text-slate-500">{project.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(project.technologies ?? []).map((technology) => <span key={technology} className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{technology}</span>)}
                    </div>
                    <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
                      <Link href={`/student/projects/${project.id}`} className="flex items-center gap-1 text-xs font-bold text-blue-600">View details <ArrowRight size={13}/></Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
