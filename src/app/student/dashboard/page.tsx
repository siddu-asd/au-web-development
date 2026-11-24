"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Allocation={id:string;allocation_date:string;deadline:string;status:string;projects:{title:string;project_code:string;subjects:{subject_name:string}|null}|null};
type Task={id:string;task_title_snapshot:string;is_completed:boolean;day_number:number};
export default function StudentDashboard(){
 const [allocation,setAllocation]=useState<Allocation|null>(null);const [tasks,setTasks]=useState<Task[]>([]);const [availableCount,setAvailableCount]=useState(18);const [subjectCount,setSubjectCount]=useState(7);const [remaining,setRemaining]=useState({days:6,hours:14,minutes:32});const [error,setError]=useState("");const [loading,setLoading]=useState(isSupabaseConfigured);
 useEffect(()=>{
  if(!isSupabaseConfigured)return;let active=true;let timer:ReturnType<typeof setInterval>|undefined;
  async function load(){
   const supabase=createClient();
   const [allocationResult,projectsResult,subjectsResult]=await Promise.all([
    supabase.from("project_allocations").select("id,allocation_date,deadline,status,projects(title,project_code,subjects(subject_name))").in("status",["ACTIVE","DUE_SOON","OVERDUE","CHANGES_REQUESTED","SUBMITTED","UNDER_REVIEW"]).order("allocation_date",{ascending:false}).limit(1).maybeSingle(),
    supabase.rpc("get_available_projects"),
    supabase.from("subjects").select("id",{count:"exact",head:true}).eq("status","PUBLISHED"),
   ]);
   if(!active)return;
   const failed=allocationResult.error??projectsResult.error??subjectsResult.error;
   if(failed){setError(failed.message);setLoading(false);return;}
   setAvailableCount(projectsResult.data?.length??0);setSubjectCount(subjectsResult.count??0);
   if(!allocationResult.data){setLoading(false);return;}
   const row=allocationResult.data as unknown as Allocation;setAllocation(row);
   const {data:checklist,error:checklistError}=await supabase.from("student_checklist_items").select("id,task_title_snapshot,is_completed,day_number").eq("allocation_id",row.id).order("day_number");
   if(!active)return;
   if(checklistError)setError(checklistError.message);
   else setTasks((checklist??[]) as Task[]);
   const countdown=()=>{const diff=Math.max(0,new Date(row.deadline).getTime()-Date.now());setRemaining({days:Math.floor(diff/86400000),hours:Math.floor(diff%86400000/3600000),minutes:Math.floor(diff%3600000/60000)});};
   countdown();timer=setInterval(countdown,60000);
   setLoading(false);
  }
  void load();return()=>{active=false;if(timer)clearInterval(timer);};
 },[]);
 const completed=tasks.filter(task=>task.is_completed).length;const progress=tasks.length?Math.round(completed*100/tasks.length):0;
 const isDemo=!isSupabaseConfigured;
 const projectTitle=allocation?.projects?.title??"Campus Connect Portal";
 const projectCode=allocation?.projects?.project_code??"PRJ-WD-104";
 const noProject=isSupabaseConfigured&&!loading&&!allocation;
 return <DashboardShell role="student" title="Dashboard" description="Welcome back. Here is your project activity.">
  {isDemo&&<p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo dashboard: sample project details are not live records.</p>}
  {error&&<p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
  {loading?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your workspace…</div>:noProject?<div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm"><FolderKanban className="mx-auto text-blue-600" size={30}/><h2 className="mt-4 text-lg font-bold">Start your project journey</h2><p className="mt-2 text-sm text-slate-500">Browse published subjects and select an available project to begin your 10-day plan.</p><Link href="/student/subjects" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white">Browse subjects <ArrowRight size={14}/></Link></div>:
  <>
   <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-widest text-green-600">Active project</div><h2 className="mt-2 text-xl font-bold">{projectTitle}</h2><p className="mt-1 text-xs text-slate-500">{allocation?.projects?.subjects?.subject_name??"Web Development"} · {projectCode}</p></div><span className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-bold text-orange-600">{allocation?.status??"DUE SOON"}</span></div>
     <div className="mt-7"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Checklist progress</span><b>{isDemo?"68%":`${progress}%`}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${isDemo?68:progress}%`}}/></div></div>
     <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Allocated",allocation?new Date(allocation.allocation_date).toLocaleDateString():"Nov 24, 2026",CalendarDays],["Deadline",allocation?new Date(allocation.deadline).toLocaleDateString():"Dec 4, 2026",Clock3],["Time left",`${remaining.days} days`,Clock3],["Checklist",isDemo?"17 / 25":`${completed} / ${tasks.length}`,CheckCircle2]].map(([label,value,Icon])=>{const I=Icon as typeof CalendarDays;return <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><I size={15} className="text-slate-400"/><div className="mt-2 text-[10px] text-slate-400">{String(label)}</div><div className="mt-1 text-xs font-bold">{String(value)}</div></div>})}</div>
     <Link href="/student/my-project" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-bold text-white">Continue project <ArrowRight size={15}/></Link>
    </div>
    <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">10-day countdown</h2><Clock3 size={18} className="text-blue-400"/></div><div className="mt-7 grid grid-cols-3 gap-2 text-center">{[[remaining.days,"Days"],[remaining.hours,"Hours"],[remaining.minutes,"Minutes"]].map(([n,l])=><div key={String(l)} className="rounded-lg border border-white/10 bg-white/[.05] py-4"><div className="text-2xl font-bold">{String(n).padStart(2,"0")}</div><div className="mt-1 text-[9px] uppercase text-slate-400">{l}</div></div>)}</div><div className="mt-5 rounded-lg border border-white/10 p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Final submission</span><span className="font-bold text-green-400">{allocation?.status==="SUBMITTED"||allocation?.status==="UNDER_REVIEW"?"Submitted":"Not submitted"}</span></div></div><Link href="/student/submission" className="mt-4 flex h-10 items-center justify-center rounded-lg border border-white/15 text-xs font-bold">View submission</Link></div>
   </div>
   <div className="mt-5 grid gap-5 md:grid-cols-3">{[[`Browse subjects`,`${subjectCount} published`,"Explore subjects",Search,"/student/subjects"],["Available projects",`${availableCount} to choose`,"View projects",FolderKanban,"/student/projects"],["Today's checklist",`${isDemo?3:tasks.length-completed} tasks pending`,"Update progress",CheckCircle2,"/student/progress"]].map(([title,value,action,Icon,href])=>{const I=Icon as typeof Search;return <Link href={String(href)} key={String(title)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><I size={19} className="text-blue-600"/><span className="text-[10px] font-bold text-slate-400">{isDemo?"SAMPLE":"LIVE"}</span></div><h3 className="mt-5 text-sm font-bold">{String(title)}</h3><p className="mt-1 text-xs text-slate-400">{String(value)}</p><div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">{String(action)} <ArrowRight size={13}/></div></Link>})}</div>
   <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Development checklist</h2><Link href="/student/progress" className="text-xs font-bold text-blue-600">View all</Link></div>{isDemo?<p className="mt-4 text-xs text-slate-500">Sample activity. Connect Supabase to see saved checklist updates.</p>:tasks.length===0?<p className="mt-4 text-xs text-slate-500">No checklist items found.</p>:<div className="mt-4 space-y-2">{tasks.slice(0,5).map(task=><div key={task.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-xs"><CheckCircle2 size={15} className={task.is_completed?"text-green-600":"text-slate-300"}/><span className={task.is_completed?"text-slate-400 line-through":"font-semibold"}>{task.task_title_snapshot}</span><span className="ml-auto text-[10px] text-slate-400">Day {task.day_number}</span></div>)}</div>}</div>
  </>}
 </DashboardShell>;
}
