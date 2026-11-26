"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { startPageTransition } from "@/components/page-transition-loader";

type Subject={id:string;subject_name:string;subject_code:string};
export function CreateProjectForm({role="admin"}:{role?:"admin"|"faculty"}){
 const [subjects,setSubjects]=useState<Subject[]>([]);
 const [subjectId,setSubjectId]=useState("");
 const [title,setTitle]=useState("");const [code,setCode]=useState("");const [difficulty,setDifficulty]=useState("Medium");const [description,setDescription]=useState("");const [problem,setProblem]=useState("");const [objectives,setObjectives]=useState("");const [requirements,setRequirements]=useState("");const [technologies,setTechnologies]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const router=useRouter();
 useEffect(()=>{if(!isSupabaseConfigured)return;createClient().from("subjects").select("id,subject_name,subject_code").order("subject_name").then(({data,error})=>{if(error)setError(error.message);else{setSubjects((data??[]) as Subject[]);if(data?.[0])setSubjectId(data[0].id);}});},[]);
 async function save(status:"DRAFT"|"PUBLISHED"){
  setError("");
  if(!isSupabaseConfigured){setError("Demo mode: project changes are not persisted. Configure Supabase first.");return;}
  if(!subjectId){setError("Select an assigned subject.");return;}
  setBusy(true);
  try{
   const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sign in is required.");
   const {data,error:insertError}=await supabase.from("projects").insert({
    subject_id:subjectId,project_code:code.trim().toUpperCase(),title:title.trim(),description:description.trim(),
    problem_statement:problem.trim(),objectives:objectives.trim(),
    requirements:{functional_requirements:requirements.split("\n").map(v=>v.trim()).filter(Boolean),development_guidelines:"Complete the work within the project duration configured by the university. Track daily checklist progress.",submission_guidelines:"Submit HTTPS Vercel deployment and GitHub repository URLs."},
    technologies:technologies.split(",").map(v=>v.trim()).filter(Boolean),difficulty,status,created_by:user.id,
   }).select("id").single();
   if(insertError)throw insertError;
   const destination = role==="admin"?`/admin/projects/${data.id}`:`/faculty/projects/${data.id}`;
   startPageTransition(destination);router.push(destination);router.refresh();
  }catch(reason){setError(reason instanceof Error?reason.message:"Unable to create project.");}
  finally{setBusy(false);}
 }
 return <DashboardShell role={role} title="Create Project" description="Build a detailed project requirement document.">{!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Supabase configuration is required to save projects.</p>}<form onSubmit={e=>{e.preventDefault();void save("PUBLISHED");}} className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Project title<input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="text-xs font-bold">Project code<input required maxLength={32} value={code} onChange={e=>setCode(e.target.value)} placeholder="PRJ-WD-105" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="text-xs font-bold">Subject<select required value={subjectId} onChange={e=>setSubjectId(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select a subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}</select></label><label className="text-xs font-bold">Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div><label className="mt-4 block text-xs font-bold">Short description<textarea required maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><label className="mt-4 block text-xs font-bold">Problem statement<textarea required value={problem} onChange={e=>setProblem(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><label className="mt-4 block text-xs font-bold">Project objectives<textarea value={objectives} onChange={e=>setObjectives(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><label className="mt-4 block text-xs font-bold">Functional requirements <span className="font-normal text-slate-400">(one per line)</span><textarea required value={requirements} onChange={e=>setRequirements(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><label className="mt-4 block text-xs font-bold">Technologies <span className="font-normal text-slate-400">(comma separated)</span><input value={technologies} onChange={e=>setTechnologies(e.target.value)} placeholder="Next.js, TypeScript, Supabase" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>{error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="mt-5 flex flex-wrap gap-3"><button type="button" aria-busy={busy} onClick={()=>void save("DRAFT")} disabled={busy} className="h-11 rounded-lg border border-slate-200 px-5 text-xs font-bold disabled:opacity-50">Save draft</button><button aria-busy={busy} disabled={busy||!isSupabaseConfigured} className="h-11 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white disabled:opacity-50">{busy?"Saving…":"Publish project"}</button></div></form></DashboardShell>
}
export default function CreateProject(){return <CreateProjectForm/>}
