"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Folder, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type PortalRole = "admin" | "faculty";
type Subject = { id: string; subject_code: string; subject_name: string };
type Project = {
  id: string;
  project_code: string;
  title: string;
  status: string;
  difficulty: string;
  subject_id: string;
};

const demoSubjects: Subject[] = [
  { id: "demo-web", subject_code: "WEB", subject_name: "Web Development" },
  { id: "demo-db", subject_code: "DB", subject_name: "Database Systems" },
];
const demoProjects: Project[] = [
  { id: "101", project_code: "PRJ-WD-101", title: "Campus Event Hub", status: "PUBLISHED", difficulty: "Medium", subject_id: "demo-web" },
  { id: "102", project_code: "PRJ-WD-102", title: "Smart Expense Tracker", status: "PUBLISHED", difficulty: "Easy", subject_id: "demo-web" },
  { id: "103", project_code: "PRJ-DB-103", title: "University Library Portal", status: "DRAFT", difficulty: "Hard", subject_id: "demo-db" },
];

export function SubjectProjectFolders({
  role,
  compact = false,
  showActions = true,
}: {
  role: PortalRole;
  compact?: boolean;
  showActions?: boolean;
}) {
  const [subjects, setSubjects] = useState<Subject[]>(isSupabaseConfigured ? [] : demoSubjects);
  const [projects, setProjects] = useState<Project[]>(isSupabaseConfigured ? [] : demoProjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  const basePath = role === "admin" ? "/admin/projects" : "/faculty/projects";
  const createPath = `${basePath}/create`;
  const importPath = `${basePath}/import`;
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    async function load() {
      try {
        const supabase = createClient();
        const [subjectsResult, projectsResult] = await Promise.all([
          supabase.from("subjects").select("id,subject_code,subject_name").order("subject_name"),
          supabase.from("projects").select("id,project_code,title,status,difficulty,subject_id").order("created_at", { ascending: false }),
        ]);
        if (subjectsResult.error) throw subjectsResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (!active) return;
        setSubjects(subjectsResult.data ?? []);
        setProjects(projectsResult.data ?? []);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load subject folders.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const projectsBySubject = useMemo(() => {
    const grouped = new Map<string, Project[]>();
    for (const project of projects) {
      const current = grouped.get(project.subject_id) ?? [];
      current.push(project);
      grouped.set(project.subject_id, current);
    }
    return grouped;
  }, [projects]);

  const visibleProjects = (projectsBySubject.get(selectedSubjectId) ?? []).filter((project) =>
    `${project.title} ${project.project_code} ${project.status} ${project.difficulty}`.toLowerCase().includes(search.toLowerCase()),
  );

  const sectionClass = compact
    ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{selectedSubject ? selectedSubject.subject_name : "Projects by subject"}</h2>
          <p className="mt-1 text-xs text-slate-500">{selectedSubject ? `Projects in ${selectedSubject.subject_code}` : "Open a subject folder to view its projects."}</p>
        </div>
        {showActions && (
          <div className="flex gap-2">
            <Link href={importPath} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50"><FileSpreadsheet size={14}/>Bulk import</Link>
            <Link href={createPath} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[11px] font-bold text-white hover:bg-blue-700"><Plus size={14}/>Create project</Link>
          </div>
        )}
      </div>

      {!isSupabaseConfigured && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">Demo folders only; these projects are not saved.</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">Could not load projects: {error}</p>}

      {loading ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">Loading subject folders…</div>
      ) : selectedSubject ? (
        <div className="mt-5">
          <button type="button" onClick={() => { setSelectedSubjectId(""); setSearch(""); }} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800"><ArrowLeft size={14}/>All subject folders</button>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">{visibleProjects.length} project{visibleProjects.length === 1 ? "" : "s"} in this folder</span>
            <label className="relative block w-full sm:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this folder" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs"/></label>
          </div>
          {visibleProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              {projectsBySubject.has(selectedSubjectId) ? "No projects match your search." : "This subject folder has no projects yet."}
            </div>
          ) : (
            <div className={`grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {visibleProjects.map((project) => (
                <Link key={project.id} href={`${basePath}/${project.id}`} className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30">
                  <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-bold text-slate-400">{project.project_code}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${project.status === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{project.status}</span></div>
                  <h3 className="mt-3 text-xs font-bold text-slate-900">{project.title}</h3>
                  <p className="mt-2 text-[10px] text-slate-500">{project.difficulty}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">Open project <ArrowRight size={12}/></span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : subjects.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <Folder className="mx-auto text-slate-300" size={26}/>
          <p className="mt-3 text-xs text-slate-500">No subjects are available to your account.</p>
        </div>
      ) : (
        <div className={`mt-5 grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {subjects.map((subject) => {
            const count = projectsBySubject.get(subject.id)?.length ?? 0;
            return (
              <button type="button" key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40">
                <div className="flex items-start justify-between gap-2"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100 text-blue-700 transition group-hover:bg-blue-200"><Folder size={21}/></span><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-600">{count} project{count === 1 ? "" : "s"}</span></div>
                <h3 className="mt-4 text-xs font-bold text-slate-900">{subject.subject_name}</h3>
                <p className="mt-1 text-[10px] font-semibold text-blue-600">{subject.subject_code}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">Open folder <ArrowRight size={12}/></span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
