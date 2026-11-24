"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Subject={id:string;subject_code:string;subject_name:string;description:string|null;total:number;available:number};
const demos:Subject[]=[
 {id:"1",subject_code:"WD 301",subject_name:"Web Development",description:"Build modern, responsive web applications.",total:24,available:18},
 {id:"2",subject_code:"DB 302",subject_name:"Database Management",description:"Design reliable and normalized data systems.",total:16,available:12},
 {id:"3",subject_code:"PY 303",subject_name:"Python Programming",description:"Create practical applications with Python.",total:14,available:9},
 {id:"4",subject_code:"DS 304",subject_name:"Data Structures",description:"Implement efficient algorithms and structures.",total:20,available:15},
 {id:"5",subject_code:"SE 305",subject_name:"Software Engineering",description:"Plan and deliver production-quality systems.",total:12,available:7},
 {id:"6",subject_code:"CN 306",subject_name:"Computer Networks",description:"Explore network protocols and services.",total:10,available:6},
];
export default function StudentSubjects(){
 const [subjects,setSubjects]=useState<Subject[]>(demos);const [search,setSearch]=useState("");const [loading,setLoading]=useState(isSupabaseConfigured);const [error,setError]=useState("");
 useEffect(()=>{
  if(!isSupabaseConfigured)return;let active=true;
  async function load(){
   const supabase=createClient();
   const [{data:subjectRows,error:subjectError},{data:projectRows,error:projectError},{data:allProjects,error:allProjectsError}]=await Promise.all([
    supabase.from("subjects").select("id,subject_code,subject_name,description").eq("status","PUBLISHED").order("subject_name"),
    supabase.rpc("get_available_projects"),
    supabase.from("projects").select("subject_id").eq("status","PUBLISHED"),
   ]);
   if(!active)return;
   if(subjectError||projectError||allProjectsError){setError(subjectError?.message??projectError?.message??allProjectsError?.message??"Unable to load subjects.");setLoading(false);return;}
   const projects=(projectRows??[]) as {subject_id:string}[];
   const totalProjects=(allProjects??[]) as {subject_id:string}[];
   setSubjects((subjectRows??[]).map(subject=>({id:subject.id,subject_code:subject.subject_code,subject_name:subject.subject_name,description:subject.description,total:totalProjects.filter(project=>project.subject_id===subject.id).length,available:projects.filter(project=>project.subject_id===subject.id).length})));
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[]);
 const filtered=useMemo(()=>subjects.filter(subject=>`${subject.subject_name} ${subject.subject_code}`.toLowerCase().includes(search.toLowerCase())),[subjects,search]);
 return <DashboardShell role="student" title="Browse Subjects" description="Choose a subject to explore available projects.">
  {!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo subjects; project counts are examples and are not live records.</p>}
  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs"/></div></div>
  {error&&<p role="alert" className="mb-4 text-xs text-red-600">Could not load subjects: {error}</p>}
  {loading?<div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Loading subjects…</div>:filtered.length===0?<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No published subjects found.</div>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(subject=><div key={subject.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{subject.subject_code.split(" ")[0]}</div><span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600">{subject.available} available</span></div><h2 className="mt-5 text-sm font-bold">{subject.subject_name}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{subject.description}</p><div className="mt-4 border-t border-slate-100 pt-4"><div className="text-[10px] text-slate-400">Subject code</div><div className="mt-1 text-xs font-bold">{subject.subject_code}</div><div className="mt-2 text-[10px] text-slate-400">{subject.total} published projects</div></div><Link href={`/student/projects?subject=${encodeURIComponent(subject.id)}`} className="mt-5 flex h-10 items-center justify-between rounded-lg bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">View projects <ArrowRight size={14}/></Link></div>)}</div>}
 </DashboardShell>;
}
