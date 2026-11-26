"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, Check, Edit3, Plus, Search, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Subject = {
  id: string;
  subject_code: string;
  subject_name: string;
  status: PublicationStatus;
  description: string | null;
};

const demoSubjects: Subject[] = [
  { id: "1", subject_code: "WD 301", subject_name: "Web Development", status: "PUBLISHED", description: "Modern responsive web applications." },
  { id: "2", subject_code: "DB 302", subject_name: "Database Management", status: "PUBLISHED", description: "Relational data systems." },
  { id: "3", subject_code: "PY 303", subject_name: "Python Programming", status: "PUBLISHED", description: "Application development with Python." },
  { id: "4", subject_code: "DS 304", subject_name: "Data Structures", status: "DRAFT", description: "Algorithms and data structures." },
];

const statusClass: Record<PublicationStatus, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>(isSupabaseConfigured ? [] : demoSubjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PublicationStatus>("ALL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PublicationStatus>("PUBLISHED");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    async function load() {
      try {
        const { data, error: loadError } = await createClient()
          .from("subjects")
          .select("id,subject_code,subject_name,status,description")
          .order("subject_name");
        if (loadError) throw loadError;
        if (active) setSubjects((data ?? []) as Subject[]);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load subjects.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => subjects.filter((subject) =>
    (statusFilter === "ALL" || subject.status === statusFilter) &&
    `${subject.subject_name} ${subject.subject_code} ${subject.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [subjects, search, statusFilter]);
  const counts = useMemo(() => ({
    published: subjects.filter((subject) => subject.status === "PUBLISHED").length,
    draft: subjects.filter((subject) => subject.status === "DRAFT").length,
    archived: subjects.filter((subject) => subject.status === "ARCHIVED").length,
  }), [subjects]);

  function openEditor(subject: Subject) {
    setEditing(subject);
    setCode(subject.subject_code);
    setName(subject.subject_name);
    setDescription(subject.description ?? "");
    setStatus(subject.status);
    setError("");
    setMessage("");
  }

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setError("");
  }

  async function saveSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !isSupabaseConfigured) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data, error: updateError } = await createClient()
        .from("subjects")
        .update({
          subject_code: code.trim().toUpperCase(),
          subject_name: name.trim(),
          description: description.trim() || null,
          status,
        })
        .eq("id", editing.id)
        .select("id,subject_code,subject_name,status,description")
        .single();
      if (updateError) throw updateError;
      const updated = data as Subject;
      setSubjects((current) => current.map((subject) => subject.id === updated.id ? updated : subject));
      setEditing(null);
      setMessage(`${updated.subject_name} saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save subject changes.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSubject(subject: Subject) {
    if (!isSupabaseConfigured || subject.status === "ARCHIVED" || archivingId) return;
    if (!window.confirm(`Archive “${subject.subject_name}”? It will no longer appear as an active subject to students. Existing projects and academic history will be kept.`)) return;
    setError("");
    setMessage("");
    setArchivingId(subject.id);
    try {
      const { data, error: archiveError } = await createClient()
        .from("subjects")
        .update({ status: "ARCHIVED" })
        .eq("id", subject.id)
        .select("id,subject_code,subject_name,status,description")
        .single();
      if (archiveError) throw archiveError;
      const updated = data as Subject;
      setSubjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`${updated.subject_name} archived. Its projects and history are preserved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to archive subject.");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <DashboardShell role="admin" title="Manage Subjects" description="Create, update, and publish the subject folders used across the portal.">
      {!isSupabaseConfigured && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">Demo records only. Subject edits require a configured Supabase project.</p>}
      {error && !editing && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Published", counts.published, "bg-emerald-50 text-emerald-700"],
          ["Draft", counts.draft, "bg-amber-50 text-amber-700"],
          ["Archived", counts.archived, "bg-slate-100 text-slate-600"],
        ].map(([label, count, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{loading ? "—" : count}</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}>{label === "Published" ? "Visible to students" : label === "Draft" ? "Not published" : "History retained"}</span>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white/90 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Subject directory</h2>
            <p className="mt-1 text-[10px] text-slate-400">{filtered.length} subject{filtered.length === 1 ? "" : "s"} shown</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-56">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
              <input aria-label="Search subjects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subjects" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs"/>
            </label>
            <select aria-label="Filter subjects by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | PublicationStatus)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700">
              <option value="ALL">All statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Link href="/admin/subjects/create" className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"><Plus size={14}/>Add subject</Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5"><div className="h-12 animate-pulse rounded-xl bg-slate-100"/><div className="h-12 animate-pulse rounded-xl bg-slate-100"/><div className="h-12 animate-pulse rounded-xl bg-slate-100"/></div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen size={22}/></span>
            <h3 className="mt-4 text-sm font-bold text-slate-900">{subjects.length ? "No subjects match those filters" : "No subjects yet"}</h3>
            <p className="mt-2 text-xs text-slate-500">{subjects.length ? "Try another search or status." : "Create the first subject folder to organize academic projects."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[9px] uppercase tracking-[.13em] text-slate-400">
                <tr>{["Subject", "Code", "Description", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-3.5 font-bold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((subject) => (
                  <tr key={subject.id} className="transition-colors hover:bg-blue-50/25">
                    <td className="px-5 py-4"><div className="font-bold text-slate-900">{subject.subject_name}</div><div className="mt-1 text-[9px] text-slate-400">{subject.id.slice(0, 8)}</div></td>
                    <td className="px-5 py-4 font-medium text-slate-600">{subject.subject_code}</td>
                    <td className="max-w-sm px-5 py-4 text-[11px] leading-5 text-slate-500">{subject.description || "No description"}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ring-inset ${statusClass[subject.status]}`}>{subject.status}</span></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-2">
                      <button type="button" disabled={!isSupabaseConfigured} onClick={() => openEditor(subject)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"><Edit3 size={12}/>Edit</button>
                      {subject.status !== "ARCHIVED" && <button type="button" aria-busy={archivingId === subject.id} disabled={!isSupabaseConfigured || archivingId !== null} onClick={() => void archiveSubject(subject)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"><Archive size={12}/>{archivingId === subject.id ? "Archiving…" : "Archive"}</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditor();
        }}>
          <form onSubmit={(event) => void saveSubject(event)} className="animate-in w-full max-w-xl rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-blue-600">Subject management</p><h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">Edit subject</h2><p className="mt-1 text-xs text-slate-500">Update details and publishing status without removing project history.</p></div>
              <button type="button" onClick={closeEditor} disabled={saving} aria-label="Close subject editor" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"><X size={17}/></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Subject code<input required maxLength={24} value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
              <label className="text-xs font-bold text-slate-700">Subject name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-700">Description<textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
            <label className="mt-4 block text-xs font-bold text-slate-700">Publication status<select value={status} onChange={(event) => setStatus(event.target.value as PublicationStatus)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditor} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"><X size={13}/>Cancel</button>
              <button type="submit" aria-busy={saving} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/15 disabled:opacity-50"><Check size={14}/>{saving ? "Saving changes…" : "Save subject"}</button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
