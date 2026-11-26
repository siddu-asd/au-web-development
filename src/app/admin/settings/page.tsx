"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Info, Save, Settings2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

export default function SettingsPage() {
  const [duration, setDuration] = useState("10");
  const [savedDuration, setSavedDuration] = useState(10);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    async function load() {
      try {
        const { data, error: settingsError } = await createClient()
          .from("portal_settings")
          .select("project_duration_days,updated_at")
          .eq("id", 1)
          .single();
        if (settingsError) throw settingsError;
        if (!active) return;
        setDuration(String(data.project_duration_days));
        setSavedDuration(data.project_duration_days);
        setUpdatedAt(data.updated_at);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load portal settings. Apply the latest Supabase migrations.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const days = Number(duration);
    if (!Number.isInteger(days) || days < 1 || days > 10) {
      setError("Choose a whole number between 1 and 10 days.");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Demo mode: settings are not persisted.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sign in is required.");
      const { data, error: updateError } = await supabase
        .from("portal_settings")
        .update({ project_duration_days: days, updated_by: user.id })
        .eq("id", 1)
        .select("project_duration_days,updated_at")
        .single();
      if (updateError) throw updateError;
      setSavedDuration(data.project_duration_days);
      setDuration(String(data.project_duration_days));
      setUpdatedAt(data.updated_at);
      setMessage("Project duration saved. New allocations will use this schedule.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save portal settings.");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = Number(duration) !== savedDuration;

  return (
    <DashboardShell role="admin" title="Portal Settings" description="Configure project workflows for new student allocations.">
      {!isSupabaseConfigured && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">Demo mode — live settings require Supabase and the latest migrations.</p>}
      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check size={16}/>{message}</p>}

      <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
        <form onSubmit={(event) => void save(event)} className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Settings2 size={21}/></span>
            <div><h2 className="text-sm font-bold text-slate-950">Project workflow</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">Control the completion window applied when a student selects a project.</p></div>
          </div>

          <label className="mt-6 block text-xs font-bold text-slate-700">Project completion window
            <span className="relative mt-2 block">
              <Clock3 size={16} className="absolute left-3.5 top-3.5 text-slate-400"/>
              <input type="number" inputMode="numeric" min={1} max={10} step={1} required disabled={loading} value={duration} onChange={(event) => setDuration(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-16 text-sm font-semibold text-slate-900"/>
              <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400">days</span>
            </span>
          </label>
          <p className="mt-2 text-[10px] leading-5 text-slate-500">Choose 1–10 days. The checklist template supports up to ten project days.</p>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-[10px] leading-5 text-blue-800">
            <Info size={14} className="mt-0.5 shrink-0"/>
            <p>This affects <strong>new allocations only</strong>. Existing students keep their current saved deadlines, and their project history is not changed.</p>
          </div>
          {updatedAt && <p className="mt-4 text-[9px] text-slate-400">Last saved {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt))}</p>}

          <button type="submit" disabled={saving || loading || !isDirty || !isSupabaseConfigured} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
            <Save size={14}/>{saving ? "Saving settings…" : "Save project settings"}
          </button>
        </form>

        <aside className="relative overflow-hidden rounded-[1.75rem] bg-[#121b2e] p-6 text-white shadow-[0_22px_60px_-38px_rgba(15,23,42,.65)]">
          <div aria-hidden="true" className="ambient-glow absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"/>
          <div className="relative">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-blue-300">Current workflow</p>
            <h2 className="mt-2 text-lg font-bold">Student project cycle</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[.08] bg-white/[.05] p-4"><p className="text-[9px] uppercase tracking-wide text-slate-400">Duration</p><p className="mt-2 text-3xl font-bold">{loading ? "—" : savedDuration}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p></div>
              <div className="rounded-2xl border border-white/[.08] bg-white/[.05] p-4"><p className="text-[9px] uppercase tracking-wide text-slate-400">History</p><p className="mt-2 text-sm font-bold text-emerald-300">Preserved</p><p className="mt-1 text-[9px] leading-4 text-slate-400">Existing allocations stay unchanged</p></div>
            </div>
            <div className="mt-5 space-y-3">
              {["Student selects an available project", "Deadline is calculated from this setting", "Progress and submissions stay linked"].map((item, index) => <div key={item} className="flex items-center gap-3 text-[10px] text-slate-300"><span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-500/15 text-[9px] font-bold text-blue-200">{index + 1}</span>{item}</div>)}
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
