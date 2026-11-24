"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowRight, Search } from "lucide-react";
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
  subject?: { subject_name: string } | { subject_name: string }[] | null;
  available?: string;
};

const demoProjects:Project[]=[
 {id:"101",project_code:"PRJ-WD-101",title:"Campus Event Hub",description:"An event discovery and registration platform.",difficulty:"Medium",technologies:["React","Supabase"],available:"18"},
 {id:"102",project_code:"PRJ-WD-102",title:"Smart Expense Tracker",description:"Track spending and visualize monthly budgets.",difficulty:"Easy",technologies:["JavaScript","Charts"],available:"12"},
 {id:"103",project_code:"PRJ-WD-103",title:"University Library Portal",description:"Search catalogues and manage book reservations.",difficulty:"Hard",technologies:["Next.js","PostgreSQL"],available:"22"},
 {id:"104",project_code:"PRJ-WD-104",title:"Campus Connect Portal",description:"A student community for announcements and projects.",difficulty:"Medium",technologies:["React","Firebase"],available:"16"},
];

export default function StudentProjects(){
 const [projects,setProjects]=useState<Project[]>(demoProjects);
 const [search,setSearch]=useState("");
 const [difficulty,setDifficulty]=useState("All difficulties");
 const [subjectFilter,setSubjectFilter]=useState("");
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;
  createClient().rpc("get_available_projects").then(({data,error})=>{
   if(!active)return;
   setSubjectFilter(new URLSearchParams(window.location.search).get("subject")??"");
   if(error){setError(error.message);setLoading(false);return;}
   setProjects((data??[]) as unknown as Project[]);setLoading(false);
  });
  return ()=>{active=false;};
 },[]);
 const visible=useMemo(()=>projects.filter(p=>
  (difficulty==="All difficulties"||p.difficulty===difficulty)&&
  (!subjectFilter||p.subject_id===subjectFilter)&&
  `${p.title} ${p.project_code} ${p.description??""}`.toLowerCase().includes(search.toLowerCase())
 ),[projects,search,difficulty,subjectFilter]);
 return <DashboardShell role="student" title="Available Projects" description="Browse published projects available for allocation.">
  {!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Sample projects for preview only; these are not database records.</p>}
  <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs"/></div><select aria-label="Filter by difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"><option>All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
  {error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">Could not load projects: {error}</p>}
  {loading?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading published projects…</div>:visible.length===0?<div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-sm font-bold">No projects found</h2><p className="mt-2 text-xs text-slate-500">Try another search or check back later.</p></div>:
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map(p=>{const subject=p.subject_name??(Array.isArray(p.subject)?p.subject[0]?.subject_name:p.subject?.subject_name);return <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">{p.project_code}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.difficulty==="Easy"?"bg-green-50 text-green-600":p.difficulty==="Hard"?"bg-red-50 text-red-600":"bg-orange-50 text-orange-600"}`}>{p.difficulty}</span></div><h2 className="mt-4 text-base font-bold">{p.title}</h2><p className="mt-1 text-[10px] font-semibold text-blue-600">{subject??"Project"}</p><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{p.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{(p.technologies??[]).map(t=><span key={t} className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{t}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-[10px] text-slate-400">{p.available??"Available"} spots available</span><Link href={`/student/projects/${p.id}`} className="flex items-center gap-1 text-xs font-bold text-blue-600">View details <ArrowRight size={13}/></Link></div></article>})}</div>}
 </DashboardShell>;
}
