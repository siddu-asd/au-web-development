"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Subject={id:string;subject_code:string;subject_name:string;status:string;description:string|null};
const demoSubjects:Subject[]=[
 {id:"1",subject_code:"WD 301",subject_name:"Web Development",status:"PUBLISHED",description:"Modern responsive web applications."},
 {id:"2",subject_code:"DB 302",subject_name:"Database Management",status:"PUBLISHED",description:"Relational data systems."},
 {id:"3",subject_code:"PY 303",subject_name:"Python Programming",status:"PUBLISHED",description:"Application development with Python."},
 {id:"4",subject_code:"DS 304",subject_name:"Data Structures",status:"DRAFT",description:"Algorithms and data structures."},
];
export default function Subjects(){
 const [subjects,setSubjects]=useState<Subject[]>(demoSubjects);const [search,setSearch]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(isSupabaseConfigured);
 useEffect(()=>{if(!isSupabaseConfigured)return;let active=true;createClient().from("subjects").select("id,subject_code,subject_name,status,description").order("subject_name").then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setSubjects((data??[]) as Subject[]);setLoading(false);});return()=>{active=false;};},[]);
 const filtered=useMemo(()=>subjects.filter(s=>`${s.subject_name} ${s.subject_code}`.toLowerCase().includes(search.toLowerCase())),[subjects,search]);
 return <DashboardShell role="admin" title="Manage Subjects" description="Create subjects and assign faculty ownership.">{!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo records; changes are not persisted until Supabase is configured.</p>}<div className="mb-5 flex justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs"/></div><Link href="/admin/subjects/create" className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add subject</Link></div>{error&&<p role="alert" className="mb-4 text-xs text-red-600">Could not load subjects: {error}</p>}{loading?<div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Loading subjects…</div>:<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Code</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(s=><tr key={s.id}><td className="px-5 py-4 font-bold">{s.subject_name}</td><td className="px-5 py-4 text-slate-500">{s.subject_code}</td><td className="max-w-sm px-5 py-4 text-slate-500">{s.description}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${s.status==="PUBLISHED"?"bg-green-50 text-green-600":"bg-slate-100 text-slate-500"}`}>{s.status}</span></td></tr>)}</tbody></table>{filtered.length===0&&<p className="p-8 text-center text-xs text-slate-500">No matching subjects.</p>}</div>}</DashboardShell>;
}
