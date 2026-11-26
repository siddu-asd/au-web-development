"use client";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type Item={id:string;task_title_snapshot:string;day_number:number;is_completed:boolean;student_notes:string|null};
const demoTasks=[
 ["Planning and Setup","Understand problem statement","Create project folder","Plan website structure","Create HTML files"],
 ["HTML Development","Create homepage","Create navigation","Create required pages","Implement forms"],
 ["CSS Development","Apply global styles","Create responsive layouts","Add colours and typography","Refine spacing"],
 ["JavaScript Development","Add event listeners","Implement DOM interactions","Add form validation","Create dynamic content"],
];
export default function Progress(){
 const [items,setItems]=useState<Item[]>([]);
 const [allocationId,setAllocationId]=useState("");
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;
  async function load(){
   const supabase=createClient();
   const {data:allocation,error:allocationError}=await supabase.from("project_allocations").select("id").in("status",["ACTIVE","DUE_SOON","OVERDUE","CHANGES_REQUESTED"]).order("allocation_date",{ascending:false}).limit(1).maybeSingle();
   if(!active)return;
   if(allocationError){setError(allocationError.message);setLoading(false);return;}
   if(!allocation){setLoading(false);return;}
   setAllocationId(allocation.id);
   const {data:checklist,error:checklistError}=await supabase.from("student_checklist_items").select("id,task_title_snapshot,day_number,is_completed,student_notes").eq("allocation_id",allocation.id).order("day_number").order("task_title_snapshot");
   if(!active)return;
   if(checklistError)setError(checklistError.message);
   else setItems((checklist??[]) as Item[]);
   setLoading(false);
  }
  void load();
  return ()=>{active=false;};
 },[]);
 const completed=useMemo(()=>items.filter(item=>item.is_completed).length,[items]);
 const progress=items.length?Math.round(completed*100/items.length):0;
 async function toggle(item:Item){
  if(!isSupabaseConfigured){setItems(current=>current.map(row=>row.id===item.id?{...row,is_completed:!row.is_completed}:row));return;}
  setBusy(item.id);setError("");
  try{
   const {data,error:rpcError}=await createClient().rpc("toggle_checklist_item",{p_item_id:item.id,p_is_completed:!item.is_completed,p_student_notes:item.student_notes});
   if(rpcError)throw rpcError;
   if(typeof data!=="number"&&typeof data!=="string")throw new Error("The server did not confirm the checklist update.");
   setItems(current=>current.map(row=>row.id===item.id?{...row,is_completed:!row.is_completed}:row));
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not update checklist item.");}
  finally{setBusy(null);}
 }
 return <DashboardShell role="student" title="Daily Progress" description="Update your daily project development checklist.">
  {!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo checklist. Changes are disabled and are not saved.</p>}
  {isSupabaseConfigured&&!loading&&!allocationId?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold">No active project</h2><p className="mt-2 text-sm text-slate-500">Allocate a project before tracking daily progress.</p></div>:<>
   <div className="mb-5 grid gap-4 sm:grid-cols-3">{[["Overall",`${isSupabaseConfigured?progress:68}%`],["Completed",`${isSupabaseConfigured?completed:17} / ${isSupabaseConfigured?items.length:25}`],["Remaining",`${isSupabaseConfigured?items.length-completed:8} tasks`]].map(([l,v])=><div key={l} className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-[10px] text-slate-400">{l}</span><b className="mt-1 block text-xl">{v}</b></div>)}</div>
   <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-bold">Development checklist</h2><span className="text-xs font-bold text-blue-600">Progress is checklist-based</span></div>
    {loading?<p className="text-sm text-slate-500">Loading checklist…</p>:error&&items.length===0?<p role="alert" className="text-xs text-red-600">{error}</p>:isSupabaseConfigured?
      <div className="space-y-4">{Array.from(new Set(items.map(item=>item.day_number))).map(day=>{const dayItems=items.filter(item=>item.day_number===day);return <section key={day} className="rounded-lg border border-slate-100"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-xs font-bold">Day {day}</h3><span className="text-[10px] text-slate-400">{dayItems.filter(item=>item.is_completed).length}/{dayItems.length} complete</span></div><div className="p-3">{dayItems.map(item=><label key={item.id} aria-busy={busy===item.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-xs"><input type="checkbox" checked={item.is_completed} disabled={busy===item.id} onChange={()=>void toggle(item)} className="h-4 w-4 accent-blue-600"/><span className={item.is_completed?"text-slate-400 line-through":"font-semibold"}>{item.task_title_snapshot}</span>{item.is_completed&&item.student_notes&&<span className="ml-auto text-[10px] text-slate-400">{item.student_notes}</span>}</label>)}</div></section>})}</div>
      :<div className="space-y-4">{demoTasks.map((day,di)=><section key={day[0]} className="rounded-lg border border-slate-100"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-xs font-bold">Day {di+1} — {day[0]}</h3><span className="text-[10px] text-slate-400">Demo checklist</span></div><div className="p-3">{day.slice(1).map(task=><label key={task} className="flex items-center gap-3 rounded-md px-2 py-2 text-xs"><input type="checkbox" disabled className="h-4 w-4 accent-blue-600"/><span className="font-semibold">{task}</span></label>)}</div></section>)}</div>}
    {error&&<p role="alert" className="mt-4 text-xs text-red-600">{error}</p>}
   </div>
  </>}
 </DashboardShell>;
}
