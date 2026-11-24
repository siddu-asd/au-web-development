"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FileSpreadsheet, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Project={id:string;project_code:string;title:string;status:string;difficulty:string;subjects:{subject_name:string}|{subject_name:string}[]|null};
const demos:Project[]=[
 {id:"101",project_code:"PRJ-WD-101",title:"Campus Event Hub",status:"PUBLISHED",difficulty:"Medium",subjects:{subject_name:"Web Development"}},
 {id:"102",project_code:"PRJ-WD-102",title:"Smart Expense Tracker",status:"PUBLISHED",difficulty:"Easy",subjects:{subject_name:"Web Development"}},
 {id:"103",project_code:"PRJ-WD-103",title:"University Library Portal",status:"DRAFT",difficulty:"Hard",subjects:{subject_name:"Web Development"}},
 {id:"104",project_code:"PRJ-WD-104",title:"Campus Connect Portal",status:"PUBLISHED",difficulty:"Medium",subjects:{subject_name:"Web Development"}},
];
export default function Projects(){
 const [projects,setProjects]=useState<Project[]>(demos);const [search,setSearch]=useState("");const [loading,setLoading]=useState(isSupabaseConfigured);const [error,setError]=useState("");
 useEffect(()=>{if(!isSupabaseConfigured)return;let active=true;createClient().from("projects").select("id,project_code,title,status,difficulty,subjects(subject_name)").order("created_at",{ascending:false}).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setProjects((data??[]) as unknown as Project[]);setLoading(false);});return()=>{active=false;};},[]);
 const visible=useMemo(()=>projects.filter(p=>`${p.title} ${p.project_code}`.toLowerCase().includes(search.toLowerCase())),[projects,search]);
 return <DashboardShell role="admin" title="Manage Projects" description="Create, publish and version project requirements.">{!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo project records are not persisted.</p>}<div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs"/></div><div className="flex gap-2"><Link href="/admin/projects/import" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"><FileSpreadsheet size={15}/>Bulk CSV import</Link><Link href="/admin/projects/create" className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Create project</Link></div></div>{error&&<p role="alert" className="mb-4 text-xs text-red-600">Could not load projects: {error}</p>}{loading?<div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Loading projects…</div>:visible.length===0?<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No projects found.</div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(p=>{const subject=Array.isArray(p.subjects)?p.subjects[0]?.subject_name:p.subjects?.subject_name;return <Link href={`/admin/projects/${p.id}`} key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex justify-between"><span className="text-[10px] text-slate-400">{p.project_code}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status==="PUBLISHED"?"bg-green-50 text-green-600":p.status==="DRAFT"?"bg-slate-100 text-slate-500":"bg-orange-50 text-orange-600"}`}>{p.status}</span></div><h2 className="mt-4 text-sm font-bold">{p.title}</h2><p className="mt-2 text-xs text-slate-500">{subject??"Subject"} · {p.difficulty}</p></Link>})}</div>}</DashboardShell>;
}
