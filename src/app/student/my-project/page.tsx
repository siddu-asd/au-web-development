"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CalendarDays, CheckCircle2, Clock3, FolderSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Allocation={id:string;allocation_date:string;deadline:string;status:string;projects:{title:string;project_code:string;subjects:{subject_name:string}|null}|null};
export default function MyProject(){
 const [allocation,setAllocation]=useState<Allocation|null>(null);
 const [progress,setProgress]=useState(68);
 const [remaining,setRemaining]=useState({days:6,hours:14,minutes:32});
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;let timer:ReturnType<typeof setInterval>|undefined;
  async function load(){
   const supabase=createClient();
   const {data,error:allocationError}=await supabase.from("project_allocations").select("id,allocation_date,deadline,status,projects(title,project_code,subjects(subject_name))").order("allocation_date",{ascending:false}).limit(1).maybeSingle();
   if(!active)return;
   if(allocationError){setError(allocationError.message);setLoading(false);return;}
   if(!data){setLoading(false);return;}
   const row=data as unknown as Allocation;setAllocation(row);
   const {data:items,error:itemError}=await supabase.from("student_checklist_items").select("is_completed").eq("allocation_id",row.id);
   if(!active)return;
   if(itemError)setError(itemError.message);
   else if(items?.length)setProgress(Math.round(items.filter(item=>item.is_completed).length*100/items.length));
   const updateCountdown=()=>{
    const diff=Math.max(0,new Date(row.deadline).getTime()-Date.now());
    setRemaining({days:Math.floor(diff/86400000),hours:Math.floor(diff%86400000/3600000),minutes:Math.floor(diff%3600000/60000)});
   };
   updateCountdown();timer=setInterval(updateCountdown,60000);
   setLoading(false);
  }
  void load();return()=>{active=false;if(timer)clearInterval(timer);};
 },[]);
 return <DashboardShell role="student" title="My Project" description="Your active project requirements and deadline.">
  {!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo project details; countdown and assignment are samples, not saved records.</p>}
  {loading?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your allocation…</div>:error?<p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>:!allocation&&isSupabaseConfigured?<div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><FolderSearch size={30} className="mx-auto text-slate-300"/><h2 className="mt-4 font-bold">No project allocated yet</h2><p className="mt-2 text-sm text-slate-500">Browse available projects to get started.</p><Link href="/student/projects" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">Browse projects</Link></div>:
  <div className="grid gap-5 xl:grid-cols-[1fr_300px]"><div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex justify-between"><span className="text-[10px] font-bold text-blue-600">{allocation?.projects?.project_code??"PRJ-WD-104"}</span><span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600">{allocation?.status??"Due soon"}</span></div><h1 className="mt-3 text-2xl font-bold">{allocation?.projects?.title??"Campus Connect Portal"}</h1><p className="mt-2 text-sm text-slate-500">{allocation?.projects?.subjects?.subject_name??"Web Development"}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-4"><CalendarDays size={16} className="text-slate-400"/><div className="mt-2 text-[10px] text-slate-400">Allocated</div><b className="mt-1 block text-xs">{allocation?new Date(allocation.allocation_date).toLocaleString():"Nov 24, 2026"}</b></div><div className="rounded-lg bg-slate-50 p-4"><Clock3 size={16} className="text-slate-400"/><div className="mt-2 text-[10px] text-slate-400">Deadline</div><b className="mt-1 block text-xs">{allocation?new Date(allocation.deadline).toLocaleString():"Dec 04, 2026"}</b></div><div className="rounded-lg bg-slate-50 p-4"><CheckCircle2 size={16} className="text-green-500"/><div className="mt-2 text-[10px] text-slate-400">Checklist progress</div><b className="mt-1 block text-xs">{progress}%</b></div></div><div className="mt-5 flex gap-3"><Link href="/student/progress" className="rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white">Update checklist</Link><Link href="/student/submission" className="rounded-lg border border-slate-200 px-4 py-3 text-xs font-bold">Submit project</Link></div></div><div className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white"><h2 className="text-sm font-bold">Deadline countdown</h2><div className="mt-6 grid grid-cols-3 gap-2">{[[remaining.days,"Days"],[remaining.hours,"Hours"],[remaining.minutes,"Min"]].map(([n,l])=><div key={String(l)} className="rounded-lg border border-white/10 py-4 text-center"><b className="block text-xl">{String(n).padStart(2,"0")}</b><span className="text-[9px] text-slate-400">{l}</span></div>)}</div><p className="mt-4 text-[10px] text-slate-400">Countdown uses the allocation deadline.</p></div></div>}
 </DashboardShell>;
}
