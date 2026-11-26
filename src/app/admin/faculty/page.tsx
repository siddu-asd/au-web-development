"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  GraduationCap,
  MailPlus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type FacultyMember = {
  id: string;
  full_name: string;
  registration_number: string;
  email: string;
  account_status: string;
  subjectIds: string[];
};
type Subject = { id: string; subject_name: string; subject_code: string };
type EditorMode = "invite" | "edit" | null;

const demoFaculty: FacultyMember[] = [
  { id: "1", full_name: "Aisha Malik", registration_number: "EMP101", email: "aisha.malik@au.edu", account_status: "ACTIVE", subjectIds: [] },
  { id: "2", full_name: "Rohan Gupta", registration_number: "EMP118", email: "rohan.gupta@au.edu", account_status: "ACTIVE", subjectIds: [] },
  { id: "3", full_name: "Neha Rao", registration_number: "EMP071", email: "neha.rao@au.edu", account_status: "ACTIVE", subjectIds: [] },
];

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<FacultyMember[]>(isSupabaseConfigured ? [] : demoFaculty);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<EditorMode>(null);
  const [editing, setEditing] = useState<FacultyMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyFacultyId, setBusyFacultyId] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const [{ data: people, error: peopleError }, { data: subjectRows, error: subjectError }, { data: assignments, error: assignmentError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,registration_number,email,account_status").eq("role", "FACULTY").order("full_name"),
      supabase.from("subjects").select("id,subject_name,subject_code").order("subject_name"),
      supabase.from("subject_faculty").select("faculty_id,subject_id"),
    ]);
    if (peopleError || subjectError || assignmentError) {
      throw new Error(peopleError?.message ?? subjectError?.message ?? assignmentError?.message ?? "Unable to load faculty records.");
    }
    const assignmentsByFaculty = new Map<string, string[]>();
    for (const assignment of assignments ?? []) {
      const current = assignmentsByFaculty.get(assignment.faculty_id) ?? [];
      current.push(assignment.subject_id);
      assignmentsByFaculty.set(assignment.faculty_id, current);
    }
    setFaculty((people ?? []).map((person) => ({
      ...person,
      subjectIds: assignmentsByFaculty.get(person.id) ?? [],
    })) as FacultyMember[]);
    setSubjects((subjectRows ?? []) as Subject[]);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    async function load() {
      try {
        await reload();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load faculty.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reload]);

  const visibleFaculty = useMemo(() => faculty.filter((person) => {
    const assignedSubjects = person.subjectIds
      .map((id) => subjects.find((subject) => subject.id === id)?.subject_name ?? "")
      .join(" ");
    return `${person.full_name} ${person.registration_number} ${person.email} ${person.account_status} ${assignedSubjects}`
      .toLowerCase()
      .includes(search.toLowerCase());
  }), [faculty, search, subjects]);

  function openInvite() {
    setMode("invite");
    setEditing(null);
    setName("");
    setEmail("");
    setEmployeeId("");
    setSubjectId("");
    setError("");
    setMessage("");
  }

  function openEdit(person: FacultyMember) {
    setMode("edit");
    setEditing(person);
    setName(person.full_name);
    setEmployeeId(person.registration_number);
    setEmail(person.email);
    setSelectedSubjectIds(person.subjectIds);
    setError("");
    setMessage("");
  }

  function closeEditor() {
    if (busy) return;
    setMode(null);
    setEditing(null);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isSupabaseConfigured) {
      setError("Demo mode: faculty changes are not persisted.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "invite") {
        const response = await fetch("/api/admin/faculty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: name, email, employeeId, subjectId }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Invitation failed.");
        await reload();
        setMode(null);
        setMessage("Faculty invitation sent.");
      } else if (mode === "edit" && editing) {
        const { error: updateError } = await createClient().rpc("admin_update_faculty", {
          p_faculty_id: editing.id,
          p_full_name: name.trim(),
          p_employee_id: employeeId.trim(),
          p_subject_ids: selectedSubjectIds,
        });
        if (updateError) throw updateError;
        await reload();
        setMode(null);
        setEditing(null);
        setMessage(`${name.trim()}’s faculty profile and subject assignments were updated.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : mode === "invite" ? "Faculty invitation failed." : "Faculty changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccount(person: FacultyMember) {
    if (!isSupabaseConfigured) return;
    const nextStatus = person.account_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`${nextStatus === "INACTIVE" ? "Deactivate" : "Reactivate"} ${person.full_name}? ${nextStatus === "INACTIVE" ? "They will be signed out and blocked from faculty routes." : "They will be able to sign in again."}`)) return;
    setError("");
    setMessage("");
    setBusyFacultyId(person.id);
    try {
      const { data, error: updateError } = await createClient()
        .from("profiles")
        .update({ account_status: nextStatus })
        .eq("id", person.id)
        .eq("role", "FACULTY")
        .select("id,account_status")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Account status was not changed. Check your admin permissions.");
      setFaculty((current) => current.map((item) => item.id === person.id ? { ...item, account_status: data.account_status } : item));
      setMessage(`${person.full_name} is now ${nextStatus.toLowerCase()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update faculty account access.");
    } finally {
      setBusyFacultyId("");
    }
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <DashboardShell role="admin" title="Faculty Management" description="Invite faculty, manage subject assignments, and control account access.">
      {!isSupabaseConfigured && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">Demo faculty records. Live invitations require Supabase and a server-only service role key.</p>}
      {error && !mode && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Faculty accounts", faculty.length, "bg-blue-50 text-blue-700"],
          ["Active accounts", faculty.filter((person) => person.account_status === "ACTIVE").length, "bg-emerald-50 text-emerald-700"],
          ["Subject assignments", faculty.reduce((total, person) => total + person.subjectIds.length, 0), "bg-violet-50 text-violet-700"],
        ].map(([label, count, color]) => (
          <div key={String(label)} className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{loading ? "—" : count}</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${color}`}>{label === "Subject assignments" ? "Assigned teaching areas" : "University directory"}</span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white/90 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-sm font-bold text-slate-950">Faculty directory</h2><p className="mt-1 text-[10px] text-slate-400">{visibleFaculty.length} faculty member{visibleFaculty.length === 1 ? "" : "s"}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={15}/><input aria-label="Search faculty" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search faculty or subjects" className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs"/></label>
            <button type="button" onClick={openInvite} disabled={!isSupabaseConfigured} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-50"><Plus size={14}/>Invite faculty</button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5"><div className="h-12 animate-pulse rounded-xl bg-slate-100"/><div className="h-12 animate-pulse rounded-xl bg-slate-100"/><div className="h-12 animate-pulse rounded-xl bg-slate-100"/></div>
        ) : error && faculty.length === 0 ? (
          <div role="alert" className="p-8 text-center text-sm text-red-700">{error}</div>
        ) : visibleFaculty.length === 0 ? (
          <div className="px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><GraduationCap size={23}/></span><h3 className="mt-4 text-sm font-bold text-slate-900">{faculty.length ? "No faculty match your search" : "No faculty accounts yet"}</h3><p className="mt-2 text-xs text-slate-500">{faculty.length ? "Try another name, employee ID, or subject." : "Invite a faculty member to start assigning subjects."}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[9px] uppercase tracking-[.13em] text-slate-400"><tr>{["Faculty member", "Employee ID", "Email", "Assigned subjects", "Account", "Actions"].map((heading) => <th key={heading} className="px-5 py-3.5 font-bold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100/80">
                {visibleFaculty.map((person) => {
                  const assigned = person.subjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is Subject => Boolean(subject));
                  return (
                    <tr key={person.id} className="transition-colors hover:bg-blue-50/25">
                      <td className="px-5 py-4"><div className="font-bold text-slate-900">{person.full_name}</div><div className="mt-1 text-[9px] text-slate-400">{person.id.slice(0, 8)}</div></td>
                      <td className="px-5 py-4 font-medium text-slate-600">{person.registration_number}</td>
                      <td className="px-5 py-4 text-slate-600">{person.email}</td>
                      <td className="px-5 py-4">{assigned.length ? <div className="flex max-w-[280px] flex-wrap gap-1">{assigned.map((subject) => <span key={subject.id} className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">{subject.subject_code}</span>)}</div> : <span className="text-[10px] text-slate-400">Not assigned</span>}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ring-inset ${person.account_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>{person.account_status}</span></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2">
                        <button type="button" disabled={!isSupabaseConfigured} onClick={() => openEdit(person)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"><Pencil size={12}/>Edit</button>
                        <button type="button" disabled={!isSupabaseConfigured || busyFacultyId === person.id} onClick={() => void toggleAccount(person)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition disabled:opacity-50 ${person.account_status === "ACTIVE" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                          {person.account_status === "ACTIVE" ? <UserRoundX size={12}/> : <ShieldCheck size={12}/>}
                          {busyFacultyId === person.id ? "Saving…" : person.account_status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                        </button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mode && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditor();
        }}>
          <form onSubmit={(event) => void submit(event)} className="animate-in max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-blue-600">Faculty directory</p><h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">{mode === "invite" ? "Invite faculty member" : "Edit faculty profile"}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{mode === "invite" ? "An account invitation will be sent to their email." : "Update faculty details and subject assignments. Existing project history is retained."}</p></div>
              <button type="button" onClick={closeEditor} disabled={busy} aria-label="Close dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100"><X size={17}/></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Full name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
              <label className="text-xs font-bold text-slate-700">Employee ID<input required minLength={2} maxLength={64} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
              {mode === "invite" && <label className="text-xs font-bold text-slate-700 sm:col-span-2">Institutional email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>}
            </div>
            {mode === "invite" ? (
              <label className="mt-4 block text-xs font-bold text-slate-700">Initial subject assignment<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">No subject yet</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subject_code} — {subject.subject_name}</option>)}</select></label>
            ) : (
              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-slate-700">Assigned subjects</legend>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">Choose all subjects this faculty member should manage.</p>
                <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 text-xs transition hover:bg-slate-50">
                      <input type="checkbox" checked={selectedSubjectIds.includes(subject.id)} onChange={() => toggleSubject(subject.id)} className="mt-0.5 accent-blue-600"/>
                      <span><span className="block font-semibold text-slate-800">{subject.subject_name}</span><span className="mt-0.5 block text-[9px] text-slate-400">{subject.subject_code}</span></span>
                    </label>
                  ))}
                  {subjects.length === 0 && <p className="text-xs text-slate-500">Create a subject before assigning faculty.</p>}
                </div>
              </fieldset>
            )}
            {mode === "edit" && <p className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-[10px] leading-5 text-blue-800"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Account access is managed separately. Deactivation signs the faculty member out and blocks protected faculty routes.</p>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditor} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"><X size={13}/>Cancel</button>
              <button type="submit" disabled={busy || (mode === "edit" && !editing)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/15 disabled:opacity-50">{mode === "invite" ? <MailPlus size={14} /> : <Check size={14} />}{busy ? mode === "invite" ? "Sending invitation…" : "Saving changes…" : mode === "invite" ? "Send invitation" : "Save faculty profile"}</button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
