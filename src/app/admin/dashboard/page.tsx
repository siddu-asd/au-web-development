"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Users, GraduationCap, LibraryBig, FolderKanban, ArrowRight, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";

type Allocation={id:string;project_id:string;status:string;deadline:string;allocation_date:string;profiles:{full_name:string}|{full_name:string}[]|null;projects:{title:string}|{title:string}[]|null};
type Metrics={students:number;faculty:number;subjects:number;projects:number;pending:number;allocations:Allocation[];checklist:{allocation_id:string;is_completed:boolean}[]};
const empty:Metrics={students:0,faculty:0,subjects:0,projects:0,pending:0,allocations:[],checklist:[]};
const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export default function AdminDashboard(){
 const [metrics,setMetrics]=useState<Metrics>(empty);const [loading,setLoading]=useState(isSupabaseConfigured);const [error,setError]=useState("");const [now,setNow]=useState(0);
 useEffect(()=>{
  if(!isSupabaseConfigured)return;let active=true;
  const clock=setInterval(()=>setNow(Date.now()),60000);
  async function load(){
   try {
    const supabase=createClient();
    const [students,faculty,subjects,projects,allocations,pending]=await Promise.all([
     supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","STUDENT"),
     supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","FACULTY"),
     supabase.from("subjects").select("id",{count:"exact",head:true}).eq("status","PUBLISHED"),
     supabase.from("projects").select("id",{count:"exact",head:true}).eq("status","PUBLISHED"),
     fetchAllPages((from,to)=>supabase.from("project_allocations").select("id,project_id,status,deadline,allocation_date,profiles!project_allocations_student_id_fkey(full_name),projects(title)").order("allocation_date",{ascending:false}).range(from,to)),
     supabase.from("project_submissions").select("id",{count:"exact",head:true}).in("submission_status",["Submitted","Under Review","Late Submission"]),
    ]);
    const failure=students.error??faculty.error??subjects.error??projects.error??pending.error;
    if(!active)return;
    if(failure){setError(failure.message);setLoading(false);return;}
    const allocationRows=allocations;
    const ids=allocationRows.slice(0,5).map(row=>row.id);
    const checklist=ids.length?await supabase.from("student_checklist_items").select("allocation_id,is_completed").in("allocation_id",ids):{data:[],error:null};
    if(!active)return;
    if(checklist.error){setError(checklist.error.message);setLoading(false);return;}
    setMetrics({students:students.count??0,faculty:faculty.count??0,subjects:subjects.count??0,projects:projects.count??0,pending:pending.count??0,allocations:allocationRows,checklist:(checklist.data??[]) as Metrics["checklist"]});
    setNow(Date.now());
    setLoading(false);
   } catch(reason) {
    if(!active)return;
    setError(reason instanceof Error?reason.message:"Unable to load project allocations.");
    setLoading(false);
   }
  }
  void load();return()=>{active=false;clearInterval(clock);};
 },[]);
 const active=metrics.allocations.filter(row=>!["CANCELLED","APPROVED"].includes(row.status));
 const available=Math.max(0,metrics.projects-new Set(active.map(row=>row.project_id)).size);
 const dueSoon=active.filter(row=>new Date(row.deadline).getTime()-now<3*86400000&&new Date(row.deadline).getTime()>now).length;
 const overdue=active.filter(row=>new Date(row.deadline).getTime()<=now).length;
 const complete=metrics.allocations.filter(row=>row.status==="APPROVED").length;
 const inProgress=metrics.allocations.filter(row=>["ACTIVE","DUE_SOON","OVERDUE","CHANGES_REQUESTED"].includes(row.status)).length;
 const recent=metrics.allocations.slice(0,5);
 const recentRows=recent.map(row=>{const tasks=metrics.checklist.filter(item=>item.allocation_id===row.id);const done=tasks.filter(item=>item.is_completed).length;const student=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;const project=Array.isArray(row.projects)?row.projects[0]:row.projects;return {row,studentName:student?.full_name??"Student",projectTitle:project?.title??"Project",progress:tasks.length?Math.round(done*100/tasks.length):0};});
 const months=useMemo(()=>Array.from({length:6},(_,index)=>{const date=new Date(now||Date.UTC(2026,0,1));date.setMonth(date.getMonth()-5+index);return {label:monthLabels[date.getMonth()],count:metrics.allocations.filter(row=>{const allocationDate=new Date(row.allocation_date);return allocationDate.getMonth()===date.getMonth()&&allocationDate.getFullYear()===date.getFullYear();}).length};}),[metrics.allocations,now]);
 const maxMonth=Math.max(1,...months.map(item=>item.count));
 const stats=[
  ["Total Students",metrics.students,"Active accounts",Users],
  ["Total Faculty",metrics.faculty,"Faculty accounts",GraduationCap],
  ["Published Subjects",metrics.subjects,"Published subjects",LibraryBig],
  ["Published Projects",metrics.projects,`${available} available`,FolderKanban],
 ];
 return <DashboardShell role="admin" title="Dashboard" description="Monitor academic projects, student progress and submissions.">
  {!isSupabaseConfigured&&<p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo mode: live database analytics appear after Supabase is configured.</p>}
  {error&&<p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">Could not load dashboard data: {error}</p>}
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value,detail,Icon])=>{const IconComponent=Icon as typeof Users;return <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600"><IconComponent size={19}/></div><span className="text-[10px] font-semibold text-slate-400">{loading?"Loading":String(detail)}</span></div><div className="mt-5 text-[26px] font-bold tracking-tight text-slate-950">{loading?"—":String(value)}</div><div className="mt-1 text-xs font-semibold text-slate-500">{String(label)}</div></div>})}</div>
  <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
   <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-sm font-bold">Project allocation activity</h2><p className="mt-1 text-xs text-slate-400">New allocations per month · last 6 months</p></div><div className="mt-6 flex h-48 items-end gap-3 border-b border-slate-100 px-2">{months.map(item=><div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div title={`${item.count} allocations`} className="w-full rounded-t-md bg-blue-500" style={{height:`${Math.max(item.count?8:0,item.count/maxMonth*85)}%`}}/><span className="text-[10px] text-slate-400">{item.label}</span></div>)}</div></div>
   <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Allocation status</h2><p className="mt-1 text-xs text-slate-400">Current project distribution</p><div className="mt-5 grid grid-cols-2 gap-3">{[["In progress",inProgress],["Completed",complete],["Due soon",dueSoon],["Overdue",overdue]].map(([label,count])=><div key={String(label)} className="rounded-lg bg-slate-50 p-3"><div className="text-xl font-bold text-blue-600">{String(count)}</div><div className="mt-1 text-[10px] text-slate-500">{String(label)}</div></div>)}</div><div className="mt-4 text-[10px] text-slate-400">{metrics.pending} submissions need review</div></div>
  </div>
  <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
   <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold">Recently allocated projects</h2><Link href="/admin/allocations" className="flex items-center gap-1 text-xs font-bold text-blue-600">View all <ArrowRight size={13}/></Link></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Deadline</th></tr></thead><tbody className="divide-y divide-slate-100">{recentRows.map(({row,studentName,projectTitle,progress})=><tr key={row.id}><td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-[10px] font-bold">{studentName.split(" ").map(part=>part[0]).join("").slice(0,2)}</div><b>{studentName}</b></div></td><td className="px-5 py-3.5 text-slate-600">{projectTitle}</td><td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{width:`${progress}%`}}/></div>{progress}%</div></td><td className="px-5 py-3.5 font-semibold text-slate-600">{new Date(row.deadline).toLocaleDateString()}</td></tr>)}</tbody></table>{!loading&&recent.length===0&&<p className="p-6 text-center text-xs text-slate-500">No project allocations yet.</p>}</div></div>
   <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Needs attention</h2><div className="mt-4 space-y-3">{[[metrics.pending,"Submissions pending review",CheckCircle2],[dueSoon,"Projects due soon",Clock3],[overdue,"Overdue projects",AlertTriangle]].map(([count,text,Icon])=>{const IconComponent=Icon as typeof CheckCircle2;return <div key={String(text)} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-600"><IconComponent size={17}/></div><div className="flex-1"><div className="text-xs font-bold">{String(count)} items</div><div className="mt-0.5 text-[11px] text-slate-400">{String(text)}</div></div><ArrowRight size={14} className="text-slate-300"/></div>})}</div></div>
  </div>
 </DashboardShell>;
}
