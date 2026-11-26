"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

export function AdminTablePage({
  title,
  description,
  columns,
  rows,
  role = "admin",
  dataSource,
  children,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: (string | React.ReactNode)[][];
  role?: "admin" | "faculty";
  dataSource?: "allocations" | "students" | "progress" | "projects" | "subjects";
  children?: React.ReactNode;
}) {
  const [visibleRows,setVisibleRows]=useState(rows);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(Boolean(dataSource&&isSupabaseConfigured));
  const [error,setError]=useState("");
  const [page,setPage]=useState(0);
  const [studentIds,setStudentIds]=useState<Map<string,string>>(new Map());
  const [accountBusyId,setAccountBusyId]=useState("");
  const extendDeadline=useCallback(async(allocationId:string,currentDeadline:string)=>{
    const deadlineText=window.prompt("New deadline (for example 2026-12-05T10:00:00+05:30):",currentDeadline);
    if(deadlineText===null)return;
    const deadline=new Date(deadlineText);
    if(Number.isNaN(deadline.getTime())){setError("Enter a valid deadline date and time.");return;}
    const reason=window.prompt("Reason for deadline extension:");
    if(reason===null)return;
    setError("");
    try{
      const {error:rpcError}=await createClient().rpc("extend_project_deadline",{p_allocation_id:allocationId,p_new_deadline:deadline.toISOString(),p_reason:reason});
      if(rpcError)throw rpcError;
      window.location.reload();
    }catch(cause){setError(cause instanceof Error?cause.message:"Deadline extension failed.");}
  },[]);
  useEffect(()=>{
    if(!dataSource||!isSupabaseConfigured)return;
    let active=true;
    async function load(){
      const supabase=createClient();
      const [profilesResult,allocationsResult]=await Promise.all([
        dataSource==="students"?supabase.from("profiles").select("id,full_name,registration_number,email,account_status").eq("role","STUDENT").order("full_name"):Promise.resolve({data:null,error:null}),
        dataSource==="students"?supabase.from("project_allocations").select("id,student_id,allocation_date,deadline,status,profiles!project_allocations_student_id_fkey(full_name,registration_number,email),projects(title,subjects(subject_name))").order("allocation_date",{ascending:false})
          :dataSource==="projects"?supabase.from("projects").select("id,project_code,title,status,difficulty,subjects(subject_name)").order("created_at",{ascending:false})
          :dataSource==="subjects"?supabase.from("subjects").select("id,subject_code,subject_name,status").order("subject_name")
          :supabase.from("project_allocations").select("id,student_id,project_id,allocation_date,deadline,status,profiles!project_allocations_student_id_fkey(full_name,registration_number,email),projects(title,subjects(subject_name))").order("allocation_date",{ascending:false}),
      ]);
      if(!active)return;
      if(profilesResult.error||allocationsResult.error){setError(profilesResult.error?.message??allocationsResult.error?.message??"Unable to load records.");setLoading(false);return;}
      if(dataSource==="projects"){
        const projects=(allocationsResult.data??[]) as unknown as {project_code:string;title:string;status:string;difficulty:string;subjects:{subject_name:string}|{subject_name:string}[]|null}[];
        setVisibleRows(projects.map(project=>{const subject=Array.isArray(project.subjects)?project.subjects[0]?.subject_name:project.subjects?.subject_name;return [project.title,project.project_code,subject??"—",project.status,"—"];}));
        setLoading(false);return;
      }
      if(dataSource==="subjects"){
        const subjects=(allocationsResult.data??[]) as unknown as {id:string;subject_code:string;subject_name:string;status:string}[];
        setVisibleRows(subjects.map(subject=>[subject.subject_name,subject.subject_code,"—","—",subject.status]));
        setLoading(false);return;
      }
      const allocationRows=(allocationsResult.data??[]) as unknown as {
        id:string;student_id:string;allocation_date:string;deadline:string;status:string;
        profiles:{full_name:string;registration_number:string;email:string}|null;
        projects:{title:string;subjects:{subject_name:string}|{subject_name:string}[]|null}|null;
      }[];
      if(dataSource==="students"){
        const allocationByStudent=new Map(allocationRows.filter(row=>!["CANCELLED","APPROVED"].includes(row.status)).map(row=>[row.student_id,row]));
        const allocationIds=Array.from(allocationByStudent.values()).map(row=>row.id);
        const checklistResult=allocationIds.length
          ? await supabase.from("student_checklist_items").select("allocation_id,is_completed").in("allocation_id",allocationIds)
          : {data:[],error:null};
        if(!active)return;
        if(checklistResult.error){setError(checklistResult.error.message);setLoading(false);return;}
        const checklistRows=(checklistResult.data??[]) as {allocation_id:string;is_completed:boolean}[];
        const studentRows=(profilesResult.data??[]) as {id:string;full_name:string;registration_number:string;email:string;account_status:string}[];
        setStudentIds(new Map(studentRows.map((student)=>[student.registration_number,student.id])));
        setVisibleRows(studentRows.map(student=>{
          const allocation=allocationByStudent.get(student.id);
          const subject=allocation?.projects?.subjects;
          const subjectName=Array.isArray(subject)?subject[0]?.subject_name:subject?.subject_name;
          const checklist=checklistRows.filter(item=>item.allocation_id===allocation?.id);
          const progress=checklist.length?`${Math.round(checklist.filter(item=>item.is_completed).length*100/checklist.length)}%`:"—";
          return [student.full_name,student.registration_number,student.email,subjectName??"—",progress,student.account_status];
        }));
        setLoading(false);return;
      }
      const ids=allocationRows.map(row=>row.id);
      const [{data:checklist,error:checklistError},{data:logs,error:logError}]=ids.length?await Promise.all([
        supabase.from("student_checklist_items").select("allocation_id,is_completed").in("allocation_id",ids),
        supabase.from("daily_progress_logs").select("allocation_id,created_at").in("allocation_id",ids).order("created_at",{ascending:false}),
      ]):[{data:[],error:null},{data:[],error:null}];
      if(!active)return;
      if(checklistError||logError){setError(checklistError?.message??logError?.message??"Unable to load project progress.");setLoading(false);return;}
      const taskRows=(checklist??[]) as {allocation_id:string;is_completed:boolean}[];
      const logRows=(logs??[]) as {allocation_id:string;created_at:string}[];
      const lastActivity=new Map<string,string>();
      for(const log of logRows)if(!lastActivity.has(log.allocation_id))lastActivity.set(log.allocation_id,log.created_at);
      const formatted=allocationRows.map(row=>{
        const subject=row.projects?.subjects;
        const subjectName=Array.isArray(subject)?subject[0]?.subject_name:subject?.subject_name;
        const items=taskRows.filter(item=>item.allocation_id===row.id);
        const complete=items.filter(item=>item.is_completed).length;
        const percentage=items.length?Math.round(complete*100/items.length):0;
        const totalDays=Math.max(1,Math.ceil((new Date(row.deadline).getTime()-new Date(row.allocation_date).getTime())/86400000));
        const days=Math.max(1,Math.min(totalDays,Math.floor((Date.now()-new Date(row.allocation_date).getTime())/86400000)+1));
        if(dataSource==="progress")return [
          row.profiles?.full_name??"Student",row.projects?.title??"Project",`${days} / ${totalDays}`,
          `${complete} / ${items.length}`,`${percentage}%`,
          lastActivity.has(row.id)?new Date(lastActivity.get(row.id)!).toLocaleString():"No updates",
        ];
        return [
          row.profiles?.full_name??"Student",row.projects?.title??"Project",subjectName??"—",
          new Date(row.allocation_date).toLocaleDateString(),new Date(row.deadline).toLocaleDateString(),
          new Date(row.deadline).getTime()<=Date.now()&&["ACTIVE","DUE_SOON"].includes(row.status)?"OVERDUE":row.status,
          isSupabaseConfigured?<button onClick={()=>void extendDeadline(row.id,new Date(row.deadline).toISOString())} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold">Extend deadline</button>:"—",
        ];
      });
      setVisibleRows(formatted);setLoading(false);
    }
    void load();
    return()=>{active=false;};
  },[dataSource,extendDeadline]);
  const filteredRows=useMemo(()=>visibleRows.filter(row=>row.map(cell=>typeof cell==="string"?cell:"").join(" ").toLowerCase().includes(search.toLowerCase())),[visibleRows,search]);
  const pageSize=10;
  const pageCount=Math.max(1,Math.ceil(filteredRows.length/pageSize));
  const pageRows=filteredRows.slice(page*pageSize,(page+1)*pageSize);
  async function toggleStudentAccount(registrationNumber:string,status:string){
    const id=studentIds.get(registrationNumber);
    if(!id)return;
    const nextStatus=status==="ACTIVE"?"INACTIVE":"ACTIVE";
    const person=visibleRows.find((row)=>row[1]===registrationNumber)?.[0];
    if(!window.confirm(`${nextStatus==="INACTIVE"?"Deactivate":"Reactivate"} ${String(person??"this account")}? ${nextStatus==="INACTIVE"?"They will be signed out and blocked from student routes.":"They will be able to sign in again."}`))return;
    setError("");
    setAccountBusyId(id);
    try{
      const {data,error:updateError}=await createClient().from("profiles")
        .update({account_status:nextStatus})
        .eq("id",id)
        .eq("role","STUDENT")
        .select("id,account_status")
        .maybeSingle();
      if(updateError)throw updateError;
      if(!data)throw new Error("Account status was not changed. Check your admin permissions.");
      setVisibleRows((current)=>current.map((row)=>row[1]===registrationNumber?row.map((cell,index)=>index===5?data.account_status:cell):row));
    }catch(reason){
      setError(reason instanceof Error?reason.message:"Unable to update student account status.");
    }finally{
      setAccountBusyId("");
    }
  }
  function updateSearch(value:string){
    setSearch(value);
    setPage(0);
  }
  const extraColumns=dataSource==="allocations"?["Action"]:dataSource==="students"?["Account access"]:[];
  return (
    <DashboardShell role={role} title={title} description={description}>
      {children&&<div className="mb-5">{children}</div>}
      {!isSupabaseConfigured&&dataSource&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo records; live data requires Supabase.</p>}
      {error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {dataSource==="students"&&isSupabaseConfigured&&<p className="mb-4 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-[11px] leading-5 text-blue-800">Deactivate an account to revoke portal access without deleting its project or submission history.</p>}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={search} onChange={event=>updateSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 pl-9 pr-3 text-xs shadow-sm"/></div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white bg-white/90 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-slate-50/80 text-[9px] uppercase tracking-[.13em] text-slate-400"><tr>{[...columns,...extraColumns].map(c=><th key={c} className="px-5 py-3.5 font-bold">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100/80">{pageRows.map((row,i)=><tr key={String(row[1]??i)} className="transition-colors hover:bg-blue-50/25">{row.map((cell,j)=><td key={j} className="px-5 py-4">{cell}</td>)}{dataSource==="students"&&<td className="px-5 py-4">{isSupabaseConfigured&&typeof row[1]==="string"&&typeof row[5]==="string"?<button type="button" disabled={accountBusyId===studentIds.get(row[1])} onClick={()=>void toggleStudentAccount(row[1] as string,row[5] as string)} className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-[10px] font-bold transition disabled:opacity-50 ${row[5]==="ACTIVE"?"border-rose-200 text-rose-700 hover:bg-rose-50":"border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{accountBusyId===studentIds.get(row[1])?"Saving…":row[5]==="ACTIVE"?"Deactivate":"Reactivate"}</button>:<span className="text-[10px] text-slate-400">—</span>}</td>}</tr>)}</tbody>
        </table>
      </div>
        {loading&&<div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded-lg bg-slate-100"/><div className="h-10 animate-pulse rounded-lg bg-slate-100"/><div className="h-10 animate-pulse rounded-lg bg-slate-100"/></div>}
        {!loading&&filteredRows.length===0&&!error&&<p className="p-10 text-center text-xs text-slate-500">No records found.</p>}
        {!loading&&filteredRows.length>pageSize&&<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><span className="text-[10px] text-slate-400">Showing {page*pageSize+1}–{Math.min((page+1)*pageSize,filteredRows.length)} of {filteredRows.length}</span><div className="flex gap-2"><button type="button" onClick={()=>setPage((current)=>Math.max(0,current-1))} disabled={page===0} className="h-8 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:opacity-40">Previous</button><button type="button" onClick={()=>setPage((current)=>Math.min(pageCount-1,current+1))} disabled={page>=pageCount-1} className="h-8 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:opacity-40">Next</button></div></div>}
      </div>
    </DashboardShell>
  );
}
